import type { Page } from "@playwright/test";

import { expect, test, webOrigin } from "./harness";

type RuntimeGlobal = {
	chrome?: {
		runtime?: {
			sendMessage?: (id: string, message: unknown) => Promise<unknown>;
		};
	};
};

// Sends one message from the page to the extension, as the web app would.
function sendFrom(page: Page, extensionId: string, message: unknown) {
	return page.evaluate(
		([id, msg]) =>
			(globalThis as RuntimeGlobal).chrome?.runtime?.sendMessage?.(id, msg),
		[extensionId, message] as const,
	);
}

test.describe("web app messaging (onMessageExternal)", () => {
	test("the allowed web origin can read and write the wallet", async ({
		context,
		extensionId,
		seedWallet,
	}) => {
		await seedWallet(["citi-double-cash"]);
		const web = await context.newPage();
		await web.goto(`${webOrigin}/`);

		const read = (await sendFrom(web, extensionId, {
			type: "cardmax:getWallet",
		})) as { wallet: { cardId: string }[] };
		expect(read.wallet.map((card) => card.cardId)).toEqual([
			"citi-double-cash",
		]);

		const wallet = [{ cardId: "amex-gold", addedAt: "2026-10-22T00:00:00Z" }];
		expect(
			await sendFrom(web, extensionId, { type: "cardmax:setWallet", wallet }),
		).toEqual({ ok: true });
		expect(
			await sendFrom(web, extensionId, { type: "cardmax:getWallet" }),
		).toEqual({ wallet });

		expect(await sendFrom(web, extensionId, { type: "cardmax:nope" })).toEqual({
			error: "Invalid message",
		});
	});

	test("store pages cannot message the extension at all", async ({
		extensionId,
		openStore,
	}) => {
		// externally_connectable keeps chrome.runtime.sendMessage off other
		// origins, so the handler's own origin check is unreachable from here.
		const store = await openStore("bestbuy");
		expect(
			await store.evaluate(
				() => typeof (globalThis as RuntimeGlobal).chrome?.runtime?.sendMessage,
			),
		).toBe("undefined");
		expect(extensionId).toMatch(/^[a-p]{32}$/);
	});
});
