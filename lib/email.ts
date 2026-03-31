const TURKISH_EMAIL_CHARACTER_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function normalizeEmailAddress(value: string) {
  return value
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (character) => TURKISH_EMAIL_CHARACTER_MAP[character] ?? character)
    .toLowerCase();
}
