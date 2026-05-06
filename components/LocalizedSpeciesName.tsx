"use client";

import { useMemo } from "react";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { getLocalizedCommonName } from "@/lib/getLocalizedCommonName";

type LocalizedSpeciesNameProps = {
  commonName: string;
  commonNameCa?: string | null;
  className?: string;
};

export default function LocalizedSpeciesName({
  commonName,
  commonNameCa,
  className,
}: LocalizedSpeciesNameProps) {
  const { language } = useProfileLanguage();

  const localizedName = useMemo(
    () => getLocalizedCommonName({ common_name: commonName, common_name_ca: commonNameCa ?? null }, language),
    [commonName, commonNameCa, language],
  );

  return <h1 className={className}>{localizedName}</h1>;
}
