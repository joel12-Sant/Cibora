// src/lib/uploads.ts
export type UploadResult = { url: string };

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Sube una imagen a Cloudinary (unsigned).
 * - Requiere NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 * - Si faltan, retorna un placeholder y lanza warning en consola.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn(
      "[uploads] Falta configurar Cloudinary. Usando placeholder temporal."
    );
    // Placeholder de 1x1 (data URL transparente) para no romper la UI
    return { url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" };
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = (await res.json()) as { secure_url?: string; url?: string; error?: unknown };

  if (!res.ok || !data?.secure_url) {
    console.error("[uploads] Error Cloudinary:", data?.error || data);
    throw new Error("No se pudo subir la imagen");
  }
  return { url: data.secure_url };
}
