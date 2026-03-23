type PlanEntry = {
  technicianName: string;
  jobs: Array<{
    time: string;
    boatName: string;
    location: string;
    description: string;
  }>;
};

type SahaPlanEntry = PlanEntry & {
  destination: string;
  departureTime: string;
  travelMin: number;
  returnTime: string;
};

type ClientNotificationInput = {
  captainName: string;
  boatName: string;
  day: string;
  date: string;
  time: string;
  location: string;
  berth: string;
  description: string;
  technicianName: string;
};

const dayNames = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

function assertValidDate(value: unknown, fieldName: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError(`${fieldName} must be a valid Date.`);
  }
}

function assertArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array.`);
  }
}

function assertClientNotificationInput(data: ClientNotificationInput) {
  const stringEntries = Object.entries(data) as Array<[keyof ClientNotificationInput, string]>;

  for (const [fieldName, fieldValue] of stringEntries) {
    if (typeof fieldValue !== "string") {
      throw new TypeError(`${fieldName} must be a string.`);
    }
  }
}

export function generateYatmarinTemplate(
  date: Date,
  entries: PlanEntry[],
  continuingJobs?: Array<{
    boatName: string;
    description: string;
    technicianName: string;
  }>
) {
  assertValidDate(date, "date");
  assertArray(entries, "entries");

  if (continuingJobs !== undefined) {
    assertArray(continuingJobs, "continuingJobs");
  }

  const dayName = dayNames[date.getDay()];
  const dateStr = date.toLocaleDateString("tr-TR");

  let template = `🔧 YATMARİN EKİBİ — ${dayName.toUpperCase()} ${dateStr}\n\n`;

  for (const entry of entries) {
    template += `${entry.technicianName}:\n`;
    for (const job of entry.jobs) {
      template += `• ${job.time} → ${job.boatName} (${job.location}) — ${job.description}\n`;
    }
    template += "\n";
  }

  if (continuingJobs && continuingJobs.length > 0) {
    template += "DEVAM EDEN İŞLER:\n";
    for (const job of continuingJobs) {
      template += `• ${job.boatName} — ${job.description} (${job.technicianName})\n`;
    }
    template += "\n";
  }

  template += "Marlin Yachting Teknik Servis";
  return template;
}

export function generateSahaTemplate(date: Date, entries: SahaPlanEntry[]) {
  assertValidDate(date, "date");
  assertArray(entries, "entries");

  const dayName = dayNames[date.getDay()];
  const dateStr = date.toLocaleDateString("tr-TR");

  let template = `🚗 SAHA EKİBİ — ${dayName.toUpperCase()} ${dateStr}\n\n`;

  for (const entry of entries) {
    template += `${entry.technicianName} → ${entry.destination} (${entry.departureTime} çıkış, ~${entry.travelMin}dk)\n`;
    for (const job of entry.jobs) {
      template += `• ${job.boatName} — ${job.description}\n`;
    }
    template += `Tahmini dönüş: ${entry.returnTime}\n\n`;
  }

  template += "Marlin Yachting Teknik Servis";
  return template;
}

export function generateClientNotificationTR(data: ClientNotificationInput) {
  assertClientNotificationInput(data);

  return `Merhaba ${data.captainName},

${data.boatName} tekneniz için randevunuzu hatırlatmak istedik.

📅 ${data.day}, ${data.date}
⏰ ${data.time}
📍 ${data.location} — ${data.berth}
🔧 ${data.description}
👨‍🔧 Teknisyen: ${data.technicianName}

Onaylamak için 👍 gönderiniz.
Marlin Yachting Teknik Servis`;
}

export function generateClientNotificationEN(data: ClientNotificationInput) {
  assertClientNotificationInput(data);

  return `Dear Captain ${data.captainName},

This is a reminder for your upcoming service appointment.

📅 ${data.day}, ${data.date}
⏰ ${data.time}
📍 ${data.location} — ${data.berth}
🔧 ${data.description}
👨‍🔧 Technician: ${data.technicianName}

Please confirm with 👍
Marlin Yachting Technical Service`;
}
