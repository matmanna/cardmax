import { describe, expect, test } from "bun:test";

import { inboundFromPhoton } from "./photon";

const sender = { id: "+15551112222" };

describe("inboundFromPhoton", () => {
	test("maps text messages", () => {
		expect(
			inboundFromPhoton({ sender, content: { type: "text", text: "costco" } }),
		).toEqual({ from: "+15551112222", text: "costco" });
	});

	test("passes image attachments through by id", () => {
		expect(
			inboundFromPhoton({
				sender,
				content: { type: "attachment", id: "att-1", mimeType: "image/jpeg" },
			}),
		).toEqual({ from: "+15551112222", imageUrl: "photon-attachment:att-1" });
	});

	test("ignores voice memos, reactions and messages without a sender", () => {
		expect(
			inboundFromPhoton({
				sender,
				content: { type: "attachment", id: "a", mimeType: "audio/x-m4a" },
			}),
		).toBeNull();
		expect(
			inboundFromPhoton({ sender, content: { type: "reaction" } }),
		).toBeNull();
		expect(
			inboundFromPhoton({ content: { type: "text", text: "hi" } }),
		).toBeNull();
	});
});
