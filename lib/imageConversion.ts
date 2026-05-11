function hasHeicLikeExtension(fileName: string): boolean {
  const name = fileName.trim().toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

function hasHeicLikeMimeType(mimeType: string): boolean {
  const type = mimeType.trim().toLowerCase();
  return type === "image/heic" || type === "image/heif";
}

function replaceWithJpgExtension(fileName: string): string {
  if (hasHeicLikeExtension(fileName)) {
    return fileName.replace(/\.(heic|heif)$/i, ".jpg");
  }

  return `${fileName}.jpg`;
}

async function convertHeicViaCanvas(file: File, outputName: string): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(null); return; }
          resolve(new File([blob], outputName, { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        0.92,
      );
    });
  } catch {
    return null;
  }
}

export async function convertImageFileForApp(file: File): Promise<File> {
  const shouldConvert = hasHeicLikeMimeType(file.type) || hasHeicLikeExtension(file.name);

  if (!shouldConvert) {
    return file;
  }

  const outputName = replaceWithJpgExtension(file.name);

  // Primary: heic2any (funciona sense suport HEIC natiu al navegador)
  try {
    const module = await import("heic2any");
    const heic2any = module.default;

    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

    if (convertedBlob instanceof Blob) {
      return new File([convertedBlob], outputName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  } catch {
    // heic2any ha fallat — prova el fallback amb canvas
  }

  // Fallback: canvas (funciona si el navegador té suport HEIC natiu: Windows 11 + codec HEVC, Safari)
  const canvasResult = await convertHeicViaCanvas(file, outputName);
  if (canvasResult) {
    return canvasResult;
  }

  throw new Error(
    "No s'ha pogut convertir el fitxer HEIC. Converteix la foto a JPEG o PNG abans de pujar-la.",
  );
}
