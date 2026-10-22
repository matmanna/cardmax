import { describe, expect, test } from "bun:test";

import { generateLinkCode, hashLinkCode, parseLinkCode } from "./link-code";
import { merchantFromText } from "./merchant-text";

describe("link codes", () => {
	test("are six digits", () => {
		for (let i = 0; i < 50; i++) expect(generateLinkCode()).toMatch(/^\d{6}$/);
	});

	test("hash depends on the secret", () => {
		expect(hashLinkCode("123456", "a")).not.toBe(hashLinkCode("123456", "b"));
		expect(hashLinkCode("123456", "a")).not.toContain("123456");
	});

	test("parse only bare codes", () => {
		expect(parseLinkCode("482913")).toBe("482913");
		expect(parseLinkCode(" 482-913 ")).toBe("482913");
		expect(parseLinkCode("my code is 482913")).toBeNull();
		expect(parseLinkCode("4829")).toBeNull();
	});
});

describe("merchantFromText", () => {
	test.each([
		["costco", "costco.com"],
		["Which card for Whole Foods?", "wholefoodsmarket.com"],
		["at Trader Joe's", "traderjoes.com"],
		["chick fil a", "chick-fil-a.com"],
		["Target", "target.com"],
		["shell", "shell.us"],
		["what about www.bestbuy.com", "www.bestbuy.com"],
	])("%p -> %p", (text, domain) => {
		expect(merchantFromText(text)).toBe(domain);
	});

	test("short or unknown names return null", () => {
		expect(merchantFromText("co")).toBeNull();
		expect(merchantFromText("which card")).toBeNull();
		expect(merchantFromText("zzqx")).toBeNull();
	});
});
