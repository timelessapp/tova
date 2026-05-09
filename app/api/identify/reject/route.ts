import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseClient";
import type { Json } from "@/lib/types";

interface RejectLogBody {
  logId: string;
  accessToken?: string;
  imageUrl?: string | null;
  bestCommonName?: string | null;
  bestScientificName?: string | null;
  bestConfidence?: number | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RejectLogBody;
    const { logId, accessToken, imageUrl, bestCommonName, bestScientificName, bestConfidence } = body;

    if (!logId) {
      return NextResponse.json(
        { error: "logId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseRouteClient(accessToken);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client not available" },
        { status: 500 }
      );
    }

    const updatePayload: Record<string, Json | undefined> = {
      user_rejected: true,
    };
    if (imageUrl) updatePayload.image_url = imageUrl;
    if (bestCommonName) updatePayload.best_common_name = bestCommonName;
    if (bestScientificName) updatePayload.best_scientific_name = bestScientificName;
    if (bestConfidence != null) updatePayload.best_confidence = bestConfidence;

    const { error } = await supabase
      .from("ai_identification_logs")
      .update(updatePayload as any)
      .eq("id", logId);

    if (error) {
      console.error("Failed to update identification log as rejected", error);
      return NextResponse.json(
        { error: "Failed to mark as rejected" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in reject endpoint:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
