import Link from "next/link";
import { notFound } from "next/navigation";
import LocalizedSpeciesName from "@/components/LocalizedSpeciesName";
import SpeciesLocalizedTextPanels from "@/components/SpeciesLocalizedTextPanels";
import SpeciesSightingPhoto from "@/components/SpeciesSightingPhoto";
import SpeciesSightingLocation from "@/components/SpeciesSightingLocation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { mockSpecies } from "@/lib/mockSpecies";
import type { Species } from "@/lib/types";

type SpeciesPageProps = {
  params: Promise<{ id: string }>;
};

const speciesSelectFields =
  "id, common_name, common_name_ca, scientific_name, category, description, description_ca, description_es, habitat, habitat_ca, habitat_es, curiosities, curiosities_ca, curiosities_es, image_url, is_active, created_at, size_range, size_range_ca, weight_range, weight_range_ca, lifespan, lifespan_ca, diet, diet_ca, activity, activity_ca, conservation_status, conservation_status_ca";

type DisplaySpecies = {
  id: string;
  commonName: string;
  commonNameCa: string | null;
  scientificName: string;
  imageEmoji: string;
  imageUrl: string | null;
  localizedTextSource: Pick<
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
  locationName?: string;
};

function mapDbSpeciesToDisplay(species: Species): DisplaySpecies {
  return {
    id: species.id,
    commonName: species.common_name,
    commonNameCa: species.common_name_ca,
    scientificName: species.scientific_name ?? "Sense nom científic",
    imageEmoji: "🐾",
    imageUrl: species.image_url,
    localizedTextSource: {
      description: species.description,
      description_ca: species.description_ca,
      description_es: species.description_es,
      habitat: species.habitat,
      habitat_ca: species.habitat_ca,
      habitat_es: species.habitat_es,
      curiosities: species.curiosities,
      curiosities_ca: species.curiosities_ca,
      curiosities_es: species.curiosities_es,
      size_range: species.size_range,
      size_range_ca: species.size_range_ca,
      weight_range: species.weight_range,
      weight_range_ca: species.weight_range_ca,
      lifespan: species.lifespan,
      lifespan_ca: species.lifespan_ca,
      diet: species.diet,
      diet_ca: species.diet_ca,
      activity: species.activity,
      activity_ca: species.activity_ca,
      conservation_status: species.conservation_status,
      conservation_status_ca: species.conservation_status_ca,
    },
  };
}

async function getSpeciesFromSources(id: string): Promise<DisplaySpecies | null> {
  const supabase = createSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("species")
      .select(speciesSelectFields)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return mapDbSpeciesToDisplay(data as Species);
    }
  }

  const mockItem = mockSpecies.find((item) => item.id === id);

  if (!mockItem) {
    return null;
  }

  return {
    id: mockItem.id,
    commonName: mockItem.commonName,
    commonNameCa: null,
    scientificName: mockItem.scientificName,
    imageEmoji: mockItem.imageEmoji,
    imageUrl: null,
    localizedTextSource: {
      description: mockItem.shortDescription,
      description_ca: null,
      description_es: mockItem.shortDescription,
      habitat: mockItem.habitat,
      habitat_ca: null,
      habitat_es: mockItem.habitat,
      curiosities: mockItem.curiosities,
      curiosities_ca: null,
      curiosities_es: mockItem.curiosities,
      size_range: null,
      size_range_ca: null,
      weight_range: null,
      weight_range_ca: null,
      lifespan: null,
      lifespan_ca: null,
      diet: null,
      diet_ca: null,
      activity: null,
      activity_ca: null,
      conservation_status: null,
      conservation_status_ca: null,
    },
    locationName: mockItem.locationName,
  };
}

export default async function SpeciesDetailPage({ params }: SpeciesPageProps) {
  const { id } = await params;
  const species = await getSpeciesFromSources(id);

  if (!species) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f6ef] px-5 py-6 text-[#243128] sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Link
          href="/collection"
          className="self-start rounded-full border border-[#ced8c5] bg-[#f5f7ef] px-4 py-2 text-sm font-medium text-[#385443]"
        >
          Tornar
        </Link>

        <section className="rounded-3xl border border-[#d8dfcf] bg-[#fbfbf8] p-6">
          <div className="overflow-hidden rounded-3xl border border-[#dce4d5] bg-white">
            <div className="aspect-[4/5] w-full bg-[#e8f0e1] sm:aspect-[3/4]">
              {species.imageUrl ? (
                <img
                  src={species.imageUrl}
                  alt={species.commonName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl">
                  {species.imageEmoji}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <LocalizedSpeciesName
              commonName={species.commonName}
              commonNameCa={species.commonNameCa}
              className="text-2xl font-semibold text-[#223127]"
            />
            <p className="text-sm italic text-[#5f7267]">{species.scientificName}</p>
          </div>

          <SpeciesLocalizedTextPanels speciesTextSource={species.localizedTextSource} />

          <SpeciesSightingLocation
            speciesId={species.id}
            fallbackLocationName={species.locationName}
          />

          <SpeciesSightingPhoto speciesId={species.id} />
        </section>
      </div>
    </main>
  );
}
