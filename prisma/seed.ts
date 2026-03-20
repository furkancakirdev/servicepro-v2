import {
  BadgeType,
  EvaluatorType,
  JobRole,
  JobStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { serviceCategoriesSeed } from "../lib/categories";
import {
  calculateJobScore,
  calculateMonthlyTotal,
  normalizeMonthlyEval,
  normalizeMonthlyScore,
} from "../lib/scoring";

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

type JobSeed = {
  boatName: string;
  categoryKey: string;
  description: string;
  status: JobStatus;
  createdById: string;
  location: string;
  contactName: string;
  contactPhone: string;
  assignments: Array<{
    email: string;
    role: JobRole;
  }>;
  holdReason?: "PARCA_BEKLENIYOR" | "MUSTERI_ONAYI" | "DIS_SERVIS" | "DIGER";
  holdUntil?: Date;
  isWarranty?: boolean;
  isKesif?: boolean;
  startedAt?: Date;
  completedAt?: Date;
  closedAt?: Date;
};

const seedUsers: SeedUser[] = [
  { email: "admin@marlin.com", name: "Marlin Admin", role: Role.ADMIN, password: "admin123" },
  { email: "ismail@marlin.com", name: "Ismail Usta", role: Role.WORKSHOP_CHIEF, password: "admin123" },
  { email: "koordinator1@marlin.com", name: "Ayse Koordinator", role: Role.COORDINATOR, password: "admin123" },
  { email: "koordinator2@marlin.com", name: "Mert Koordinator", role: Role.COORDINATOR, password: "admin123" },
  { email: "tech1@marlin.com", name: "Mehmet Aslan", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech2@marlin.com", name: "Furkan Cakir", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech3@marlin.com", name: "Selim Ozturk", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech4@marlin.com", name: "Alican Kaya", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech5@marlin.com", name: "Efe Tuna", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech6@marlin.com", name: "Ozan Bilgin", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech7@marlin.com", name: "Can Demir", role: Role.TECHNICIAN, password: "admin123" },
  { email: "tech8@marlin.com", name: "Emre Yildiz", role: Role.TECHNICIAN, password: "admin123" },
];

const boats = [
  { name: "M/V Bonita II", type: "M/V", ownerName: "Marco Bellini" },
  { name: "S/Y Brise", type: "S/Y", ownerName: "Emma Hughes" },
  { name: "CAT Darya", type: "CAT", ownerName: "Darya Marine" },
  { name: "RIB Falcon", type: "RIB", ownerName: "Murat Tunc" },
  { name: "Gulet Lodos", type: "GULET", ownerName: "Lodos Charter" },
  { name: "M/Y Aurora", type: "M/V", ownerName: "Olivia Stone" },
  { name: "S/Y Nimbus", type: "S/Y", ownerName: "Nimbus Holdings" },
  { name: "CAT Mistral", type: "CAT", ownerName: "Pierre Laurent" },
  { name: "M/Y Vega", type: "M/V", ownerName: "Vega Capital" },
  { name: "Tender Atlas", type: "OTHER", ownerName: "Atlas Yacht Support" },
] as const;

const month = 3;
const year = 2026;

function daysAgo(value: number) {
  const date = new Date();
  date.setDate(date.getDate() - value);
  return date;
}

async function seedSupabaseAuthUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasConfig =
    Boolean(url) &&
    Boolean(anonKey) &&
    !url?.includes("your_supabase_url") &&
    !anonKey?.includes("your_supabase_anon_key");

  if (!hasConfig || !url || !anonKey) {
    console.log("Supabase auth seed skipped: env values are placeholders.");
    return;
  }

  if (serviceRoleKey && !serviceRoleKey.includes("your_supabase_service_role_key")) {
    const adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: listedUsers, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      throw listError;
    }

    for (const user of seedUsers) {
      const existing = listedUsers.users.find((entry) => entry.email === user.email);

      if (existing) {
        const { error } = await adminClient.auth.admin.updateUserById(existing.id, {
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.name,
            role: user.role,
          },
        });

        if (error) {
          throw error;
        }

        continue;
      }

      const { error } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          role: user.role,
        },
      });

      if (error) {
        throw error;
      }
    }

    console.log("Supabase auth users synced with service role.");
    return;
  }

  const publicClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const user of seedUsers) {
    const { error } = await publicClient.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          full_name: user.name,
          role: user.role,
        },
      },
    });

    if (error?.status === 429 || /rate limit/i.test(error?.message ?? "")) {
      console.warn(
        "Supabase public sign-up rate limit reached. Continuing with database seed only."
      );
      return;
    }

    if (error && !/already registered/i.test(error.message)) {
      throw error;
    }
  }

  console.log("Supabase auth users seeded with public sign-up flow.");
}

