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
    label: "Genie Informatique",
    shortLabel: "GI",
    colors: {
      background: "#9ae76f",
      border: "#6bbd45",
      text: "#123816",
    },
  },
  AGRO: {
    label: "Agronomie",
    shortLabel: "Agro",
    colors: {
      background: "#2b5c18",
      border: "#1f4111",
      text: "#f3fce9",
    },
  },
  SJPA: {
    label: "Sciences Juridiques et Politiques",
    shortLabel: "SJPA",
    colors: {
      background: "#37b0fa",
      border: "#1f85d4",
      text: "#052c4c",
    },
  },
  SEG: {
    label: "Sciences Economiques et de Gestion",
    shortLabel: "SEG",
    colors: {
      background: "#1b548d",
      border: "#153f69",
      text: "#f3f7fb",
    },
  },
};

const DIRECT_GROUP_MAP: Record<string, DepartmentId> = {
  // Departement Agro
  "l1 agro": "AGRO",
  "l2 agro": "AGRO",
  "l1 agro bachelor": "AGRO",
  "l2 agro bachelor": "AGRO",
  "l3 agro bachelor": "AGRO",
  // Departement Genie Informatique
  "l1 gi": "GI",
  "l2 gi": "GI",
  "l3 gi": "GI",
  "m1 gi": "GI",
  "m2 gi": "GI",
  "l1 sil sirt": "GI",
  "l2 sil sirt": "GI",
  "l2 sil": "GI",
  "l2 sirt": "GI",
  "l3 sil sirt": "GI",
  "l3 sil": "GI",
  "l3 sirt": "GI",
  // Departement SEG
  "l1 seg": "SEG",
  "l2 seg": "SEG",
  "l3 seg": "SEG",
  "m1 seg": "SEG",
  "m2 seg": "SEG",
  "l1 economie": "SEG",
  "l2 economie": "SEG",
  "l3 economie": "SEG",
  "l1 comptabilite finance": "SEG",
  "l2 comptabilite finance": "SEG",
  "l3 comptabilite finance": "SEG",
  "l1 mop": "SEG",
  "l2 mop": "SEG",
  "l3 mop": "SEG",
  "m1 es": "SEG",
  "m1 fba": "SEG",
  "m1 grse": "SEG",
  "m1 mop": "SEG",
  "m2 es": "SEG",
  "m2 eedd": "SEG",
  "m2 fba": "SEG",
  "m2 mop": "SEG",
  // Departement SJPA
  "l1 sjpa": "SJPA",
  "l2 sjpa": "SJPA",
  "l3 sjpa": "SJPA",
  "m1 sjpa": "SJPA",
  "m2 sjpa": "SJPA",
  "l1 droit ethique": "SJPA",
  "l2 droit ethique": "SJPA",
  "l3 droit prive": "SJPA",
  "l3 droit public": "SJPA",
  "m1 droit des affaires": "SJPA",
  "m1 droit prive": "SJPA",
  "m1 droit public": "SJPA",
  "m1 dhah": "SJPA",
  "m1 ri dipl": "SJPA",
  "m2 droit des affaires": "SJPA",
  "m2 dhah": "SJPA",
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
