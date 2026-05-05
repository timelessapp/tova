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

export async function convertImageFileForApp(file: File): Promise<File> {
  const shouldConvert = hasHeicLikeMimeType(file.type) || hasHeicLikeExtension(file.name);

  if (!shouldConvert) {
    return file;
  }

  const module = await import("heic2any");
  const heic2any = module.default;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

  if (!(convertedBlob instanceof Blob)) {
    throw new Error("No se pudo convertir el archivo HEIC/HEIF a JPEG.");
  }

  return new File([convertedBlob], replaceWithJpgExtension(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
