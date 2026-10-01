const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Extensions and File.type are hints, not proof of the image's actual format.
// The server also decodes the complete image before accepting it.
export async function imageContentType(file: Blob): Promise<string> {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Choose a JPG, JPEG, PNG, or WebP image up to 10 MB.");
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 &&
    bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  throw new Error("This file is not a JPG, JPEG, PNG, or WebP image.");
}
