import { describe, expect, it } from "vitest";

import {
  generateClientNotificationEN,
  generateClientNotificationTR,
  generateSahaTemplate,
  generateYatmarinTemplate,
} from "@/lib/wa-templates";

describe("wa templates", () => {
  it("generates Yatmarin template without mojibake characters", () => {
    const result = generateYatmarinTemplate(
      new Date("2026-03-27T08:00:00.000Z"),
      [
        {
          technicianName: "Ali",
          jobs: [
            {
              time: "09:00",
              boatName: "Blue Pearl",
              location: "Netsel",
              description: "Elektrik kontrolü",
            },
          ],
        },
      ],
      [
        {
          boatName: "Luna",
          description: "Klima takibi",
          technicianName: "Ege",
        },
      ]
    );

    expect(result).toContain("🔧 YATMARİN EKİBİ");
    expect(result).toContain("DEVAM EDEN İŞLER");
    expect(result).not.toMatch(/[ÃÄÅ]/);
  });

  it("generates saha template with readable travel copy", () => {
    const result = generateSahaTemplate(new Date("2026-03-27T08:00:00.000Z"), [
      {
        technicianName: "Mert",
        destination: "Göcek",
        departureTime: "07:30",
        travelMin: 90,
        returnTime: "17:15",
        jobs: [
          {
            time: "10:00",
            boatName: "Odyssey",
            location: "Göcek Marina",
            description: "Motor kontrolü",
          },
        ],
      },
    ]);

    expect(result).toContain("🚗 SAHA EKİBİ");
    expect(result).toContain("07:30 çıkış");
    expect(result).toContain("Tahmini dönüş: 17:15");
    expect(result).not.toMatch(/[ÃÄÅ]/);
  });

  it("generates TR and EN client notifications with emoji preserved", () => {
    const baseInput = {
      captainName: "Ahmet",
      boatName: "Serenity",
      day: "Cuma",
      date: "27.03.2026",
      time: "14:00",
      location: "Netsel Marina",
      berth: "A12",
      description: "Genel bakım",
      technicianName: "Ali",
    };

    expect(generateClientNotificationTR(baseInput)).toContain("Onaylamak için 👍 gönderiniz.");
    expect(generateClientNotificationEN(baseInput)).toContain("Please confirm with 👍");
  });
});
