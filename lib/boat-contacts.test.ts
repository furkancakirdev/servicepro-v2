import { describe, expect, it } from "vitest";

import {
  boatContactLanguageOptions,
  boatContactSchema,
  normalizeBoatContact,
} from "@/lib/boat-contacts";

describe("boat contact schema", () => {
  it("accepts a valid primary contact with E.164 phone", () => {
    const result = boatContactSchema.parse({
      boatId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Marco Test",
      role: "Kaptan",
      phone: "+905550101122",
      email: "",
      language: "TR",
      isPrimary: true,
      whatsappOptIn: true,
    });

    expect(result.phone).toBe("+905550101122");
    expect(result.language).toBe("TR");
  });

  it("rejects invalid phone formats", () => {
    const execution = () =>
      boatContactSchema.parse({
        boatId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Marco Test",
        role: "Kaptan",
        phone: "0555 010 11 22",
        email: "",
        language: "TR",
        isPrimary: false,
        whatsappOptIn: false,
      });

    expect(execution).toThrow("Telefon E.164 formatinda olmalidir.");
  });

  it("requires at least one communication channel for primary contacts", () => {
    const execution = () =>
      boatContactSchema.parse({
        boatId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Marco Test",
        role: "Kaptan",
        phone: "",
        email: "",
        language: "TR",
        isPrimary: true,
        whatsappOptIn: false,
      });

    expect(execution).toThrow("Birincil irtibatta en az bir iletisim kanali zorunludur.");
  });

  it("requires phone when whatsapp communication is enabled", () => {
    const execution = () =>
      boatContactSchema.parse({
        boatId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Marco Test",
        role: "Kaptan",
        phone: "",
        email: "captain@example.com",
        language: "TR",
        isPrimary: false,
        whatsappOptIn: true,
      });

    expect(execution).toThrow("WhatsApp acik irtibat icin telefon zorunludur.");
  });
});

describe("normalizeBoatContact", () => {
  it("normalizes language and strips empty strings", () => {
    const result = normalizeBoatContact({
      boatId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Marco Test",
      role: "Kaptan",
      phone: "",
      email: "captain@example.com",
      language: "en",
      isPrimary: false,
      whatsappOptIn: false,
    });

    expect(result.phone).toBeUndefined();
    expect(result.email).toBe("captain@example.com");
    expect(result.language).toBe("EN");
  });

  it("exposes standardized language options", () => {
    expect(boatContactLanguageOptions).toEqual(["TR", "EN"]);
  });
});
