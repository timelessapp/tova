import Link from "next/link";
import { notFound } from "next/navigation";
import SpeciesSightingPhoto from "@/components/SpeciesSightingPhoto";
import SpeciesSightingLocation from "@/components/SpeciesSightingLocation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { mockSpecies } from "@/lib/mockSpecies";
import type { Species } from "@/lib/types";

type SpeciesPageProps = {
  params: Promise<{ id: string }>;
};

const speciesSelectFields =
  "id, common_name, scientific_name, category, description, habitat, curiosities, image_url, is_active, created_at, size_range, weight_range, lifespan, diet, activity, conservation_status";

type QuickFact = { label: string; value: string; icon: string };

type DisplaySpecies = {
  id: string;
  commonName: string;
  scientificName: string;
  imageEmoji: string;
  imageUrl: string | null;
  shortDescription: string;
  habitat: string;
  curiosities: string[];
  quickFacts: QuickFact[];
  locationName?: string;
};

function buildQuickFacts(species: Species): QuickFact[] {
  const raw: Array<{ label: string; value: string | null; icon: string }> = [
    { label: "Tamaño", value: species.size_range, icon: "📏" },
    { label: "Peso", value: species.weight_range, icon: "⚖️" },
    { label: "Longevidad", value: species.lifespan, icon: "⏳" },
    { label: "Alimentación", value: species.diet, icon: "🌿" },
    { label: "Actividad", value: species.activity, icon: "🌙" },
    { label: "Estado", value: species.conservation_status, icon: "🛡️" },
  ];

  return raw
    .filter((item): item is QuickFact => typeof item.value === "string" && item.value.trim().length > 0)
    .map((item) => ({ ...item, value: item.value.trim() }));
}

function mapDbSpeciesToDisplay(species: Species): DisplaySpecies {
  return {
    id: species.id,
    commonName: species.common_name,
    scientificName: species.scientific_name ?? "Sin nombre cientifico",
    imageEmoji: "🐾",
    imageUrl: species.image_url,
    shortDescription: species.description ?? "Descripcion pendiente.",
    habitat: species.habitat ?? "Habitat por completar.",
    curiosities:
      species.curiosities && species.curiosities.length > 0
        ? species.curiosities
        : ["Aun no hay curiosidades registradas para esta especie."],
    quickFacts: buildQuickFacts(species),
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
    scientificName: mockItem.scientificName,
    imageEmoji: mockItem.imageEmoji,
    imageUrl: null,
    shortDescription: mockItem.shortDescription,
    habitat: mockItem.habitat,
    curiosities: mockItem.curiosities,
    quickFacts: [],
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
          Volver
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
            <h1 className="text-2xl font-semibold text-[#223127]">
              {species.commonName}
            </h1>
            <p className="text-sm italic text-[#5f7267]">{species.scientificName}</p>
          </div>

          <p className="mt-5 text-sm leading-6 text-[#42564b]">{species.shortDescription}</p>

          {species.quickFacts.length > 0 ? (
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#597061]">
                Datos rápidos
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {species.quickFacts.map((fact) => (
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

          <div className="mt-5 rounded-2xl border border-[#d8e1d0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#597061]">
              Habitat
            </p>
            <p className="mt-1 text-sm text-[#34473d]">{species.habitat}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#d8e1d0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#597061]">
              Curiosidades
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[#34473d]">
              {species.curiosities.slice(0, 3).map((curiosity) => (
                <li key={curiosity} className="rounded-lg bg-[#f4f7f0] px-3 py-2">
                  {curiosity}
                </li>
              ))}
            </ul>
          </div>

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
