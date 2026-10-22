import { collect } from "@/lib/page";

// Registered at runtime only for sites the user turned on in the popup (see
// background.ts). It reads checkout pages and tells the background, which
// sets the toolbar badge. It changes nothing on the page and sends nothing out.
const checkoutPath = /(checkout|cart|basket|bag|payment)/i;

export default defineContentScript({
	registration: "runtime",
	main() {
		if (!checkoutPath.test(location.pathname)) return;
		browser.runtime.sendMessage({ type: "cardmax:checkout", raw: collect() });
	},
});
