// Removes EXIF, XMP, GPS, comments and other metadata before a photo goes anywhere.
// Pure byte surgery, no re-encode, so the pixels are untouched.

export type ImageType = "image/jpeg" | "image/png";

// JPEG: drop APP1-APP13, APP15 (EXIF, XMP, IPTC, ...) and COM. Keep APP0 (JFIF)
// and APP14 (Adobe color transform), which decoders need.
function stripJpeg(bytes: Uint8Array): Uint8Array | null {
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
	const out: number[] = [0xff, 0xd8];
	let i = 2;
	while (i + 4 <= bytes.length) {
		if (bytes[i] !== 0xff) return null;
		const marker = bytes[i + 1] ?? 0;
		// Start of scan: the rest is image data.
		if (marker === 0xda) {
			for (let j = i; j < bytes.length; j++) out.push(bytes[j] ?? 0);
			return Uint8Array.from(out);
		}
		const length = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
		const end = i + 2 + length;
		if (length < 2 || end > bytes.length) return null;
		const isMetadata =
			(marker >= 0xe1 && marker <= 0xed) || marker === 0xef || marker === 0xfe;
		if (!isMetadata) {
			for (let j = i; j < end; j++) out.push(bytes[j] ?? 0);
		}
		i = end;
	}
	return null;
}

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngMetadataChunks = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);

// PNG: drop text, EXIF and timestamp chunks.
function stripPng(bytes: Uint8Array): Uint8Array | null {
	if (!pngSignature.every((b, i) => bytes[i] === b)) return null;
	const parts: Uint8Array[] = [bytes.subarray(0, 8)];
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let i = 8;
	while (i + 12 <= bytes.length) {
		const length = view.getUint32(i);
		const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
		const end = i + 12 + length;
		if (end > bytes.length) return null;
		if (!pngMetadataChunks.has(type)) parts.push(bytes.subarray(i, end));
		i = end;
		if (type === "IEND") break;
	}
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

// Returns clean bytes, or null for a type we don't accept or a malformed file.
export function stripImageMetadata(
	bytes: Uint8Array,
	type: string,
): { bytes: Uint8Array; type: ImageType } | null {
	if (type === "image/jpeg" || type === "image/jpg") {
		const clean = stripJpeg(bytes);
		return clean && { bytes: clean, type: "image/jpeg" };
	}
	if (type === "image/png") {
		const clean = stripPng(bytes);
		return clean && { bytes: clean, type: "image/png" };
	}
	return null;
}
