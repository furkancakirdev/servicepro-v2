import { z } from "zod";

export const boatContactLanguageOptions = ["TR", "EN"] as const;
export type BoatContactLanguage = (typeof boatContactLanguageOptions)[number];

const e164PhonePattern = /^\+[1-9]\d{7,14}$/;

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export const boatContactSchema = z
  .object({
    boatId: z.string().uuid(),
    name: z.string().trim().min(2),
    role: z.string().trim().min(2),
    phone: z.preprocess(
      normalizeOptionalString,
      z.string().regex(e164PhonePattern, "Telefon E.164 formatinda olmalidir.").optional()
    ),
    email: z.preprocess(
      normalizeOptionalString,
      z.string().email("Gecerli bir e-posta girin.").optional()
    ),
    language: z.enum(boatContactLanguageOptions).or(
      z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .pipe(z.enum(boatContactLanguageOptions))
    ),
    isPrimary: z.boolean().default(false),
    whatsappOptIn: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.isPrimary && !value.phone && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Birincil irtibatta en az bir iletisim kanali zorunludur.",
        path: ["isPrimary"],
      });
    }

    if (value.whatsappOptIn && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WhatsApp acik irtibat icin telefon zorunludur.",
        path: ["phone"],
      });
    }
  });

export function normalizeBoatContact(input: z.input<typeof boatContactSchema>) {
  return boatContactSchema.parse(input);
}

export function getPrimaryBoatContactLabel(contact: {
  name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  language: string;
}) {
  const separator = " | ";
  const channels = [contact.phone, contact.email].filter(Boolean).join(separator);
  return `${contact.name}${separator}${contact.role}${separator}${contact.language}${
    channels ? `${separator}${channels}` : ""
  }`;
}
