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

interface MissingCandidate {
  common_name: string;
  scientific_name: string | null;
  reason: string;
}

interface IdentifyResponse {
  status: "identified" | "uncertain" | "missing_species";
  suggestion: IdentifySuggestion | null;
  missingCandidate: MissingCandidate | null;
}

interface IdentifyLogInput {
  accessToken?: string;
  userId?: string | null;
  imageUrl?: string | null;
  status: "identified" | "uncertain" | "missing_species" | "error";
  bestSuggestion?: IdentifySuggestion | null;
  missingCandidate?: MissingCandidate | null;
  internalSuggestions?: IdentifySuggestion[] | null;
  speciesCount?: number | null;
  candidateSpeciesSnapshot?: SpeciesCandidate[] | null;
  uncertainReason?: string | null;
  modelRawResponse?: Json | null;
  errorMessage?: string | null;
}

interface IdentifyBody {
  image?: string;
  speciesList?: SpeciesCandidate[];
  imageDataUrl?: string;
  speciesCandidates?: SpeciesCandidate[];
}

const SYSTEM_PROMPT = `
Eres un asistente experto en identificación de fauna para TOVA, una app de colección de seres vivos.

Solo puedes responder usando especies presentes en la lista proporcionada.
No inventes especies ni nombres científicos.

Tu objetivo NO es identificar siempre la subespecie exacta o una clasificación científica perfecta.
Tu objetivo es escoger el cromo/especie MÁS ADECUADO del catálogo para el animal principal visible en la imagen.

Si el catálogo ya contiene una especie representativa cercana, puedes utilizarla aunque existan variedades o especies similares.

Ejemplos:

* si ves claramente un caracol terrestre común y existe "Caracol común (Cornu aspersum)", puedes elegirlo.
* si ves claramente una babosa y existe "Babosa común (Arion vulgaris)", puedes elegirla.
* si ves claramente una hormiga y existe "Hormiga común", puedes elegirla.

Ignora:

* manos
* personas
* recipientes
* botones
* ropa
* fondos
* objetos secundarios

y céntrate únicamente en el animal principal de la imagen.

Solo devuelve vacío si:

* no hay ningún animal visible
* la imagen es demasiado confusa
* o el animal NO está representado de ninguna forma razonable en el catálogo proporcionado.
`;