async function main() {
  await seedSupabaseAuthUsers();

  await prisma.notification.deleteMany();
  await prisma.evaluationChangeLog.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.monthlyEvaluation.deleteMany();
  await prisma.jobScore.deleteMany();
  await prisma.jobEvaluation.deleteMany();
  await prisma.deliveryReport.deleteMany();
  await prisma.jobAssignment.deleteMany();
  await prisma.serviceJob.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.boat.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: seedUsers.map(({ email, name, role }) => ({
      email,
      name,
      role,
    })),
  });

  await prisma.boat.createMany({
    data: [...boats],
  });

  await prisma.serviceCategory.createMany({
    data: serviceCategoriesSeed.map((category, index) => ({
      ...category,
      sortOrder: index + 1,
    })),
  });

  const users = await prisma.user.findMany();
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  const createdBoats = await prisma.boat.findMany();
  const boatByName = new Map(createdBoats.map((boat) => [boat.name, boat]));

  const categories = await prisma.serviceCategory.findMany();
  const categoryByKey = new Map(
    categories.map((category) => [
      `${category.name}::${category.subScope}`,
      category,
    ])
  );

  const coord1 = userByEmail.get("koordinator1@marlin.com")!;
  const coord2 = userByEmail.get("koordinator2@marlin.com")!;
  const workshopChief = userByEmail.get("ismail@marlin.com")!;
  const technicians = seedUsers
    .filter((entry) => entry.role === Role.TECHNICIAN)
    .map((entry) => userByEmail.get(entry.email)!)
    .filter(Boolean);

  const jobSeed: JobSeed[] = [
    {
      boatName: "M/V Bonita II",
      categoryKey: "MTU motor::Ariza teshis ve onarim",
      description: "Port ana makinada alarm tekrari ve sea trial oncesi teshis.",
      status: JobStatus.DEVAM_EDIYOR,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Captain Luca",
      contactPhone: "+905321110101",
      assignments: [
        { email: "tech1@marlin.com", role: JobRole.SORUMLU },
        { email: "tech2@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(0),
    },
    {
      boatName: "S/Y Brise",
      categoryKey: "Saildrive::Alt grup / disli onarimi",
      description: "Saildrive alt grup ses sikayeti icin disli kontrolu.",
      status: JobStatus.PLANLANDI,
      createdById: coord1.id,
      location: "Netsel",
      contactName: "Emma Hughes",
      contactPhone: "+905321110102",
      assignments: [{ email: "tech2@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "CAT Darya",
      categoryKey: "Jenerator::Periyodik bakim",
      description: "Kohler jeneratorde 500 saatlik periyodik bakim.",
      status: JobStatus.BEKLEMEDE,
      createdById: coord2.id,
      location: "Gocek",
      contactName: "Darya Ops",
      contactPhone: "+905321110103",
      holdReason: "PARCA_BEKLENIYOR" as const,
      holdUntil: daysAgo(-2),
      assignments: [
        { email: "tech3@marlin.com", role: JobRole.SORUMLU },
        { email: "tech4@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(3),
    },
    {
      boatName: "RIB Falcon",
      categoryKey: "Thruster::Bakim ve kontrol",
      description: "Pruva thruster sezon oncesi kontrol ve anot degisimi.",
      status: JobStatus.KESIF,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Murat Tunc",
      contactPhone: "+905321110104",
      isKesif: true,
      assignments: [{ email: "tech5@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "Gulet Lodos",
      categoryKey: "Paslanmaz celik::Tekil imalat / onarim",
      description: "Kic paslanmaz korkuluk lokal kaynak ve polisaj.",
      status: JobStatus.TAMAMLANDI,
      createdById: coord2.id,
      location: "Orhaniye",
      contactName: "Lodos Charter",
      contactPhone: "+905321110105",
      assignments: [{ email: "tech6@marlin.com", role: JobRole.SORUMLU }],
      startedAt: daysAgo(2),
      completedAt: daysAgo(1),
    },
    {
      boatName: "M/Y Aurora",
      categoryKey: "Pasarella / Platform / Davit::Ariza ve onarim",
      description: "Opacmare pasarellada limit switch ve hidrolik ayar.",
      status: JobStatus.KAPANDI,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Chief Steward Elena",
      contactPhone: "+905321110106",
      assignments: [
        { email: "tech1@marlin.com", role: JobRole.SORUMLU },
        { email: "tech4@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(8),
      completedAt: daysAgo(7),
      closedAt: daysAgo(7),
    },
    {
      boatName: "S/Y Nimbus",
      categoryKey: "Guc elektronigi::Sistem entegrasyonu",
      description: "Mastervolt inverter ve servis bank entegrasyonu.",
      status: JobStatus.GARANTI,
      createdById: coord2.id,
      location: "Netsel",
      contactName: "Nimbus Holdings",
      contactPhone: "+905321110107",
      isWarranty: true,
      assignments: [{ email: "tech7@marlin.com", role: JobRole.SORUMLU }],
      startedAt: daysAgo(6),
      completedAt: daysAgo(5),
      closedAt: daysAgo(5),
    },
    {
      boatName: "CAT Mistral",
      categoryKey: "Su aritma (watermaker)::Ariza ve onarim",
      description: "Idromar high pressure line kacak tespiti.",
      status: JobStatus.IPTAL,
      createdById: coord1.id,
      location: "Bozburun",
      contactName: "Pierre Laurent",
      contactPhone: "+905321110108",
      assignments: [{ email: "tech8@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "M/Y Vega",
      categoryKey: "Dizel motor rutin::Periyodik bakim (yag/filtre/impeller)",
      description: "Yanmar 6LY servis bakim paketi.",
      status: JobStatus.KAPANDI,
      createdById: coord2.id,
      location: "Yatmarin",
      contactName: "Vega Capital",
      contactPhone: "+905321110109",
      assignments: [
        { email: "tech2@marlin.com", role: JobRole.SORUMLU },
        { email: "tech3@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(10),
      completedAt: daysAgo(9),
      closedAt: daysAgo(9),
    },
    {
      boatName: "Tender Atlas",
      categoryKey: "Genel elektrik::Kontrol / tekil onarim",
      description: "Tender panelde sigorta ve genel elektrik kontrolu.",
      status: JobStatus.PLANLANDI,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Atlas Support",
      contactPhone: "+905321110110",
      assignments: [{ email: "tech4@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "M/V Bonita II",
      categoryKey: "Kesif / Kontrol::Durum tespiti ve raporlama",
      description: "Islak egzoz hatti icin kesif ziyareti.",
      status: JobStatus.KESIF,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Captain Luca",
      contactPhone: "+905321110101",
      isKesif: true,
      assignments: [{ email: "tech5@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "S/Y Brise",
      categoryKey: "Yelken techizati::Bakim ve ayar",
      description: "Winch ve traveller genel trim bakimi.",
      status: JobStatus.DEVAM_EDIYOR,
      createdById: coord2.id,
      location: "Netsel",
      contactName: "Emma Hughes",
      contactPhone: "+905321110102",
      assignments: [
        { email: "tech6@marlin.com", role: JobRole.SORUMLU },
        { email: "tech7@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(1),
    },
    {
      boatName: "CAT Darya",
      categoryKey: "Stabilizer / TRAC / Seakeeper::Ariza ve onarim",
      description: "Seakeeper fault code inceleme ve bearing sesi kontrolu.",
      status: JobStatus.PLANLANDI,
      createdById: coord1.id,
      location: "Gocek",
      contactName: "Darya Ops",
      contactPhone: "+905321110103",
      assignments: [{ email: "tech8@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "RIB Falcon",
      categoryKey: "Hidrolik direksiyon::Ariza ve onarim",
      description: "Direksiyon pompasinda geri kacirma testi ve seal degisimi.",
      status: JobStatus.BEKLEMEDE,
      createdById: coord2.id,
      location: "Yatmarin",
      contactName: "Murat Tunc",
      contactPhone: "+905321110104",
      holdReason: "MUSTERI_ONAYI" as const,
      holdUntil: daysAgo(-1),
      assignments: [{ email: "tech1@marlin.com", role: JobRole.SORUMLU }],
      startedAt: daysAgo(2),
    },
    {
      boatName: "Gulet Lodos",
      categoryKey: "GRP / polyester::Kucuk onarim",
      description: "Platform kenarinda lokal gelcoat onarimi.",
      status: JobStatus.TAMAMLANDI,
      createdById: coord1.id,
      location: "Orhaniye",
      contactName: "Lodos Charter",
      contactPhone: "+905321110105",
      assignments: [{ email: "tech3@marlin.com", role: JobRole.SORUMLU }],
      startedAt: daysAgo(2),
      completedAt: daysAgo(0),
    },
    {
      boatName: "M/Y Aurora",
      categoryKey: "MTU motor::Periyodik bakim protokolu",
      description: "MTU sezon oncesi bakim paketi ve load test hazirligi.",
      status: JobStatus.PLANLANDI,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Chief Steward Elena",
      contactPhone: "+905321110106",
      assignments: [{ email: "tech2@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "S/Y Nimbus",
      categoryKey: "Navigasyon elektronigi::Entegrasyon ve sorun giderme",
      description: "AIS ve chartplotter veri kopmasi icin network incelemesi.",
      status: JobStatus.DEVAM_EDIYOR,
      createdById: coord2.id,
      location: "Netsel",
      contactName: "Nimbus Holdings",
      contactPhone: "+905321110107",
      assignments: [
        { email: "tech4@marlin.com", role: JobRole.SORUMLU },
        { email: "tech5@marlin.com", role: JobRole.DESTEK },
      ],
      startedAt: daysAgo(0),
    },
    {
      boatName: "CAT Mistral",
      categoryKey: "Isitma / klima::Ariza / kurulum",
      description: "Webasto chill unit start-up ve termostat kalibrasyonu.",
      status: JobStatus.KAPANDI,
      createdById: coord2.id,
      location: "Bozburun",
      contactName: "Pierre Laurent",
      contactPhone: "+905321110108",
      assignments: [{ email: "tech7@marlin.com", role: JobRole.SORUMLU }],
      startedAt: daysAgo(12),
      completedAt: daysAgo(11),
      closedAt: daysAgo(11),
    },
    {
      boatName: "M/Y Vega",
      categoryKey: "Pod / Z-drive::Bakim ve ayar",
      description: "Joystick kalibrasyon ve pod servo ayari.",
      status: JobStatus.PLANLANDI,
      createdById: coord1.id,
      location: "Yatmarin",
      contactName: "Vega Capital",
      contactPhone: "+905321110109",
      assignments: [{ email: "tech8@marlin.com", role: JobRole.SORUMLU }],
    },
    {
      boatName: "Tender Atlas",
      categoryKey: "Pasarella / Platform / Davit::Bakim ve ayar",
      description: "Tender davit sezon oncesi grease ve limit ayari.",
      status: JobStatus.KESIF,
      createdById: coord2.id,
      location: "Yatmarin",
      contactName: "Atlas Support",
      contactPhone: "+905321110110",
      isKesif: true,
      assignments: [{ email: "tech6@marlin.com", role: JobRole.SORUMLU }],
    },
  ];

  for (const seed of jobSeed) {
    const category = categoryByKey.get(seed.categoryKey);
    const boat = boatByName.get(seed.boatName);

    if (!category || !boat) {
      throw new Error(`Missing relation data for ${seed.boatName} / ${seed.categoryKey}`);
    }

    const job = await prisma.serviceJob.create({
      data: {
        boatId: boat.id,
        categoryId: category.id,
        description: seed.description,
        multiplier: category.multiplier,
        status: seed.status,
        holdReason: seed.holdReason,
        holdUntil: seed.holdUntil,
        isWarranty: seed.isWarranty ?? false,
        isKesif: seed.isKesif ?? false,
        createdById: seed.createdById,
        location: seed.location,
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        startedAt: seed.startedAt,
        completedAt: seed.completedAt,
        closedAt: seed.closedAt,
      },
    });

    await prisma.jobAssignment.createMany({
      data: seed.assignments.map((assignment) => ({
        jobId: job.id,
        userId: userByEmail.get(assignment.email)!.id,
        role: assignment.role,
      })),
    });

    if (seed.status === JobStatus.KAPANDI || seed.status === JobStatus.GARANTI) {
      const answers =
        seed.boatName === "M/Y Aurora"
          ? [5, 5, 4, 5, 5]
          : seed.boatName === "M/Y Vega"
            ? [4, 4, 5, 5, 4]
            : [4, 5, 4, 5, 4];
      const { baseScore } = calculateJobScore(answers, category.multiplier, 1);

      await prisma.deliveryReport.create({
        data: {
          jobId: job.id,
          unitInfoScore: answers[0],
          photosScore: answers[1],
          partsListScore: answers[2],
          subcontractorScore: answers[3],
          hasSubcontractor: false,
          clientNotifyScore: answers[4],
          notes: "Seed teslim raporu kaydi",
        },
      });

      await prisma.jobEvaluation.create({
        data: {
          jobId: job.id,
          evaluatorId: coord1.id,
          q1_unit: answers[0],
          q2_photos: answers[1],
          q3_parts: answers[2],
          q4_sub: answers[3],
          q5_notify: answers[4],
          baseScore,
        },
      });

      for (const assignment of seed.assignments) {
        const assignee = userByEmail.get(assignment.email)!;
        const roleMultiplier = assignment.role === JobRole.SORUMLU ? 1 : 0.4;
        const score = calculateJobScore(answers, category.multiplier, roleMultiplier);

        await prisma.jobScore.create({
          data: {
            jobId: job.id,
            userId: assignee.id,
            role: assignment.role,
            baseScore: score.baseScore,
            multiplier: category.multiplier,
            roleMultiplier,
            finalScore: score.finalScore,
            isKesif: seed.isKesif ?? false,
            month,
            year,
          },
        });
      }
    }
  }

  const technicianRawScores = new Map<string, number>();

  for (const technician of technicians) {
    const aggregate = await prisma.jobScore.aggregate({
      where: {
        userId: technician.id,
        month,
        year,
      },
      _sum: {
        finalScore: true,
      },
    });

    technicianRawScores.set(technician.id, aggregate._sum.finalScore ?? 0);
  }

  const theoreticalMax = Math.max(...technicianRawScores.values(), 1);

  for (const technician of technicians) {
    const index = technicians.findIndex((entry) => entry.id === technician.id);
    const workshopAnswers = [5 - (index % 2), 4 + (index % 2), 4];
    const coordinatorAnswers = [4, 5 - (index % 2), 4, 4 + (index % 2), 5];
    const workshopScore = normalizeMonthlyEval(workshopAnswers);
    const coordinatorScore = normalizeMonthlyEval(coordinatorAnswers);
    const normalizedJobScore = normalizeMonthlyScore(
      technicianRawScores.get(technician.id) ?? 0,
      theoreticalMax
    );
    const monthlyTotal = calculateMonthlyTotal(
      normalizedJobScore,
      workshopScore,
      coordinatorScore
    );

    await prisma.monthlyEvaluation.createMany({
      data: [
        {
          employeeId: technician.id,
          evaluatorId: workshopChief.id,
          evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
          month,
          year,
          wc_q1_technical: workshopAnswers[0],
          wc_q2_discipline: workshopAnswers[1],
          wc_q3_growth: workshopAnswers[2],
          wc_notes: "Aylik workshop seed notu",
          normalizedScore: workshopScore,
        },
        {
          employeeId: technician.id,
          evaluatorId: coord1.id,
          evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
          month,
          year,
          tc_q1_compliance: coordinatorAnswers[0],
          tc_q2_safety: coordinatorAnswers[1],
          tc_q3_represent: coordinatorAnswers[2],
          tc_q4_teamwork: coordinatorAnswers[3],
          tc_q5_growth: coordinatorAnswers[4],
          normalizedScore: coordinatorScore,
        },
      ],
    });

    if (monthlyTotal.total >= 85 && index < 3) {
      await prisma.badge.create({
        data: {
          userId: technician.id,
          type:
            index === 0
              ? BadgeType.SERVIS_YILDIZI
              : index === 1
                ? BadgeType.KALITE_USTASI
                : BadgeType.EKIP_OYUNCUSU,
          month,
          year,
          score: monthlyTotal.total,
        },
      });
    }
  }

  const badgeWinners = await prisma.badge.findMany({
    include: {
      user: true,
    },
  });

  await prisma.notification.createMany({
    data: badgeWinners.map((badge) => ({
      userId: badge.userId,
      type: "BADGE_AWARDED",
      title: "Aylik rozet kazandiniz",
      body: `${badge.user.name} icin ${badge.type} rozeti olusturuldu.`,
      metadata: {
        month,
        year,
        badgeType: badge.type,
      },
    })),
  });

  console.log("Seed completed.");
  console.table(
    seedUsers.map((user) => ({
      email: user.email,
      role: user.role,
      password: user.password,
    }))
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
