import { Role } from "@prisma/client";

const allRoles: Role[] = [
  Role.ADMIN,
  Role.COORDINATOR,
  Role.TECHNICIAN,
  Role.WORKSHOP_CHIEF,
];

const operationsRoles: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF];
const jobManagers: Role[] = [Role.ADMIN, Role.COORDINATOR];

type NavigationDefinition = {
  href: string;
  label: string;
  description: string;
  roles: Role[];
};

type RouteAccessRule = {
  prefix: string;
  roles: Role[];
  exact?: boolean;
};

const navigationDefinitions: NavigationDefinition[] = [
  {
    href: "/my-jobs",
    label: "Bugun",
    description: "Bugunku atamalar ve saha akisi",
    roles: [Role.TECHNICIAN],
  },
  {
    href: "/my-jobs/weekly",
    label: "Haftam",
    description: "Pazartesi - Cumartesi ozeti",
    roles: [Role.TECHNICIAN],
  },
  {
    href: "/jobs",
    label: "Is Listesi",
    description: "Is emirleri ve durum takibi",
    roles: allRoles,
  },
  {
    href: "/dashboard",
    label: "Ana Ekran",
    description: "Genel operasyon gorunumu",
    roles: operationsRoles,
  },
  {
    href: "/dispatch",
    label: "Is Dagitimi",
    description: "Gunluk ve haftalik planlama",
    roles: operationsRoles,
  },
  {
    href: "/boats",
    label: "Tekneler",
    description: "VIP, irtibat ve servis gecmisi",
    roles: operationsRoles,
  },
  {
    href: "/scoreboard",
    label: "Puan Tablosu",
    description: "Aylik liderlik ve rozetler",
    roles: operationsRoles,
  },
  {
    href: "/settings",
    label: "Ayarlar",
    description: "Rol, kategori ve sistem alanlari",
    roles: [Role.ADMIN],
  },
];

const routeAccessRules: RouteAccessRule[] = [
  { prefix: "/settings", roles: [Role.ADMIN] },
  { prefix: "/dispatch", roles: operationsRoles },
  { prefix: "/boats", roles: operationsRoles },
  { prefix: "/jobs/new", roles: jobManagers },
  { prefix: "/my-jobs", roles: [Role.TECHNICIAN] },
  { prefix: "/dashboard", roles: operationsRoles },
  { prefix: "/scoreboard", roles: allRoles },
  { prefix: "/jobs", roles: allRoles },
  { prefix: "/", roles: operationsRoles, exact: true },
];

export type AppNavigationItem = Omit<NavigationDefinition, "roles">;

export function getRoleHomePath(role?: Role | null) {
  return role === Role.TECHNICIAN ? "/my-jobs" : "/";
}

export function getNavigationForRole(role?: Role | null): AppNavigationItem[] {
  if (!role) {
    return [];
  }

  const orderedHrefs =
    role === Role.TECHNICIAN
      ? ["/my-jobs", "/my-jobs/weekly", "/jobs"]
      : ["/dashboard", "/jobs", "/dispatch", "/boats", "/scoreboard", "/settings"];

  const visibleItems = navigationDefinitions
    .filter((item) => item.roles.includes(role))
    .map(({ roles: _roles, ...item }) => item);

  return orderedHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter((item): item is AppNavigationItem => Boolean(item));
}

export function canAccessPath(role: Role, pathname: string) {
  const matchedRule = routeAccessRules.find((rule) =>
    rule.exact ? pathname === rule.prefix : pathname.startsWith(rule.prefix)
  );

  if (!matchedRule) {
    return true;
  }

  return matchedRule.roles.includes(role);
}
