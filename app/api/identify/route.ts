import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseClient";
import type { Database, Json } from "@/lib/types";

export const runtime = "nodejs";

const AI_IDENTIFICATION_BUCKET = "ai-identification-images";

interface SpeciesCandidate {
  common_name: string;
  scientific_name: string;
  category: string;
}

interface IdentifySuggestion {
  common_name: string;
  scientific_name: string;
  confidence: number;
}

interface IdentifyResponse {
  status: "identified" | "uncertain";
  suggestion: IdentifySuggestion | null;
}

interface IdentifyLogInput {
  accessToken?: string;
  userId?: string | null;
  imageUrl?: string | null;
  status: "identified" | "uncertain" | "error";
  bestSuggestion?: IdentifySuggestion | null;
  internalSuggestions?: IdentifySuggestion[] | null;
  errorMessage?: string | null;
}

interface IdentifyBody {
  image?: string;
  speciesList?: SpeciesCandidate[];
  imageDataUrl?: string;
  speciesCandidates?: SpeciesCandidate[];
}

const SYSTEM_PROMPT =
  "Eres un experto en fauna de la península ibérica. Solo puedes responder con especies presentes en la lista proporcionada. No inventes especies. Si no estás seguro, devuelve un array vacío.";

const USER_PROMPT =
  "Analiza esta imagen y devuelve hasta 3 posibles especies de la lista con un valor de confianza entre 0 y 1, ordenadas por probabilidad. Si la imagen no es clara, no contiene un animal o no puedes reconocerlo con seguridad, devuelve un array vacío.";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_SPECIES_COUNT = 250;
const IDENTIFY_CONFIDENCE_THRESHOLD = 0.85;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function bytesFromDataUrl(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    return 0;
  }

  const payload = dataUrl.slice(commaIndex + 1);

  return Math.floor((payload.length * 3) / 4);
}

function asDataUrl(imageValue: string): string {
  if (imageValue.startsWith("data:image/")) {
    return imageValue;
  }

  return `data:image/jpeg;base64,${imageValue}`;
}

function getAccessTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

async function resolveAuthenticatedUserId(accessToken: string | null): Promise<{
  accessToken: string | undefined;
  userId: string | null;
}> {
  if (!accessToken) {
    return { accessToken: undefined, userId: null };
  }

  const supabase = createSupabaseRouteClient();

  if (!supabase) {
    return { accessToken: undefined, userId: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { accessToken: undefined, userId: null };
  }

  return {
    accessToken,
    userId: user.id,
  };
}

async function uploadIdentifyImage(options: {
  imageDataUrl: string;
  accessToken?: string;
  userId?: string | null;
}): Promise<string | null> {
  const parsedImage = parseDataUrl(options.imageDataUrl);

  if (!parsedImage) {
    return null;
  }

  const supabase = createSupabaseRouteClient(options.accessToken);

  if (!supabase) {
    return null;
  }

  const folder = options.userId ?? "anon";
  const extension = extensionFromMimeType(parsedImage.mimeType);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AI_IDENTIFICATION_BUCKET)
    .upload(path, parsedImage.buffer, {
      contentType: parsedImage.mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload AI identification image", uploadError);
    return null;
  }

  const { data } = supabase.storage.from(AI_IDENTIFICATION_BUCKET).getPublicUrl(path);

  return data.publicUrl || null;
}

async function writeIdentifyLog(input: IdentifyLogInput): Promise<void> {
  const supabase = createSupabaseRouteClient(input.accessToken);

  if (!supabase) {
    return;
  }

  const logRow: Database["public"]["Tables"]["ai_identification_logs"]["Insert"] = {
    user_id: input.userId ?? null,
    image_url: input.imageUrl ?? null,
    status: input.status,
    best_common_name: input.bestSuggestion?.common_name ?? null,
    best_scientific_name: input.bestSuggestion?.scientific_name ?? null,
    best_confidence: input.bestSuggestion?.confidence ?? null,
    internal_suggestions: (input.internalSuggestions ?? null) as Json,
    error_message: input.errorMessage ?? null,
  };

  const { error } = await supabase.from("ai_identification_logs").insert(logRow);

  if (error) {
    console.error("Failed to write AI identification log", error);
  }
}

function toValidSuggestions(raw: unknown): IdentifySuggestion[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const suggestions = (raw as { suggestions?: unknown }).suggestions;

  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const typed = entry as Record<string, unknown>;
      const commonName =
        typeof typed.common_name === "string" ? typed.common_name.trim() : "";
      const scientificName =
        typeof typed.scientific_name === "string" ? typed.scientific_name.trim() : "";
      const confidenceValue =
        typeof typed.confidence === "number" ? typed.confidence : Number(typed.confidence);

      if (!commonName || !scientificName || !Number.isFinite(confidenceValue)) {
        return null;
      }

      return {
        common_name: commonName,
        scientific_name: scientificName,
        confidence: Math.max(0, Math.min(1, confidenceValue)),
      } satisfies IdentifySuggestion;
    })
    .filter((value): value is IdentifySuggestion => value !== null)
    .slice(0, 3);
}

