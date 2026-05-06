export type ProfileLanguage = "ca" | "es";

type LocalizableSpeciesTextSource = {
  description: string | null;
  description_ca: string | null;
  description_es: string | null;
  habitat: string | null;
  habitat_ca: string | null;
  habitat_es: string | null;
  curiosities: string[] | null;
  curiosities_ca: string[] | null;
  curiosities_es: string[] | null;
  size_range?: string | null;
  size_range_ca?: string | null;
  weight_range?: string | null;
  weight_range_ca?: string | null;
  lifespan?: string | null;
  lifespan_ca?: string | null;
  diet?: string | null;
  diet_ca?: string | null;
  activity?: string | null;
  activity_ca?: string | null;
  conservation_status?: string | null;
  conservation_status_ca?: string | null;
};

type LocalizedQuickFact = {
  label: string;
  value: string;
  icon: string;
};

type LocalizedSpeciesText = {
  description: string;
  habitat: string;
  curiosities: string[];
  quickFacts: LocalizedQuickFact[];
};

function firstNonEmptyString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function firstNonEmptyArray(...values: Array<string[] | null | undefined>): string[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      const cleaned = value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0);

      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }

  return [];
}

export function getLocalizedSpeciesText(
  species: LocalizableSpeciesTextSource,
  language: ProfileLanguage,
): LocalizedSpeciesText {
  const preferCatalan = language === "ca";

  const description = preferCatalan
    ? firstNonEmptyString(species.description_ca, species.description_es, species.description)
    : firstNonEmptyString(species.description_es, species.description_ca, species.description);

  const habitat = preferCatalan
    ? firstNonEmptyString(species.habitat_ca, species.habitat_es, species.habitat)
    : firstNonEmptyString(species.habitat_es, species.habitat_ca, species.habitat);

  const curiosities = preferCatalan
    ? firstNonEmptyArray(species.curiosities_ca, species.curiosities_es, species.curiosities)
    : firstNonEmptyArray(species.curiosities_es, species.curiosities_ca, species.curiosities);

  const quickFactsRaw: Array<{
    labelCa: string;
    labelEs: string;
    icon: string;
    value: string | null;
  }> = [
    {
      labelCa: "Mida",
      labelEs: "Tamano",
      icon: "📏",
      value: preferCatalan
        ? firstNonEmptyString(species.size_range_ca, species.size_range)
        : firstNonEmptyString(species.size_range, species.size_range_ca),
    },
    {
      labelCa: "Pes",
      labelEs: "Peso",
      icon: "⚖️",
      value: preferCatalan
        ? firstNonEmptyString(species.weight_range_ca, species.weight_range)
        : firstNonEmptyString(species.weight_range, species.weight_range_ca),
    },
    {
      labelCa: "Longevitat",
      labelEs: "Longevidad",
      icon: "⏳",
      value: preferCatalan
        ? firstNonEmptyString(species.lifespan_ca, species.lifespan)
        : firstNonEmptyString(species.lifespan, species.lifespan_ca),
    },
    {
      labelCa: "Alimentacio",
      labelEs: "Alimentacion",
      icon: "🌿",
      value: preferCatalan
        ? firstNonEmptyString(species.diet_ca, species.diet)
        : firstNonEmptyString(species.diet, species.diet_ca),
    },
    {
      labelCa: "Activitat",
      labelEs: "Actividad",
      icon: "🌙",
      value: preferCatalan
        ? firstNonEmptyString(species.activity_ca, species.activity)
        : firstNonEmptyString(species.activity, species.activity_ca),
    },
    {
      labelCa: "Estat",
      labelEs: "Estado",
      icon: "🛡️",
      value: preferCatalan
        ? firstNonEmptyString(species.conservation_status_ca, species.conservation_status)
        : firstNonEmptyString(species.conservation_status, species.conservation_status_ca),
    },
  ];

  const quickFacts = quickFactsRaw
    .filter((item): item is { labelCa: string; labelEs: string; icon: string; value: string } =>
      typeof item.value === "string" && item.value.trim().length > 0,
    )
    .map((item) => ({
      label: preferCatalan ? item.labelCa : item.labelEs,
      value: item.value.trim(),
      icon: item.icon,
    }));

  return {
    description: description ?? "Descripcio pendent.",
    habitat: habitat ?? "Habitat pendent d'afegir.",
    curiosities:
      curiosities.length > 0
        ? curiosities
        : ["Encara no hi ha curiositats registrades per a aquesta especie."],
    quickFacts,
  };
}
