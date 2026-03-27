"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { boatContactSchema } from "@/lib/boat-contacts";
import type { CreateBoatFormState } from "@/lib/boat-form";
import {
  boatTypeOptions,
  type JobFormBoatOption,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

const createBoatSchema = z.object({
  name: z.string().trim().min(2, "Tekne adi zorunludur.").max(120, "Tekne adi cok uzun."),
  type: z.enum(boatTypeOptions),
  ownerName: z.string().trim().max(120, "Sahip alani cok uzun.").optional(),
  homePort: z.string().trim().max(120, "Ana marina alani cok uzun.").optional(),
  flag: z.string().trim().max(80, "Bayrak alani cok uzun.").optional(),
});

const updateBoatSchema = z.object({
  boatId: z.string().uuid(),
  ownerName: z.string().trim().optional(),
  homePort: z.string().trim().optional(),
  flag: z.string().trim().optional(),
  internalNotes: z.string().trim().optional(),
});

function optionalString(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : undefined;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function normalizeBoatIdentity(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function mapBoatOption(boat: {
  id: string;
  name: string;
  type: string;
  ownerName: string | null;
  homePort: string | null;
  flag: string | null;
  _count: {
    jobs: number;
  };
}): JobFormBoatOption {
  return {
    id: boat.id,
    name: boat.name,
    type: boat.type,
    ownerName: boat.ownerName,
    homePort: boat.homePort,
    flag: boat.flag,
    jobCount: boat._count.jobs,
    continuitySuggestions: [],
  };
}

export async function createBoatAction(
  _prevState: CreateBoatFormState,
  formData: FormData
): Promise<CreateBoatFormState> {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const parsed = createBoatSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    ownerName: optionalString(formData.get("ownerName")),
    homePort: optionalString(formData.get("homePort")),
    flag: optionalString(formData.get("flag")),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      error: "Lutfen tekne alanlarini kontrol edin.",
      fieldErrors: {
        name: flattened.name?.[0],
        type: flattened.type?.[0],
      },
      createdBoat: null,
    };
  }

  try {
    const normalizedName = normalizeBoatIdentity(parsed.data.name);
    const existingBoats = await prisma.boat.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        ownerName: true,
        homePort: true,
        flag: true,
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });
    const matchingBoat = existingBoats.find(
      (boat) => normalizeBoatIdentity(boat.name) === normalizedName
    );

    const boat = matchingBoat
      ? await prisma.boat.update({
          where: {
            id: matchingBoat.id,
          },
          data: {
            isActive: true,
            type: parsed.data.type,
            ownerName: parsed.data.ownerName ?? matchingBoat.ownerName,
            homePort: parsed.data.homePort ?? matchingBoat.homePort,
            flag: parsed.data.flag ?? matchingBoat.flag,
          },
          select: {
            id: true,
            name: true,
            type: true,
            ownerName: true,
            homePort: true,
            flag: true,
            _count: {
              select: {
                jobs: true,
              },
            },
          },
        })
      : await prisma.boat.create({
          data: {
            name: parsed.data.name,
            type: parsed.data.type,
            ownerName: parsed.data.ownerName ?? null,
            homePort: parsed.data.homePort ?? null,
            flag: parsed.data.flag ?? null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            ownerName: true,
            homePort: true,
            flag: true,
            _count: {
              select: {
                jobs: true,
              },
            },
          },
        });

    revalidatePath("/boats");
    revalidatePath(`/boats/${boat.id}`);
    revalidatePath("/jobs/new");

    return {
      error: null,
      fieldErrors: {},
      createdBoat: mapBoatOption(boat),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Tekne kaydedilirken beklenmeyen bir hata olustu.",
      fieldErrors: {},
      createdBoat: null,
    };
  }
}

export async function updateBoatProfileAction(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const parsed = updateBoatSchema.parse({
    boatId: formData.get("boatId"),
    ownerName: optionalString(formData.get("ownerName")),
    homePort: optionalString(formData.get("homePort")),
    flag: optionalString(formData.get("flag")),
    internalNotes: optionalString(formData.get("internalNotes")),
  });

  await prisma.boat.update({
    where: {
      id: parsed.boatId,
    },
    data: {
      ownerName: parsed.ownerName,
      homePort: parsed.homePort,
      flag: parsed.flag,
      internalNotes: parsed.internalNotes,
    },
  });

  revalidatePath("/boats");
  revalidatePath(`/boats/${parsed.boatId}`);
  redirect(`/boats/${parsed.boatId}?updated=1`);
}

export async function createBoatContactAction(formData: FormData) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const rawInput = {
    boatId: formData.get("boatId"),
    name: formData.get("name"),
    role: formData.get("role"),
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    language: formData.get("language"),
    isPrimary: parseCheckbox(formData.get("isPrimary")),
    whatsappOptIn: parseCheckbox(formData.get("whatsappOptIn")),
  };
  const parsedResult = boatContactSchema.safeParse(rawInput);

  if (!parsedResult.success) {
    const firstError = parsedResult.error.issues[0]?.message ?? "invalid-contact";
    const boatId = String(rawInput.boatId ?? "");
    redirect(`/boats/${boatId}?error=${encodeURIComponent(firstError)}`);
  }

  const parsed = parsedResult.data;

  await prisma.$transaction(async (tx) => {
    if (parsed.isPrimary) {
      await tx.boatContact.updateMany({
        where: {
          boatId: parsed.boatId,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    await tx.boatContact.create({
      data: {
        boatId: parsed.boatId,
        name: parsed.name,
        role: parsed.role,
        phone: parsed.phone,
        email: parsed.email,
        language: parsed.language,
        isPrimary: parsed.isPrimary,
        whatsappOptIn: parsed.whatsappOptIn,
      },
    });
  });

  revalidatePath("/boats");
  revalidatePath(`/boats/${parsed.boatId}`);
  redirect(`/boats/${parsed.boatId}?contact=1`);
}
