import "server-only";
import sharp from "sharp";
import heicConvert from "heic-convert";

export type ProcessedImage = {
  full: Buffer; // display version (WebP, max 2048px)
  thumb: Buffer; // gallery thumbnail (WebP, max 600px)
};

const FULL_MAX = 2048;
const THUMB_MAX = 600;

/**
 * Normalize any supported upload into two WebP buffers (display + thumbnail).
 *
 * iPhone HEIC/HEIF uses the HEVC codec, which the prebuilt `sharp` binary
 * cannot decode (licensing) — so we first transcode HEIC → JPEG with
 * heic-convert, then hand the result to sharp. Everything else goes straight
 * to sharp. EXIF orientation is baked in via `.rotate()`.
 *
 * Throws if the bytes aren't a decodable image (acts as content validation).
 */
export async function processUploadImage(
  input: Buffer,
  isHeic: boolean,
): Promise<ProcessedImage> {
  let decodable = input;

  if (isHeic) {
    const jpeg = await heicConvert({
      buffer: input,
      format: "JPEG",
      quality: 0.92,
    });
    decodable = Buffer.from(jpeg);
  }

  const base = sharp(decodable, { failOn: "error" }).rotate();

  const [full, thumb] = await Promise.all([
    base
      .clone()
      .resize(FULL_MAX, FULL_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    base
      .clone()
      .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer(),
  ]);

  return { full, thumb };
}
