/**
 * download-species-images.mjs
 * Descarga imágenes de especies desde Wikimedia Commons.
 *
 * Uso:
 *   node scripts/download-species-images.mjs
 *
 * Requisitos: Node 18+ (fetch nativo). Sin dependencias externas.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

// ─── CONFIGURA TU LISTA AQUÍ ─────────────────────────────────────────────────

const SPECIES = [
  { common_name: "Petirrojo europeo",  scientific_name: "Erithacus rubecula",  category: "bird"     },
  { common_name: "Cabra montés",       scientific_name: "Capra pyrenaica",     category: "mammal"   },
  { common_name: "Lince ibérico",      scientific_name: "Lynx pardinus",       category: "mammal"   },
  { common_name: "Lagarto ocelado",    scientific_name: "Timon lepidus",       category: "reptile"  },
  { common_name: "Tritón jaspeado",    scientific_name: "Triturus marmoratus", category: "amphibian" },
  { common_name: "Salamandra común",   scientific_name: "Salamandra salamandra", category: "amphibian" },
  { common_name: "Mariposa isabelina", scientific_name: "Graellsia isabellae", category: "insect"   },
  { common_name: "Jabalí",             scientific_name: "Sus scrofa",          category: "mammal"   },
  { common_name: "Zorro rojo",         scientific_name: "Vulpes vulpes",       category: "mammal"   },
  { common_name: "Erizo europeo",      scientific_name: "Erinaceus europaeus", category: "mammal"   },
];

const OUTPUT_DIR = "./scripts/species-images"; // carpeta de salida
const MIN_WIDTH  = 600;                         // ancho mínimo de imagen aceptable
const DELAY_MS   = 2000;                        // pausa entre peticiones (respetar Wikimedia)
const RETRY_DELAYS = [5000, 15000, 30000];      // reintentos automáticos en ms

// ─── LÓGICA ──────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, options) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429 && attempt < RETRY_DELAYS.length) {
      const wait = RETRY_DELAYS[attempt];
      console.log(`       ⏳ Rate limit, reintentando en ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    return res;
  }
}

async function searchWikimediaImage(scientificName) {
  // Busca imágenes en Wikimedia Commons por nombre científico
  const commonsUrl = new URL("https://commons.wikimedia.org/w/api.php");
  commonsUrl.searchParams.set("action", "query");
  commonsUrl.searchParams.set("generator", "search");
  commonsUrl.searchParams.set("gsrnamespace", "6"); // NS 6 = File:
  commonsUrl.searchParams.set("gsrsearch", `${scientificName} -map -distribution -range -diagram -skull -skeleton -egg -map -range`);
  commonsUrl.searchParams.set("gsrlimit", "10");
  commonsUrl.searchParams.set("prop", "imageinfo");
  commonsUrl.searchParams.set("iiprop", "url|size|mime");
  commonsUrl.searchParams.set("iiurlwidth", "1200");
  commonsUrl.searchParams.set("format", "json");
  commonsUrl.searchParams.set("origin", "*");

  const res = await fetchWithRetry(commonsUrl.toString(), {
    headers: { "User-Agent": "TOVA-species-downloader/1.0 (educational project)" },
  });

  if (!res.ok) {
    throw new Error(`Commons API error: ${res.status}`);
  }

  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});

  if (pages.length === 0) {
    throw new Error("Sin resultados en Wikimedia Commons");
  }

  // Filtra: solo imágenes reales (jpg/png/webp), descarta mapas/iconos por tamaño y nombre
  const SKIP_PATTERN = /map|range|distribu|diagram|skull|skeleton|egg|icon|logo|flag|coat/i;

  const candidates = pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      return info ? { title: page.title, ...info } : null;
    })
    .filter((item) => {
      if (!item) return false;
      if (!["image/jpeg", "image/png", "image/webp"].includes(item.mime)) return false;
      if (SKIP_PATTERN.test(item.title)) return false;
      const w = item.thumbwidth ?? item.width ?? 0;
      const h = item.thumbheight ?? item.height ?? 0;
      // Descartar imágenes muy alargadas (probablemente banners) o muy pequeñas
      if (w < MIN_WIDTH) return false;
      if (h > 0 && w / h > 4) return false;
      return true;
    })
    .sort((a, b) => (b.thumbwidth ?? 0) - (a.thumbwidth ?? 0));

  if (candidates.length === 0) {
    throw new Error("Sin imágenes válidas en Wikimedia Commons");
  }

  // Usa la URL del thumbnail de 1200px si está disponible, si no la original
  const best = candidates[0];
  return best.thumburl ?? best.url;
}

async function downloadImage(url, destPath) {
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": "TOVA-species-downloader/1.0 (educational project)" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar imagen`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    throw new Error(`Tipo de contenido inesperado: ${contentType}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);

  return buffer.length;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getExt(url) {
  const ext = extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log(`\n📥 Descargando imágenes para ${SPECIES.length} especies...\n`);

  const results = { ok: [], failed: [] };

  for (const species of SPECIES) {
    const { common_name, scientific_name, category } = species;
    const label = `${common_name} (${scientific_name})`;

    try {
      const imageUrl = await searchWikimediaImage(scientific_name);
      const ext      = getExt(imageUrl);
      const fileName = `${slugify(scientific_name)}${ext}`;
      const dir      = join(OUTPUT_DIR, category);
      const destPath = join(dir, fileName);

      await mkdir(dir, { recursive: true });

      const bytes = await downloadImage(imageUrl, destPath);
      const kb    = (bytes / 1024).toFixed(1);

      console.log(`  ✅  ${label}`);
      console.log(`       → ${destPath} (${kb} KB)`);
      console.log(`       → URL: ${imageUrl}`);

      results.ok.push({ ...species, local_path: destPath, wikimedia_url: imageUrl });
    } catch (err) {
      console.log(`  ❌  ${label}`);
      console.log(`       → ${err.message}`);
      results.failed.push({ ...species, error: err.message });
    }

    await sleep(DELAY_MS);
  }

  // Resumen
  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Descargadas: ${results.ok.length}`);
  console.log(`❌ Fallidas:    ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log(`\nEspecies sin imagen:`);
    for (const s of results.failed) {
      console.log(`  • ${s.common_name} — ${s.error}`);
    }
  }

  // Genera JSON con URLs para copiar fácilmente a Supabase
  if (results.ok.length > 0) {
    const jsonPath = join(OUTPUT_DIR, "image_urls.json");
    const payload  = results.ok.map(({ common_name, scientific_name, category, wikimedia_url, local_path }) => ({
      common_name,
      scientific_name,
      category,
      wikimedia_url,
      local_path,
    }));

    await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    console.log(`\n📄 URLs guardadas en: ${jsonPath}`);
  }

  console.log();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
