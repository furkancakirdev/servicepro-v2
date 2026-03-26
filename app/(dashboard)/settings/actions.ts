"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { calculateMonthlyBadges } from "@/lib/badges";
import { parseSettingsTab, type SettingsTabValue } from "@/components/settings/shared";
import { prisma } from "@/lib/prisma";
import {
  buildRoleAuditLogPayload,
  buildSystemSettingAuditLogPayload,
  generateTemporaryPassword,
} from "@/lib/settings-audit";
import {
  DEFAULT_ON_HOLD_DAYS,
  MAX_ON_HOLD_DAYS,
  SYSTEM_SETTING_KEYS,
} from "@/lib/system-settings";

const SETTINGS_PERSONNEL_FLASH_COOKIE = "settings-personnel-activation";

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

function parseSettingsYear(value: FormDataEntryValue | null) {
  const parsed = yearSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function getSettingsRedirectContext(
  formData: FormData,
  fallbackTab: SettingsTabValue
) {
  return {
    tab: parseSettingsTab(optionalString(formData.get("tab")), fallbackTab),
    year: parseSettingsYear(formData.get("year")),
  };
}

function buildSettingsUrl(
  context: { tab: SettingsTabValue; year?: number },
  params: Record<string, string | number | undefined> = {}
) {
  const searchParams = new URLSearchParams();
  searchParams.set("tab", context.tab);

  if (context.year) {
    searchParams.set("year", String(context.year));
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return `/settings?${searchParams.toString()}`;
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

export async function calculateMonthlyBadgesAction(
  monthOrFormData: number | FormData,
  yearInput?: number
) {
  await requireRoles([Role.ADMIN]);

  const rawInput =
    monthOrFormData instanceof FormData
      ? {
          month: monthOrFormData.get("month"),
          year: monthOrFormData.get("year"),
        }
      : {
          month: monthOrFormData,
          year: yearInput,
        };

  const parsed = badgeCalculationSchema.safeParse(rawInput);

  if (!parsed.success) {
    if (monthOrFormData instanceof FormData) {
      redirect("/settings?error=invalid-badge-period");
    }

    throw new Error("Geçersiz ay veya yıl seçimi.");
  }

  try {
    const result = await calculateMonthlyBadges(parsed.data.month, parsed.data.year);
    revalidateSettingsSurfaces();

    if (monthOrFormData instanceof FormData) {
      redirect(`/settings?badge=1&month=${parsed.data.month}&year=${parsed.data.year}`);
    }

    return result;
  } catch (error) {
    if (monthOrFormData instanceof FormData) {
      const message =
        error instanceof Error ? encodeURIComponent(error.message) : "badge-calc-failed";
      redirect(`/settings?error=${message}`);
    }

    throw error;
  }
}

export async function createPersonnelAction(formData: FormData) {
  const actor = await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "team");
  const cookieStore = await cookies();

  const parsed = createPersonnelSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-personnel" }));
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
      throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          ...parsed.data,
          password: hashedPassword,
          mustChangePassword: true,
          tempPasswordIssuedAt: new Date(),
        },
      });

      await tx.evaluationChangeLog.create({
        data: {
          entityType: "USER_CREATE",
          entityId: createdUser.id,
          changedById: actor.id,
          reason: `Kullanici olusturuldu: ${createdUser.name} <${createdUser.email}>`,
          oldValues: {},
          newValues: {
            email: createdUser.email,
            role: createdUser.role,
            mustChangePassword: true,
          },
        },
      });
    });

    cookieStore.set(
      SETTINGS_PERSONNEL_FLASH_COOKIE,
      JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        temporaryPassword,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/settings",
        maxAge: 60 * 10,
      }
    );

    revalidateSettingsSurfaces();
    redirect(buildSettingsUrl(redirectContext, { toast: "personnel-created" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "personnel-create-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}

export async function updatePersonnelRoleAction(formData: FormData) {
  const actor = await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "team");

  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-role-update" }));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: {
          id: parsed.data.userId,
        },
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
        },
      });

      if (!currentUser) {
        throw new Error("Rol guncellenecek personel bulunamadi.");
      }

      if (currentUser.role !== parsed.data.role) {
        await tx.evaluationChangeLog.create({
          data: buildRoleAuditLogPayload({
            userId: currentUser.id,
            changedById: actor.id,
            previousRole: currentUser.role,
            nextRole: parsed.data.role,
            userEmail: currentUser.email,
            userName: currentUser.name,
          }),
        });
      }

      await tx.user.update({
        where: {
          id: parsed.data.userId,
        },
        data: {
          role: parsed.data.role,
        },
      });
    });

    revalidateSettingsSurfaces();
    redirect(buildSettingsUrl(redirectContext, { toast: "role-updated" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "role-update-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}

export async function saveBoatAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "boats");

  const parsed = saveBoatSchema.safeParse({
    boatId: optionalString(formData.get("boatId")),
    name: formData.get("name"),
    type: formData.get("type"),
    ownerName: optionalString(formData.get("ownerName")),
    isActive: parseCheckbox(formData.get("isActive")),
  });

  if (!parsed.success) {
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-boat" }));
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
    redirect(buildSettingsUrl(redirectContext, { toast: "boat-saved" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "boat-save-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}

export async function saveCategoryAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "categories");

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
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-category" }));
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
    redirect(buildSettingsUrl(redirectContext, { toast: "category-saved" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "category-save-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}

export async function createCategoryAction(formData: FormData) {
  await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "categories");

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    subScope: formData.get("subScope"),
    multiplier: formData.get("multiplier"),
    sortOrder: formData.get("sortOrder"),
    brandHints: optionalString(formData.get("brandHints")),
  });

  if (!parsed.success) {
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-new-category" }));
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
    redirect(buildSettingsUrl(redirectContext, { toast: "category-created" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "category-create-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}

export async function saveSystemSettingsAction(formData: FormData) {
  const actor = await requireRoles([Role.ADMIN]);
  const redirectContext = getSettingsRedirectContext(formData, "system");

  const parsed = saveSystemSettingsSchema.safeParse({
    onHoldDefaultDays: formData.get("onHoldDefaultDays") ?? DEFAULT_ON_HOLD_DAYS,
  });

  if (!parsed.success) {
    redirect(buildSettingsUrl(redirectContext, { error: "invalid-system-settings" }));
  }

  try {
    const nextValue = String(parsed.data.onHoldDefaultDays);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.systemSetting.findUnique({
        where: {
          key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
        },
      });

      await tx.systemSetting.upsert({
        where: {
          key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
        },
        update: {
          value: nextValue,
        },
        create: {
          key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
          value: nextValue,
        },
      });

      if (existing?.value !== nextValue) {
        await tx.evaluationChangeLog.create({
          data: buildSystemSettingAuditLogPayload({
            key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
            changedById: actor.id,
            previousValue: existing?.value ?? null,
            nextValue,
          }),
        });
      }
    });

    revalidateSettingsSurfaces();
    redirect(buildSettingsUrl(redirectContext, { toast: "system-saved" }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "system-settings-save-failed";
    redirect(buildSettingsUrl(redirectContext, { error: message }));
  }
}