const USER_PROMPT = `
Analiza esta imagen y devuelve hasta 3 posibles especies de la lista proporcionada, ordenadas por probabilidad.

Debes escoger las especies del catálogo que representen de forma más adecuada y práctica al animal observado.

No necesitas identificar subespecies, razas o variedades exactas si el catálogo ya contiene una especie representativa cercana.

Devuelve:

* common_name
* scientific_name
* confidence entre 0 y 1

También debes devolver missing_candidate cuando el animal sea reconocible, pero no esté representado de forma razonable en la lista del catálogo.

Formato esperado:
{
  "suggestions": [{ "common_name": string, "scientific_name": string, "confidence": number }],
  "missing_candidate": { "common_name": string, "scientific_name": string | null, "reason": string } | null
}

Si no hay animal visible o el animal no está representado en el catálogo, devuelve suggestions vacío.
`;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_SPECIES_COUNT = 250;
const CANDIDATE_SNAPSHOT_LIMIT = 25;
const IDENTIFY_CONFIDENCE_THRESHOLD = 0.7;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalScientificName(value: string): string {
  const cleaned = normalize(value).replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
  const [genus = "", species = ""] = cleaned.split(" ");

  if (!genus || !species) {
    return cleaned;
  }

  const pair = `${genus} ${species}`;

  if (pair === "helix aspersa") {
    return "cornu aspersum";
  }

  if (pair === "cornu aspersum") {
    return "cornu aspersum";
  }

  return pair;
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

function normalizeSpeciesCandidate(candidate: SpeciesCandidate): SpeciesCandidate {
  return {
    common_name: candidate.common_name?.trim() ?? "",
    scientific_name: candidate.scientific_name?.trim() ?? "",
    category: candidate.category?.trim() ?? "",
  };
}

function buildCandidateSnapshot(speciesList: SpeciesCandidate[]): SpeciesCandidate[] {
  if (speciesList.length <= CANDIDATE_SNAPSHOT_LIMIT) {
    return speciesList;
  }

  return speciesList.slice(0, CANDIDATE_SNAPSHOT_LIMIT);
}

function joinLogMessages(...messages: Array<string | null | undefined>): string | null {
  const uniqueMessages = Array.from(
    new Set(messages.filter((message): message is string => Boolean(message?.trim()))),
  );

  return uniqueMessages.length > 0 ? uniqueMessages.join(" | ") : null;
}

function hasSpeciesCandidate(
  speciesList: SpeciesCandidate[],
  commonName: string,
  scientificName: string,
): boolean {
  const normalizedCommonName = normalize(commonName);
  const normalizedScientificName = canonicalScientificName(scientificName);

  return speciesList.some((candidate) => {
    const candidateCommon = normalize(candidate.common_name);
    const candidateScientific = canonicalScientificName(candidate.scientific_name);

    return (
      candidateCommon === normalizedCommonName ||
      candidateScientific === normalizedScientificName
    );
  });
}

function logIdentifyDebug(input: {
  speciesCount: number;
  speciesList: SpeciesCandidate[];
  bestSuggestion?: IdentifySuggestion | null;
  uncertainReason?: string | null;
}): void {
  console.log("AI identify debug", {
    species_count: input.speciesCount,
    has_caracol_comun_cornu_aspersum: hasSpeciesCandidate(
      input.speciesList,
      "Caracol común",
      "Cornu aspersum",
    ),
    has_babosa_comun_arion_vulgaris: hasSpeciesCandidate(
      input.speciesList,
      "Babosa común",
      "Arion vulgaris",
    ),
    best_suggestion: input.bestSuggestion
      ? {
          common_name: input.bestSuggestion.common_name,
          scientific_name: input.bestSuggestion.scientific_name,
          confidence: input.bestSuggestion.confidence,
        }
      : null,
    uncertain_reason: input.uncertainReason ?? null,
  });
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
}): Promise<{ imageUrl: string | null; errorMessage: string | null }> {
  const parsedImage = parseDataUrl(options.imageDataUrl);

  if (!parsedImage) {
    return {
      imageUrl: null,
      errorMessage: "No se pudo subir imagen de identificación",
    };
  }

  const supabase = createSupabaseRouteClient(options.accessToken);

  if (!supabase) {
    return {
      imageUrl: null,
      errorMessage: "No se pudo subir imagen de identificación",
    };
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
    return {
      imageUrl: null,
      errorMessage: "No se pudo subir imagen de identificación",
    };
  }

  const { data } = supabase.storage.from(AI_IDENTIFICATION_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    return {
      imageUrl: null,
      errorMessage: "No se pudo subir imagen de identificación",
    };
  }

  return {
    imageUrl: data.publicUrl,
    errorMessage: null,
  };
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
    best_common_name:
      input.bestSuggestion?.common_name ?? input.missingCandidate?.common_name ?? null,
    best_scientific_name:
      input.bestSuggestion?.scientific_name ?? input.missingCandidate?.scientific_name ?? null,
    best_confidence: input.bestSuggestion?.confidence ?? null,
    species_count: input.speciesCount ?? null,
    candidate_species_snapshot: (input.candidateSpeciesSnapshot ?? null) as Json,
    uncertain_reason: input.uncertainReason ?? null,
    model_raw_response: input.modelRawResponse ?? null,
    internal_suggestions: (input.internalSuggestions ?? null) as Json,
    needs_species_review: input.status === "missing_species",
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

function toValidMissingCandidate(raw: unknown): MissingCandidate | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = (raw as { missing_candidate?: unknown }).missing_candidate;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const typed = candidate as Record<string, unknown>;
  const commonName =
    typeof typed.common_name === "string" ? typed.common_name.trim() : "";
  const scientificNameRaw = typed.scientific_name;
  const reason = typeof typed.reason === "string" ? typed.reason.trim() : "";

  if (!commonName || !reason) {
    return null;
  }

  const scientificName =
    typeof scientificNameRaw === "string" && scientificNameRaw.trim().length > 0
      ? scientificNameRaw.trim()
      : null;

  return {
    common_name: commonName,
    scientific_name: scientificName,
    reason,
  };
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
  let uploadErrorMessage: string | null = null;

  try {
    const parsed = await parseRequestBody(request);
    imageDataUrl = parsed.imageDataUrl;
    speciesList = parsed.speciesList;
  } catch {
    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      speciesCount: 0,
      candidateSpeciesSnapshot: [],
      errorMessage: "Body invalido.",
    });
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  const normalizedCandidates = Array.isArray(speciesList)
    ? speciesList.map(normalizeSpeciesCandidate)
    : [];
  const speciesCount = normalizedCandidates.length;
  const candidateSpeciesSnapshot = buildCandidateSnapshot(normalizedCandidates);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (imageDataUrl?.startsWith("data:image/")) {
      const uploadResult = await uploadIdentifyImage({
        imageDataUrl,
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
      });
      imageUrl = uploadResult.imageUrl;
      uploadErrorMessage = uploadResult.errorMessage;
    }

    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: joinLogMessages(
        "La clave de OpenAI no esta configurada en el servidor.",
        uploadErrorMessage,
      ),
    });

    return NextResponse.json(
      { error: "La clave de OpenAI no esta configurada en el servidor." },
      { status: 500 },
    );
  }

  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: "Debes enviar una imagen valida.",
    });
    return NextResponse.json({ error: "Debes enviar una imagen valida." }, { status: 400 });
  }

  if (bytesFromDataUrl(imageDataUrl) > MAX_IMAGE_BYTES) {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
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

  const uploadResult = await uploadIdentifyImage({
    imageDataUrl,
    accessToken: resolvedAuth.accessToken,
    userId: resolvedAuth.userId,
  });
  imageUrl = uploadResult.imageUrl;
  uploadErrorMessage = uploadResult.errorMessage;

  if (!Array.isArray(speciesList) || speciesList.length === 0) {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: joinLogMessages(
        "Debes enviar al menos una especie candidata.",
        uploadErrorMessage,
      ),
    });
    return NextResponse.json(
      { error: "Debes enviar al menos una especie candidata." },
      { status: 400 },
    );
  }

  if (speciesList.length > MAX_SPECIES_COUNT) {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: joinLogMessages(
        "Demasiadas especies en speciesList. Envia una lista reducida para mejorar coste y latencia.",
        uploadErrorMessage,
      ),
    });
    return NextResponse.json(
      {
        error:
          "Demasiadas especies en speciesList. Envia una lista reducida para mejorar coste y latencia.",
      },
      { status: 400 },
    );
  }
  const sanitizedCandidates = normalizedCandidates.filter(
    (candidate) => candidate.common_name.length > 0,
  );

  if (sanitizedCandidates.length === 0) {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: joinLogMessages(
        "Lista de especies candidatas vacia.",
        uploadErrorMessage,
      ),
    });

    return NextResponse.json(
      { error: "Lista de especies candidatas vacia." },
      { status: 400 },
    );
  }

  const allowedCommon = new Set(sanitizedCandidates.map((candidate) => normalize(candidate.common_name)));
  const allowedScientific = new Set(
    sanitizedCandidates
      .map((candidate) => canonicalScientificName(candidate.scientific_name))
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
              missing_candidate: {
                anyOf: [
                  {
                    type: "null",
                  },
                  {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      common_name: { type: "string" },
                      scientific_name: {
                        anyOf: [{ type: "string" }, { type: "null" }],
                      },
                      reason: { type: "string" },
                    },
                    required: ["common_name", "scientific_name", "reason"],
                  },
                ],
              },
            },
            required: ["suggestions", "missing_candidate"],
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
      logIdentifyDebug({
        speciesCount,
        speciesList: normalizedCandidates,
        bestSuggestion: null,
        uncertainReason: "empty_model_suggestions",
      });

      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "uncertain",
        speciesCount,
        candidateSpeciesSnapshot,
        uncertainReason: "empty_model_suggestions",
        internalSuggestions: [],
        errorMessage: uploadErrorMessage,
      });

      return NextResponse.json({
        status: "uncertain",
        suggestion: null,
        missingCandidate: null,
      } satisfies IdentifyResponse);
    }

    let parsed: unknown;
    let modelRawResponse: Json | null = null;

    try {
      parsed = JSON.parse(rawText) as unknown;
      modelRawResponse = parsed as Json;
    } catch {
      modelRawResponse = { raw_text: rawText };
      logIdentifyDebug({
        speciesCount,
        speciesList: normalizedCandidates,
        bestSuggestion: null,
        uncertainReason: null,
      });

      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "error",
        speciesCount,
        candidateSpeciesSnapshot,
        modelRawResponse,
        errorMessage: joinLogMessages("Respuesta invalida del modelo.", uploadErrorMessage),
      });
      return NextResponse.json({ error: "Respuesta invalida del modelo." }, { status: 502 });
    }

    const modelSuggestions = toValidSuggestions(parsed);
    const missingCandidate = toValidMissingCandidate(parsed);
    const suggestions = modelSuggestions.filter((suggestion) => {
      const commonAllowed = allowedCommon.has(normalize(suggestion.common_name));
      const scientificAllowed = allowedScientific.has(
        canonicalScientificName(suggestion.scientific_name),
      );

      return commonAllowed || scientificAllowed;
    });

    const bestModelSuggestion = [...modelSuggestions].sort(
      (left, right) => right.confidence - left.confidence,
    )[0] ?? null;

    const bestSuggestion = [...suggestions].sort(
      (left, right) => right.confidence - left.confidence,
    )[0] ?? null;

    if (!bestSuggestion && missingCandidate) {
      logIdentifyDebug({
        speciesCount,
        speciesList: normalizedCandidates,
        bestSuggestion: null,
        uncertainReason: "species_not_in_catalog",
      });

      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "missing_species",
        missingCandidate,
        speciesCount,
        candidateSpeciesSnapshot,
        uncertainReason: "species_not_in_catalog",
        modelRawResponse,
        internalSuggestions: suggestions,
        errorMessage: uploadErrorMessage,
      });

      return NextResponse.json({
        status: "missing_species",
        suggestion: null,
        missingCandidate,
      } satisfies IdentifyResponse);
    }

    if (!bestSuggestion || bestSuggestion.confidence < IDENTIFY_CONFIDENCE_THRESHOLD) {
      const uncertainReason =
        modelSuggestions.length === 0
          ? "empty_model_suggestions"
          : suggestions.length === 0
            ? "suggestions_filtered_out"
            : "below_threshold";
      const loggedBestSuggestion = bestSuggestion ?? bestModelSuggestion;

      logIdentifyDebug({
        speciesCount,
        speciesList: normalizedCandidates,
        bestSuggestion: loggedBestSuggestion,
        uncertainReason,
      });

      await writeIdentifyLog({
        accessToken: resolvedAuth.accessToken,
        userId: resolvedAuth.userId,
        imageUrl,
        status: "uncertain",
        bestSuggestion: loggedBestSuggestion,
        speciesCount,
        candidateSpeciesSnapshot,
        uncertainReason,
        modelRawResponse,
        internalSuggestions: suggestions,
        errorMessage: uploadErrorMessage,
      });

      return NextResponse.json({
        status: "uncertain",
        suggestion: null,
        missingCandidate: null,
      } satisfies IdentifyResponse);
    }

    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "identified",
      bestSuggestion,
      speciesCount,
      candidateSpeciesSnapshot,
      modelRawResponse,
      internalSuggestions: suggestions,
      errorMessage: uploadErrorMessage,
    });

    return NextResponse.json({
      status: "identified",
      suggestion: bestSuggestion,
      missingCandidate: null,
    } satisfies IdentifyResponse);
  } catch {
    logIdentifyDebug({
      speciesCount,
      speciesList: normalizedCandidates,
      bestSuggestion: null,
      uncertainReason: null,
    });

    await writeIdentifyLog({
      accessToken: resolvedAuth.accessToken,
      userId: resolvedAuth.userId,
      imageUrl,
      status: "error",
      speciesCount,
      candidateSpeciesSnapshot,
      errorMessage: joinLogMessages(
        "Error al consultar OpenAI para identificar la imagen.",
        uploadErrorMessage,
      ),
    });

    return NextResponse.json(
      { error: "Error al consultar OpenAI para identificar la imagen." },
      { status: 500 },
    );
  }
}