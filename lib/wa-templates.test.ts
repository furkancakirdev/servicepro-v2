import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateClientNotificationEN,
  generateClientNotificationTR,
  generateSahaTemplate,
  generateYatmarinTemplate,
} from "./wa-templates";

const FIXED_DATE = new Date(2026, 2, 20, 12, 0, 0);
const LONG_DESCRIPTION = `Bakım ${"x".repeat(10_000)} 🚤`;

describe("generateYatmarinTemplate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  it("renders the full Yatmarin plan with continuing jobs", () => {
    const entries = [
      {
        technicianName: "Ayşe",
        jobs: [
          {
            time: "09:00",
            boatName: "Mavi Yolculuk",
            location: "Netsel",
            description: "Jeneratör kontrolü",
          },
        ],
      },
      {
        technicianName: "Mehmet",
        jobs: [
          {
            time: "13:30",
            boatName: "Blue Pearl",
            location: "Yat Marin",
            description: "Klima bakımı",
          },
        ],
      },
    ];
    const continuingJobs = [
      {
        boatName: "Deep Blue",
        description: "Panel revizyonu",
        technicianName: "Ayşe",
      },
    ];

    const result = generateYatmarinTemplate(FIXED_DATE, entries, continuingJobs);

    expect(result).toBe(
      `🔧 YATMARİN EKİBİ — CUMA ${FIXED_DATE.toLocaleDateString("tr-TR")}\n\n` +
        "Ayşe:\n" +
        "• 09:00 → Mavi Yolculuk (Netsel) — Jeneratör kontrolü\n\n" +
        "Mehmet:\n" +
        "• 13:30 → Blue Pearl (Yat Marin) — Klima bakımı\n\n" +
        "DEVAM EDEN İŞLER:\n" +
        "• Deep Blue — Panel revizyonu (Ayşe)\n\n" +
        "Marlin Yachting Teknik Servis"
    );
  });

  it("omits the continuing jobs block when no continuing jobs are supplied", () => {
    const entries = [
      {
        technicianName: "Deniz",
        jobs: [
          {
            time: "10:15",
            boatName: "Göcek Star",
            location: "Netsel",
            description: "Akü testi",
          },
        ],
      },
    ];

    const result = generateYatmarinTemplate(FIXED_DATE, entries);

    expect(result.includes("DEVAM EDEN İŞLER")).toBe(false);
  });

  it("renders only the header and footer when entries is empty", () => {
    const entries: Array<{
      technicianName: string;
      jobs: Array<{ time: string; boatName: string; location: string; description: string }>;
    }> = [];

    const result = generateYatmarinTemplate(FIXED_DATE, entries, []);

    expect(result).toBe(
      `🔧 YATMARİN EKİBİ — CUMA ${FIXED_DATE.toLocaleDateString("tr-TR")}\n\nMarlin Yachting Teknik Servis`
    );
  });

  it("throws when date is not a valid Date instance", () => {
    const invalidDate = "2026-03-20" as unknown as Date;

    const execution = () => generateYatmarinTemplate(invalidDate, []);

    expect(execution).toThrow("date must be a valid Date.");
  });

  it("throws when entries is not an array", () => {
    const invalidEntries = null as unknown as [];

    const execution = () => generateYatmarinTemplate(FIXED_DATE, invalidEntries);

    expect(execution).toThrow("entries must be an array.");
  });
});

describe("generateSahaTemplate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  it("renders the saha template with destination and return details", () => {
    const entries = [
      {
        technicianName: "Özgür",
        destination: "Bodrum",
        departureTime: "07:30",
        travelMin: 90,
        returnTime: "18:00",
        jobs: [
          {
            time: "09:00",
            boatName: "Şimşek",
            location: "Bodrum",
            description: "Radar kalibrasyonu",
          },
        ],
      },
    ];

    const result = generateSahaTemplate(FIXED_DATE, entries);

    expect(result).toBe(
      `🚗 SAHA EKİBİ — CUMA ${FIXED_DATE.toLocaleDateString("tr-TR")}\n\n` +
        "Özgür → Bodrum (07:30 çıkış, ~90dk)\n" +
        "• Şimşek — Radar kalibrasyonu\n" +
        "Tahmini dönüş: 18:00\n\n" +
        "Marlin Yachting Teknik Servis"
    );
  });

  it("throws when entries is not an array", () => {
    const invalidEntries = "liste" as unknown as [];

    const execution = () => generateSahaTemplate(FIXED_DATE, invalidEntries);

    expect(execution).toThrow("entries must be an array.");
  });
});

describe("generateClientNotificationTR", () => {
  it("renders the Turkish notification with multilingual content intact", () => {
    const input = {
      captainName: "Kaptan İpek",
      boatName: "Göcek Pearl",
      day: "Cuma",
      date: "20.03.2026",
      time: "14:30",
      location: "Netsel",
      berth: "A-12",
      description: "Bakım — ğüşöçıİ 漢字 مرحبا 🚤",
      technicianName: "Çağrı",
    };

    const result = generateClientNotificationTR(input);

    expect(result).toContain("Bakım — ğüşöçıİ 漢字 مرحبا 🚤");
    expect(result).toContain("📍 Netsel — A-12");
  });

  it("preserves very long description values", () => {
    const input = {
      captainName: "Kaptan Deniz",
      boatName: "Uzun Yol",
      day: "Cumartesi",
      date: "21.03.2026",
      time: "09:00",
      location: "Yat Marin",
      berth: "B-9",
      description: LONG_DESCRIPTION,
      technicianName: "Selim",
    };

    const result = generateClientNotificationTR(input);

    expect(result).toContain(LONG_DESCRIPTION);
  });

  it("throws when a client notification field is not a string", () => {
    const invalidInput = {
      captainName: 42,
      boatName: "Test",
      day: "Pazar",
      date: "22.03.2026",
      time: "11:00",
      location: "Netsel",
      berth: "C-3",
      description: "Test",
      technicianName: "Ece",
    } as unknown as Parameters<typeof generateClientNotificationTR>[0];

    const execution = () => generateClientNotificationTR(invalidInput);

    expect(execution).toThrow("captainName must be a string.");
  });
});

describe("generateClientNotificationEN", () => {
  it("renders the English notification exactly", () => {
    const input = {
      captainName: "John",
      boatName: "Sea Breeze",
      day: "Friday",
      date: "20.03.2026",
      time: "16:00",
      location: "Netsel",
      berth: "D-4",
      description: "Generator service",
      technicianName: "Ali",
    };

    const result = generateClientNotificationEN(input);

    expect(result).toBe(`Dear Captain John,

This is a reminder for your upcoming service appointment.

📅 Friday, 20.03.2026
⏰ 16:00
📍 Netsel — D-4
🔧 Generator service
👨‍🔧 Technician: Ali

Please confirm with 👍
Marlin Yachting Technical Service`);
  });
});
