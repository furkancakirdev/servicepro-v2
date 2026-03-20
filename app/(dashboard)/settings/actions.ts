"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { calculateMonthlyBadges } from "@/lib/badges";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ON_HOLD_DAYS,
  MAX_ON_HOLD_DAYS,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2024).max(2100);
const roleSchema = z.nativeEnum(Role);

const badgeCalculationSchema = z.object({
  month: monthSchema,
  year: yearSchema,
});

const createPersonnelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  role: roleSchema,
});

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
});

const saveBoatSchema = z.object({
  boatId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(24),
  ownerName: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(true),
});

const saveCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  subScope: z.string().trim().min(2).max(160),
  multiplier: z.coerce.number().min(1).max(3),
  sortOrder: z.coerce.number().int().min(1).max(999),
  brandHints: z.string().trim().max(160).optional(),
  isActive: z.boolean().default(false),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  subScope: z.string().trim().min(2).max(160),
  multiplier: z.coerce.number().min(1).max(3),
  sortOrder: z.coerce.number().int().min(1).max(999),
  brandHints: z.string().trim().max(160).optional(),
});

const saveSystemSettingsSchema = z.object({
  onHoldDefaultDays: z.coerce.number().int().min(1).max(MAX_ON_HOLD_DAYS),
});

function optionalString(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : undefined;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function revalidateSettingsSurfaces() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  revalidatePath("/jobs/[id]", "page");
  revalidatePath("/scoreboard");
  revalidatePath("/settings");
}

export async function calculateMonthlyBadgesAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = badgeCalculationSchema.safeParse({
    month: formData.get("month"),
    year: formData.get("year"),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-badge-period");
  }

  try {
    await calculateMonthlyBadges(parsed.data.month, parsed.data.year);
    revalidateSettingsSurfaces();
    redirect(`/settings?badge=1&month=${parsed.data.month}&year=${parsed.data.year}`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "badge-calc-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function createPersonnelAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = createPersonnelSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-personnel");
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new Error("Bu email ile kayitli bir kullanici zaten var.");
    }

    await prisma.user.create({
      data: parsed.data,
    });

    revalidateSettingsSurfaces();
    redirect("/settings?toast=personnel-created");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "personnel-create-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function updatePersonnelRoleAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-role-update");
  }

  try {
    await prisma.user.update({
      where: {
        id: parsed.data.userId,
      },
      data: {
        role: parsed.data.role,
      },
    });

    revalidateSettingsSurfaces();
    redirect("/settings?toast=role-updated");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "role-update-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function saveBoatAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = saveBoatSchema.safeParse({
    boatId: optionalString(formData.get("boatId")),
    name: formData.get("name"),
    type: formData.get("type"),
    ownerName: optionalString(formData.get("ownerName")),
    isActive: parseCheckbox(formData.get("isActive")),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-boat");
  }

  try {
    if (parsed.data.boatId) {
      await prisma.boat.update({
        where: {
          id: parsed.data.boatId,
        },
        data: {
          name: parsed.data.name,
          type: parsed.data.type,
          ownerName: parsed.data.ownerName ?? null,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.boat.create({
        data: {
          name: parsed.data.name,
          type: parsed.data.type,
          ownerName: parsed.data.ownerName ?? null,
          isActive: true,
        },
      });
    }

    revalidateSettingsSurfaces();
    redirect("/settings?toast=boat-saved");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "boat-save-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function saveCategoryAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = saveCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    subScope: formData.get("subScope"),
    multiplier: formData.get("multiplier"),
    sortOrder: formData.get("sortOrder"),
    brandHints: optionalString(formData.get("brandHints")),
    isActive: parseCheckbox(formData.get("isActive")),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-category");
  }

  try {
    await prisma.serviceCategory.update({
      where: {
        id: parsed.data.categoryId,
      },
      data: {
        name: parsed.data.name,
        subScope: parsed.data.subScope,
        multiplier: parsed.data.multiplier,
        sortOrder: parsed.data.sortOrder,
        brandHints: parsed.data.brandHints ?? null,
        isActive: parsed.data.isActive,
      },
    });

    revalidateSettingsSurfaces();
    redirect("/settings?toast=category-saved");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "category-save-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function createCategoryAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    subScope: formData.get("subScope"),
    multiplier: formData.get("multiplier"),
    sortOrder: formData.get("sortOrder"),
    brandHints: optionalString(formData.get("brandHints")),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-new-category");
  }

  try {
    await prisma.serviceCategory.create({
      data: {
        ...parsed.data,
        brandHints: parsed.data.brandHints ?? null,
        isActive: true,
      },
    });

    revalidateSettingsSurfaces();
    redirect("/settings?toast=category-created");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "category-create-failed";
    redirect(`/settings?error=${message}`);
  }
}

export async function saveSystemSettingsAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);

  const parsed = saveSystemSettingsSchema.safeParse({
    onHoldDefaultDays: formData.get("onHoldDefaultDays") ?? DEFAULT_ON_HOLD_DAYS,
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-system-settings");
  }

  try {
    await prisma.systemSetting.upsert({
      where: {
        key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
      },
      update: {
        value: String(parsed.data.onHoldDefaultDays),
      },
      create: {
        key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
        value: String(parsed.data.onHoldDefaultDays),
      },
    });

    revalidateSettingsSurfaces();
    redirect("/settings?toast=system-saved");
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "system-settings-save-failed";
    redirect(`/settings?error=${message}`);
  }
}
