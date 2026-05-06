"use client";

import { useMemo } from "react";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { getLocalizedSpeciesText } from "@/lib/getLocalizedSpeciesText";
import type { Species } from "@/lib/types";

type SpeciesTextSource = Pick<
  Species,
  | "description"
  | "description_ca"
  | "description_es"
  | "habitat"
  | "habitat_ca"
  | "habitat_es"
  | "curiosities"
  | "curiosities_ca"
  | "curiosities_es"
  | "size_range"
  | "size_range_ca"
  | "weight_range"
  | "weight_range_ca"
  | "lifespan"
  | "lifespan_ca"
  | "diet"
  | "diet_ca"
  | "activity"
  | "activity_ca"
  | "conservation_status"
  | "conservation_status_ca"
>;

type SpeciesLocalizedTextPanelsProps = {
  speciesTextSource: SpeciesTextSource;
};

export default function SpeciesLocalizedTextPanels({
  speciesTextSource,
}: SpeciesLocalizedTextPanelsProps) {
  const { language } = useProfileLanguage();

  const localized = useMemo(
    () => getLocalizedSpeciesText(speciesTextSource, language),
    [speciesTextSource, language],
  );

  return (
    <>
      <p className="mt-5 text-sm leading-6 text-[#42564b]">{localized.description}</p>

      <div className="mt-5 rounded-2xl border border-[#d8e1d0] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#597061]">Habitat</p>
        <p className="mt-1 text-sm text-[#34473d]">{localized.habitat}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d8e1d0] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#597061]">Curiositats</p>
        <ul className="mt-2 space-y-2 text-sm text-[#34473d]">
          {localized.curiosities.slice(0, 3).map((curiosity) => (
            <li key={curiosity} className="rounded-lg bg-[#f4f7f0] px-3 py-2">
              {curiosity}
            </li>
          ))}
        </ul>
      </div>

      {localized.quickFacts.length > 0 ? (
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#597061]">
            Dades rapides
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {localized.quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col gap-1 rounded-2xl border border-[#dce5d4] bg-white px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="hidden shrink-0 text-base leading-none xs:inline">{fact.icon}</span>
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-[#597061]">
                    {fact.label}
                  </span>
                </div>
                <span className="text-sm text-[#2e3f37]">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
