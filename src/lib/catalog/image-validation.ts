import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_START_OF_IMAGE = 0xffd8;
const JPEG_FRAME_MARKERS = new Set([
  0xffc0,
  0xffc1,
  0xffc2,
  0xffc3,
  0xffc5,
  0xffc6,
  0xffc7,
  0xffc8,
  0xffc9,
  0xffca,
  0xffcb,
  0xffcc,
  0xffcd,
  0xffce,
  0xffcf,
]);

export type PdfRenderableImageFormat = "png" | "jpeg";

function isPngBuffer(buffer: Buffer) {
  return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function isJpegBuffer(buffer: Buffer) {
  return buffer.length >= 2 && buffer.readUInt16BE(0) === JPEG_START_OF_IMAGE;
}

function validatePngBuffer(buffer: Buffer) {
  let offset = PNG_SIGNATURE.length;
  let hasHeader = false;
  let hasImageData = false;
  let hasTrailer = false;
  const idatChunks: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    const crcEnd = dataEnd + 4;

    if (crcEnd > buffer.length) {
      throw new Error("Invalid PNG chunk length.");
    }

    const chunkType = buffer.toString("ascii", typeOffset, typeOffset + 4);
    const chunkData = buffer.subarray(dataOffset, dataEnd);

    if (chunkType === "IHDR") {
      hasHeader = true;
    } else if (chunkType === "IDAT") {
      hasImageData = true;
      idatChunks.push(chunkData);
    } else if (chunkType === "IEND") {
      hasTrailer = true;
      offset = crcEnd;
      break;
    }

    offset = crcEnd;
  }

  if (!hasHeader || !hasImageData || !hasTrailer) {
    throw new Error("PNG image is incomplete.");
  }

  inflateSync(Buffer.concat(idatChunks));
}

function validateJpegBuffer(buffer: Buffer) {
  if (!isJpegBuffer(buffer)) {
    throw new Error("JPEG start marker is missing.");
  }

  let marker: number | undefined;
  let offset = 2;

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1;
    }

    if (offset >= buffer.length) {
      break;
    }

    marker = buffer.readUInt16BE(offset);
    offset += 2;

    if (JPEG_FRAME_MARKERS.has(marker)) {
      break;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    offset += buffer.readUInt16BE(offset);
  }

  if (!marker || !JPEG_FRAME_MARKERS.has(marker) || offset + 5 > buffer.length) {
    throw new Error("JPEG frame marker is missing.");
  }

  const height = buffer.readUInt16BE(offset + 1);
  const width = buffer.readUInt16BE(offset + 3);

  if (height <= 0 || width <= 0) {
    throw new Error("JPEG dimensions are invalid.");
  }
}

export function validatePdfRenderableImageBuffer(buffer: Buffer): {
  contentType: "image/png" | "image/jpeg";
  format: PdfRenderableImageFormat;
} {
  if (isPngBuffer(buffer)) {
    validatePngBuffer(buffer);
    return {
      contentType: "image/png",
      format: "png",
    };
  }

  if (isJpegBuffer(buffer)) {
    validateJpegBuffer(buffer);
    return {
      contentType: "image/jpeg",
      format: "jpeg",
    };
  }

  throw new Error("Manual uploads must be a valid PNG or JPEG image.");
}

export function coercePdfRenderableImageBuffer(buffer: Buffer | null) {
  if (!buffer) {
    return null;
  }

  try {
    validatePdfRenderableImageBuffer(buffer);
    return buffer;
  } catch {
    return null;
  }
}
