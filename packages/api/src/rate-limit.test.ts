import { describe, expect, test } from "bun:test";

import { windowStart } from "./rate-limit";

describe("windowStart", () => {
	test("floors to the window boundary", () => {
		const t = Date.UTC(2026, 9, 22, 21, 30, 45, 500);
		expect(windowStart(t, 60_000).toISOString()).toBe(
			"2026-10-22T21:30:00.000Z",
		);
	});

	test("hits in the same minute share a window", () => {
		const a = Date.UTC(2026, 9, 22, 21, 30, 1);
		const b = Date.UTC(2026, 9, 22, 21, 30, 59);
		expect(windowStart(a, 60_000)).toEqual(windowStart(b, 60_000));
	});
});
