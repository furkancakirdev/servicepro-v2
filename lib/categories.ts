export type ServiceCategorySeed = {
  name: string;
  subScope: string;
  multiplier: number;
  brandHints: string | null;
};

export const difficultySteps = [
  { multiplier: 1.0, label: "Standart", tone: "emerald" },
  { multiplier: 1.5, label: "Orta", tone: "amber" },
  { multiplier: 2.0, label: "Zor", tone: "orange" },
  { multiplier: 2.5, label: "Zor+", tone: "red" },
  { multiplier: 3.0, label: "Cok Zor", tone: "rose" },
] as const;

export const serviceCategoriesSeed: ServiceCategorySeed[] = [
  { name: "Dizel motor rutin", subScope: "Periyodik bakim (yag/filtre/impeller)", multiplier: 1.0, brandHints: "Yanmar, VETUS" },
  { name: "Dizel motor", subScope: "Ariza teshis ve tekil onarim", multiplier: 2.0, brandHints: "Yanmar" },
  { name: "Dizel motor", subScope: "Komple revizyon / overhaul", multiplier: 3.0, brandHints: "Yanmar" },
  { name: "Motor montaji", subScope: "Motor montaji (hazir motor)", multiplier: 2.5, brandHints: "Yanmar" },
  { name: "Motor montaji", subScope: "Motor replasmani (komple cikar-tak)", multiplier: 3.0, brandHints: null },
  { name: "MTU motor", subScope: "Periyodik bakim protokolu", multiplier: 2.0, brandHints: "MTU" },
  { name: "MTU motor", subScope: "Ariza teshis ve onarim", multiplier: 2.5, brandHints: "MTU" },
  { name: "MTU motor", subScope: "Komple revizyon / overhaul", multiplier: 3.0, brandHints: "MTU" },
  { name: "Saildrive", subScope: "Periyodik bakim (yag/anot/conta)", multiplier: 1.5, brandHints: "Yanmar SD" },
  { name: "Saildrive", subScope: "Alt grup / disli onarimi", multiplier: 2.5, brandHints: "Yanmar SD" },
  { name: "Saildrive", subScope: "Buyuk bakim / komple sokum", multiplier: 3.0, brandHints: "Yanmar SD" },
  { name: "Pod / Z-drive", subScope: "Bakim ve ayar", multiplier: 2.0, brandHints: null },
  { name: "Pod / Z-drive", subScope: "Ariza / transom onarim", multiplier: 2.5, brandHints: null },
  { name: "Saft", subScope: "Cikarma, balans, montaj", multiplier: 2.0, brandHints: null },
  { name: "Saft", subScope: "Hizalama / komple degisim", multiplier: 2.5, brandHints: null },
  { name: "Jenerator", subScope: "Periyodik bakim", multiplier: 1.5, brandHints: "Kohler, Onan, WhisperPower" },
  { name: "Jenerator", subScope: "Ariza teshis ve onarim", multiplier: 2.0, brandHints: "Kohler, Fischer Panda" },
  { name: "Jenerator", subScope: "Komple revizyon", multiplier: 2.5, brandHints: "Kohler, Onan" },
  { name: "Guc elektronigi", subScope: "Tekil cihaz kurulum", multiplier: 1.5, brandHints: "Mastervolt" },
  { name: "Guc elektronigi", subScope: "Ariza teshis ve onarim", multiplier: 2.0, brandHints: "Mastervolt" },
  { name: "Guc elektronigi", subScope: "Sistem entegrasyonu", multiplier: 2.5, brandHints: "Mastervolt" },
  { name: "Genel elektrik", subScope: "Kontrol / tekil onarim", multiplier: 1.0, brandHints: null },
  { name: "Genel elektrik", subScope: "Kablolama / panel yenileme", multiplier: 2.5, brandHints: null },
  { name: "Pervane / saft sistemi", subScope: "Cikarma, muayene, anot", multiplier: 1.5, brandHints: "Tecnoseal" },
  { name: "Pervane / saft sistemi", subScope: "Onarim ve montaj", multiplier: 2.0, brandHints: null },
  { name: "Stabilizer / TRAC / Seakeeper", subScope: "Kalibrasyon ve test", multiplier: 1.5, brandHints: null },
  { name: "Stabilizer / TRAC / Seakeeper", subScope: "Ariza ve onarim", multiplier: 2.5, brandHints: null },
  { name: "Pasarella / Platform / Davit", subScope: "Bakim ve ayar", multiplier: 1.0, brandHints: "Opacmare" },
  { name: "Pasarella / Platform / Davit", subScope: "Ariza ve onarim", multiplier: 2.0, brandHints: "Opacmare" },
  { name: "Pasarella / Platform / Davit", subScope: "Powerpack montaji / kurulum", multiplier: 2.5, brandHints: "Opacmare" },
  { name: "Thruster", subScope: "Bakim ve kontrol", multiplier: 1.5, brandHints: "VETUS, Quick, Sidepower" },
  { name: "Thruster", subScope: "Ariza ve onarim", multiplier: 2.0, brandHints: "VETUS, Max Power" },
  { name: "Vinc / irgat", subScope: "Bakim ve yaglama", multiplier: 1.0, brandHints: "Lofrans, Lewmar" },
  { name: "Vinc / irgat", subScope: "Ariza ve onarim", multiplier: 1.5, brandHints: "Lofrans" },
  { name: "Yelken techizati", subScope: "Bakim ve ayar", multiplier: 1.0, brandHints: "Harken, Lewmar" },
  { name: "Yelken techizati", subScope: "Onarim / degisim", multiplier: 1.5, brandHints: "Harken" },
  { name: "Hidrolik direksiyon", subScope: "Bakim ve yag degisimi", multiplier: 1.0, brandHints: "VETUS" },
  { name: "Hidrolik direksiyon", subScope: "Ariza ve onarim", multiplier: 2.0, brandHints: "VETUS" },
  { name: "Su aritma (watermaker)", subScope: "Periyodik bakim", multiplier: 1.5, brandHints: "Idromar" },
  { name: "Su aritma (watermaker)", subScope: "Ariza ve onarim", multiplier: 2.0, brandHints: "Idromar" },
  { name: "Su aritma (watermaker)", subScope: "Kurulum", multiplier: 2.5, brandHints: "Idromar" },
  { name: "??itma / klima", subScope: "Bakim ve filtre", multiplier: 1.0, brandHints: "Webasto" },
  { name: "??itma / klima", subScope: "Ariza / kurulum", multiplier: 2.0, brandHints: "Webasto" },
  { name: "Paslanmaz celik", subScope: "Tekil imalat / onarim", multiplier: 1.5, brandHints: null },
  { name: "Paslanmaz celik", subScope: "Kapsamli imalat", multiplier: 2.0, brandHints: null },
  { name: "GRP / polyester", subScope: "Kucuk onarim", multiplier: 1.5, brandHints: null },
  { name: "GRP / polyester", subScope: "Buyuk onarim", multiplier: 2.5, brandHints: null },
  { name: "Navigasyon elektronigi", subScope: "Kurulum", multiplier: 1.5, brandHints: null },
  { name: "Navigasyon elektronigi", subScope: "Entegrasyon ve sorun giderme", multiplier: 2.0, brandHints: null },
  { name: "Kesif / Kontrol", subScope: "Durum tespiti ve raporlama", multiplier: 1.0, brandHints: null },
];

export const serviceCategoryPreview = serviceCategoriesSeed.slice(0, 4);

export function getDifficultyStep(multiplier: number) {
  return (
    difficultySteps.find((step) => step.multiplier === multiplier) ??
    difficultySteps[0]
  );
}
