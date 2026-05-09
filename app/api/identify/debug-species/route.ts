import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalScientificName(value: string): string {
  const cleaned = normalize(value).replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
  const [genus = "", species = ""] = cleaned.split(" ");

  if (!genus || !species) {
    return cleaned;
  }

  return `${genus} ${species}`;
}

export async function GET() {
  const supabase = createSupabaseRouteClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not available." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("species")
    .select("id, common_name, scientific_name, category, is_active")
    .eq("is_active", true)
    .order("common_name", { ascending: true });

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to load active species.", details: error?.message ?? null },
      { status: 500 },
    );
  }

  const activeCount = data.length;
  const hasRhincodonTypus = data.some(
    (item) => canonicalScientificName(item.scientific_name ?? "") === "rhincodon typus",
  );
  const hasTiburonBallena = data.some(
    (item) => normalize(item.common_name ?? "") === "tiburón ballena" || normalize(item.common_name ?? "") === "tiburon ballena",
  );

  const rhincodonRows = data
    .filter((item) => {
      const scientific = canonicalScientificName(item.scientific_name ?? "");
      const common = normalize(item.common_name ?? "");
      return scientific.includes("rhincodon") || common.includes("tiburon ballena") || common.includes("tiburón ballena");
    })
    .map((item) => ({
      id: item.id,
      common_name: item.common_name,
      scientific_name: item.scientific_name,
      category: item.category,
      is_active: item.is_active,
    }));

  const projectRef = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      return new URL(url).hostname.split(".")[0] ?? null;
    } catch {
      return null;
    }
  })();

  return NextResponse.json({
    projectRef,
    activeSpeciesCount: activeCount,
    hasRhincodonTypus,
    hasTiburonBallena,
    rhincodonRows,
    sampleFirst10: data.slice(0, 10).map((item) => ({
      common_name: item.common_name,
      scientific_name: item.scientific_name,
    })),
  });
}