async function parseRequestBody(request: Request): Promise<{
  imageDataUrl: string | null;
  speciesList: SpeciesCandidate[];
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const imageFile = formData.get("image");
    const speciesRaw = formData.get("speciesList");
    let imageDataUrl: string | null = null;

    if (imageFile instanceof File) {
      const mime = imageFile.type || "image/jpeg";
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageDataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }

    let speciesList: SpeciesCandidate[] = [];

    if (typeof speciesRaw === "string") {
      speciesList = JSON.parse(speciesRaw) as SpeciesCandidate[];
    }

    return { imageDataUrl, speciesList };
  }

  const body = (await request.json()) as IdentifyBody;
  const imageInput = body.image ?? body.imageDataUrl ?? null;
  const speciesList = body.speciesList ?? body.speciesCandidates ?? [];

  return {
    imageDataUrl: typeof imageInput === "string" ? asDataUrl(imageInput) : null,
    speciesList,
  };
}

export async function POST(request: Request) {
  const resolvedAuth = await resolveAuthenticatedUserId(getAccessTokenFromRequest(request));
  let imageDataUrl: string | null = null;
  let speciesList: SpeciesCandidate[] = [];
  let imageUrl: string | null = null;

  try {
    const parsed = await parseRequestBody(request);
    imageDataUrl = parsed.imageDataUrl;
    speciesList = parsed.speciesList;
  } catch {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      errorMessage: "Body invalido.",
    });
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (imageDataUrl?.startsWith("data:image/")) {
      imageUrl = await uploadIdentifyImage({
        imageDataUrl,
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
      });
    }

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      errorMessage: "La clave de OpenAI no esta configurada en el servidor.",
    });

    return NextResponse.json(
      { error: "La clave de OpenAI no esta configurada en el servidor." },
      { status: 500 },
    );
  }

  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      errorMessage: "Debes enviar una imagen valida.",
    });
    return NextResponse.json({ error: "Debes enviar una imagen valida." }, { status: 400 });
  }

  if (bytesFromDataUrl(imageDataUrl) > MAX_IMAGE_BYTES) {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      errorMessage: "La imagen es demasiado grande. Reduce resolucion o compresion antes de enviarla.",
    });
    return NextResponse.json(
      {
        error:
          "La imagen es demasiado grande. Reduce resolucion o compresion antes de enviarla.",
      },
      { status: 413 },
    );
  }

  imageUrl = await uploadIdentifyImage({
    imageDataUrl,
    accessToken: resolvedAuth.accessToken,
    userId: resolvedAuth.userId,
  });

  if (!Array.isArray(speciesList) || speciesList.length === 0) {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      errorMessage: "Debes enviar al menos una especie candidata.",
    });
    return NextResponse.json(
      { error: "Debes enviar al menos una especie candidata." },
      { status: 400 },
    );
  }

  if (speciesList.length > MAX_SPECIES_COUNT) {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      errorMessage: "Demasiadas especies en speciesList. Envia una lista reducida para mejorar coste y latencia.",
    });
    return NextResponse.json(
      {
        error:
          "Demasiadas especies en speciesList. Envia una lista reducida para mejorar coste y latencia.",
      },
      { status: 400 },
    );
  }

      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "error",
        errorMessage: "Lista de especies candidatas vacia.",
      });
  const sanitizedCandidates = speciesList
    .map((candidate) => ({
      common_name: candidate.common_name?.trim() ?? "",
      scientific_name: candidate.scientific_name?.trim() ?? "",
      category: candidate.category?.trim() ?? "",
    }))
    .filter((candidate) => candidate.common_name.length > 0);

  if (sanitizedCandidates.length === 0) {
    return NextResponse.json(
      { error: "Lista de especies candidatas vacia." },
      { status: 400 },
    );
  }

  const allowedCommon = new Set(sanitizedCandidates.map((candidate) => normalize(candidate.common_name)));
  const allowedScientific = new Set(
    sanitizedCandidates
      .map((candidate) => normalize(candidate.scientific_name))
      .filter((value) => value.length > 0),
  );

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tova_identify_suggestions",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestions: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    common_name: { type: "string" },
                    scientific_name: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["common_name", "scientific_name", "confidence"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${USER_PROMPT}\n\nLista permitida de especies (JSON):\n${JSON.stringify(
                sanitizedCandidates,
              )}`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

    if (!rawText) {
      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "uncertain",
        internalSuggestions: [],
      });

      return NextResponse.json({
        status: "uncertain",
        suggestion: null,
      } satisfies IdentifyResponse);
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "error",
        errorMessage: "Respuesta invalida del modelo.",
      });
      return NextResponse.json({ error: "Respuesta invalida del modelo." }, { status: 502 });
    }

    const suggestions = toValidSuggestions(parsed).filter((suggestion) => {
      const commonAllowed = allowedCommon.has(normalize(suggestion.common_name));
      const scientificAllowed = allowedScientific.has(normalize(suggestion.scientific_name));

      return commonAllowed || scientificAllowed;
    });

    const bestSuggestion = [...suggestions].sort(
      (left, right) => right.confidence - left.confidence,
    )[0];

    if (!bestSuggestion || bestSuggestion.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) {
      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "uncertain",
        bestSuggestion,
        internalSuggestions: suggestions,
      });

      return NextResponse.json({
        status: "uncertain",
        suggestion: null,
      } satisfies IdentifyResponse);
    }

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "identified",
      bestSuggestion,
      internalSuggestions: suggestions,
    });

    return NextResponse.json({
      status: "identified",
      suggestion: bestSuggestion,
    } satisfies IdentifyResponse);
  } catch {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      errorMessage: "Error al consultar OpenAI para identificar la imagen.",
    });

    return NextResponse.json(
      { error: "Error al consultar OpenAI para identificar la imagen." },
      { status: 500 },
    );
  }
}