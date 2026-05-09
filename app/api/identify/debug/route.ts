import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DebugSpeciesRow = {
  id: string;
  common_name: string;
  scientific_name: string;
  category: string;
  is_active: boolean;
  created_at?: string | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toDebugSpeciesRow(row: {
  id?: string | null;
  common_name?: string | null;
  scientific_name?: string | null;
  category?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}): DebugSpeciesRow {
  return {
    id: row.id ?? "",
    common_name: row.common_name ?? "",
    scientific_name: row.scientific_name ?? "",
    category: row.category ?? "",
    is_active: Boolean(row.is_active),
    created_at: row.created_at ?? null,
  };
}

export async function GET(request: Request) {
  const supabase = createSupabaseRouteClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not available." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const normalizedSearch = search.length > 0 ? normalize(search) : "";

  const { data: activeData, error: activeError } = await supabase
    .from("species")
    .select("id, common_name, scientific_name, category, is_active")
    .eq("is_active", true)
    .order("common_name", { ascending: true });

  if (activeError || !activeData) {
    return NextResponse.json(
      {
        error: "Failed to load active species.",
        details: activeError?.message ?? null,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const activeRows = activeData.map((row) =>
    toDebugSpeciesRow({
      id: row.id,
      common_name: row.common_name,
      scientific_name: row.scientific_name,
      category: row.category,
      is_active: row.is_active,
    }),
  );

  const { data: latestData, error: latestError } = await supabase
    .from("species")
    .select("id, common_name, scientific_name, category, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const latestActiveByCreatedAt = latestError || !latestData
    ? []
    : latestData.map((row) => toDebugSpeciesRow(row as DebugSpeciesRow));

  const searchMatches = normalizedSearch
    ? activeRows.filter((row) => {
        const commonName = normalize(row.common_name);
        const scientificName = normalize(row.scientific_name);
        return commonName.includes(normalizedSearch) || scientificName.includes(normalizedSearch);
      })
    : [];

  const projectRef = (() => {
    try {
      const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      return new URL(raw).hostname.split(".")[0] ?? null;
    } catch {
      return null;
    }
  })();

  const supabaseUrlPartial = (() => {
    try {
      const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const parsed = new URL(raw);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return null;
    }
  })();

  return NextResponse.json(
    {
      projectRef,
      supabaseUrlPartial,
      activeSpeciesCount: activeRows.length,
      first10Species: activeRows.slice(0, 10),
      last10SpeciesByCreatedAtDesc: latestActiveByCreatedAt,
      search: {
        term: search || null,
        matchesCount: searchMatches.length,
        foundInActiveCandidates: searchMatches.length > 0,
        matches: searchMatches.slice(0, 50),
      },
      diagnostics: {
        latestByCreatedAtError: latestError?.message ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
