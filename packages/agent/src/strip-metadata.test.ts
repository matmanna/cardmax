import { describe, expect, test } from "bun:test";

import { stripImageMetadata } from "./strip-metadata";

const text = (s: string) => [...new TextEncoder().encode(s)];

function segment(marker: number, payload: number[]) {
	const length = payload.length + 2;
	return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

// SOI, APP0 JFIF, APP1 EXIF with GPS, APP13 IPTC, COM, DQT, APP14 Adobe, SOS + data, EOI.
const jpeg = Uint8Array.from([
	0xff,
	0xd8,
	...segment(0xe0, text("JFIF\0")),
	...segment(0xe1, text("Exif\0\0GPSLatitude 40.7128 N")),
	...segment(0xed, text("Photoshop 3.0 IPTC byline")),
	...segment(0xfe, text("shot at 123 Main St")),
	...segment(0xdb, [0, 1, 2, 3]),
	...segment(0xee, text("Adobe")),
	...segment(0xda, [1, 2, 3]),
	0x11,
	0x22,
	0xff,
	0x00,
	0x33,
	0xff,
	0xd9,
]);

function chunk(type: string, data: number[]) {
	const n = data.length;
	return [
		n >>> 24,
		(n >> 16) & 255,
		(n >> 8) & 255,
		n & 255,
		...text(type),
		...data,
		0,
		0,
		0,
		0,
	];
}

const png = Uint8Array.from([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a,
	...chunk("IHDR", Array(13).fill(1)),
	...chunk("eXIf", text("GPSLatitude 40.7")),
	...chunk("tEXt", text("Author\0Jane")),
	...chunk("IDAT", [9, 9, 9]),
	...chunk("IEND", []),
]);

const asText = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("stripImageMetadata", () => {
	test("JPEG loses EXIF, IPTC and comments but keeps decoder segments and scan data", () => {
		const clean = stripImageMetadata(jpeg, "image/jpeg");
		expect(clean?.type).toBe("image/jpeg");
		const out = asText(clean?.bytes ?? new Uint8Array());
		expect(out).not.toContain("GPSLatitude");
		expect(out).not.toContain("IPTC");
		expect(out).not.toContain("Main St");
		expect(out).toContain("JFIF");
		expect(out).toContain("Adobe");
		expect([...(clean?.bytes.slice(-7) ?? [])]).toEqual([
			0x11, 0x22, 0xff, 0x00, 0x33, 0xff, 0xd9,
		]);
	});

	test("PNG loses eXIf and text chunks but keeps image chunks", () => {
		const clean = stripImageMetadata(png, "image/png");
		const out = asText(clean?.bytes ?? new Uint8Array());
		expect(out).not.toContain("GPSLatitude");
		expect(out).not.toContain("Jane");
		expect(out).toContain("IHDR");
		expect(out).toContain("IDAT");
		expect(out).toContain("IEND");
	});

	test("rejects types we don't send and malformed files", () => {
		expect(stripImageMetadata(jpeg, "image/heic")).toBeNull();
		expect(stripImageMetadata(png, "image/jpeg")).toBeNull();
		expect(stripImageMetadata(jpeg.slice(0, 10), "image/jpeg")).toBeNull();
	});
});
