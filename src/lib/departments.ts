export type DepartmentId = "GI" | "AGRO" | "SJPA" | "SEG";

export type ColorMode = "objective" | "department";

export type ObjectiveColorKey = "cours" | "examen" | "other";

export type ColorConfig = {
  background: string;
  border: string;
  text: string;
};

export const DEPARTMENTS: Record<
  DepartmentId,
  { label: string; shortLabel: string; colors: ColorConfig }
> = {
  GI: {
    label: "Génie Informatique",
    shortLabel: "GI",
    colors: {
      background: "#2563eb",
      border: "#1d4ed8",
      text: "#f8fafc",
    },
  },
  AGRO: {
    label: "Agronomie",
    shortLabel: "Agro",
    colors: {
      background: "#22c55e",
      border: "#16a34a",
      text: "#022c22",
    },
  },
  SJPA: {
    label: "Sciences Juridiques et Politiques",
    shortLabel: "SJPA",
    colors: {
      background: "#7c3aed",
      border: "#5b21b6",
      text: "#f8fafc",
    },
  },
  SEG: {
    label: "Sciences Économiques et de Gestion",
    shortLabel: "SEG",
    colors: {
      background: "#f97316",
      border: "#d97706",
      text: "#111827",
    },
  },
};

const DIRECT_GROUP_MAP: Record<string, DepartmentId> = {
  "l1 agro": "AGRO",
  "l2 agro": "AGRO",
  "l1 agro bachelor": "AGRO",
  "l2 agro bachelor": "AGRO",
  "l1 gi": "GI",
  "l2 gi": "GI",
  "l3 gi": "GI",
  "m1 gi": "GI",
  "m2 gi": "GI",
  "l1 seg": "SEG",
  "l2 seg": "SEG",
  "l3 seg": "SEG",
  "m1 seg": "SEG",
  "m2 seg": "SEG",
  "l1 sjpa": "SJPA",
  "l2 sjpa": "SJPA",
  "l3 sjpa": "SJPA",
  "m1 sjpa": "SJPA",
  "m2 sjpa": "SJPA",
};

const KEYWORD_MATCHERS: Array<{ id: DepartmentId; pattern: RegExp }> = [
  {
    id: "GI",
    pattern:
      /gi|informatique|informatic|sil|telecommunication|reseau|prog|dev|data/,
  },
  {
    id: "AGRO",
    pattern:
      /agro bachelor|bachelor agro|agro|agronom|agric|sciences? agro/,
  },
  {
    id: "SJPA",
    pattern: /sjpa|jurid|droit|polit|public|affaires publiques/,
  },
  {
    id: "SEG",
    pattern: /seg|gestion|management|eco|econom|marketing|finance/,
  },
];

export const OBJECTIVE_COLORS: Record<ObjectiveColorKey, ColorConfig> = {
  cours: {
    background: "#2563eb",
    border: "#1d4ed8",
    text: "#f8fafc",
  },
  examen: {
    background: "#b91c1c",
    border: "#991b1b",
    text: "#f8fafc",
  },
  other: {
    background: "#6b7280",
    border: "#4b5563",
    text: "#f9fafb",
  },
};

export function normalizeGroupName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/gi, " ")
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function resolveDepartmentFromGroup(
  value: string | null | undefined,
): { id: DepartmentId; label: string } | null {
  if (!value || value.trim().length === 0) {
    return null;
  }
  const normalized = normalizeGroupName(value);

  const direct = DIRECT_GROUP_MAP[normalized];
  if (direct) {
    return { id: direct, label: DEPARTMENTS[direct].label };
  }

  for (const { id, pattern } of KEYWORD_MATCHERS) {
    if (pattern.test(normalized)) {
      return { id, label: DEPARTMENTS[id].label };
    }
  }

  return null;
}

export function resolveObjectiveColorKey(
  objective: string | null | undefined,
): ObjectiveColorKey {
  if (!objective) {
    return "other";
  }
  const normalized = objective.trim().toLowerCase();
  if (normalized.includes("examen") || normalized.includes("exam")) {
    return "examen";
  }
  if (normalized.includes("cours")) {
    return "cours";
  }
  return "other";
}
