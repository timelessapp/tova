import type { ProfileLanguage } from "@/lib/getLocalizedSpeciesText";

type LocalizableCommonName = {
  common_name: string;
  common_name_ca?: string | null;
};

export function getLocalizedCommonName(
  species: LocalizableCommonName,
  language: ProfileLanguage,
): string {
  const baseName = species.common_name.trim();
  const catalanName = species.common_name_ca?.trim();

  if (language === "ca" && catalanName) {
    return catalanName;
  }

  return baseName;
}
