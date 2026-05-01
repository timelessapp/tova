import type { SpeciesCategory } from "@/lib/types";

export type AchievementKey =
  | "first_discovery"
  | "five_species"
  | "ten_species"
  | `first_category_${SpeciesCategory}`;

type ReachedAchievementsInput = {
  distinctSpeciesCount: number;
  discoveredCategories: SpeciesCategory[];
};

export type AchievementVisual = {
  key: AchievementKey;
  label: string;
  description: string;
  icon: string;
};

const categoryLabelMap: Record<SpeciesCategory, string> = {
  mammal: "mamífero",
  bird: "ave",
  reptile: "reptil",
  amphibian: "anfibio",
  insect: "insecto",
  fish: "pez",
  other: "otro",
};

const knownCategories = new Set<SpeciesCategory>([
  "mammal",
  "bird",
  "reptile",
  "amphibian",
  "insect",
  "fish",
  "other",
]);

export function isAchievementKey(value: string): value is AchievementKey {
  if (value === "first_discovery" || value === "five_species" || value === "ten_species") {
    return true;
  }

  if (!value.startsWith("first_category_")) {
    return false;
  }

  const category = value.replace("first_category_", "") as SpeciesCategory;
  return knownCategories.has(category);
}

export function buildReachedAchievementKeys({
  distinctSpeciesCount,
  discoveredCategories,
}: ReachedAchievementsInput): AchievementKey[] {
  const reached = new Set<AchievementKey>();

  if (distinctSpeciesCount >= 1) {
    reached.add("first_discovery");
  }

  if (distinctSpeciesCount >= 5) {
    reached.add("five_species");
  }

  if (distinctSpeciesCount >= 10) {
    reached.add("ten_species");
  }

  discoveredCategories.forEach((category) => {
    reached.add(`first_category_${category}`);
  });

  return Array.from(reached);
}

export function achievementKeyToLabel(key: AchievementKey): string {
  if (key === "first_discovery") {
    return "Tu primer hallazgo";
  }

  if (key === "five_species") {
    return "Ya reuniste cinco especies";
  }

  if (key === "ten_species") {
    return "Diez especies, gran camino";
  }

  if (key.startsWith("first_category_")) {
    const category = key.replace("first_category_", "") as SpeciesCategory;
    const label = categoryLabelMap[category] ?? "animal";
    return `Primer paso en ${label}`;
  }

  return "Logro desbloqueado";
}

export function achievementKeyToDescription(key: AchievementKey): string {
  if (key === "first_discovery") {
    return "Descubriste tu primera especie en TOVA.";
  }

  if (key === "five_species") {
    return "Acumulaste cinco especies distintas en tu colección.";
  }

  if (key === "ten_species") {
    return "Ya registraste diez especies diferentes en tu album.";
  }

  if (key.startsWith("first_category_")) {
    const category = key.replace("first_category_", "") as SpeciesCategory;
    const label = categoryLabelMap[category] ?? "animal";
    return `Conseguiste tu primer avistamiento dentro de ${label}.`;
  }

  return "Has conseguido un nuevo logro naturalista.";
}

export function achievementKeyToIcon(key: AchievementKey): string {
  if (key === "first_discovery") {
    return "🌱";
  }

  if (key === "five_species") {
    return "🏅";
  }

  if (key === "ten_species") {
    return "🏆";
  }

  if (key.startsWith("first_category_")) {
    return "🧭";
  }

  return "🎖️";
}

export function getAchievementVisual(key: AchievementKey): AchievementVisual {
  return {
    key,
    label: achievementKeyToLabel(key),
    description: achievementKeyToDescription(key),
    icon: achievementKeyToIcon(key),
  };
}
