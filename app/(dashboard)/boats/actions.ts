"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { boatContactSchema } from "@/lib/boat-contacts";
import { prisma } from "@/lib/prisma";

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
