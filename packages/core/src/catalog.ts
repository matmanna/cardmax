import type { CardProduct } from "./schema";

// Hand-curated from issuer pages. Every entry needs a sourceUrl and checkedOn.
// Leave a card out rather than guess a rate. Portal-only and limited-time
// bonuses are left out because we cannot tell how a purchase was booked.

const superstoresAndClubs = [
	"walmart.com",
	"target.com",
	"costco.com",
	"samsclub.com",
	"bjs.com",
];

const airlines = [
	"delta.com",
	"united.com",
	"aa.com",
	"southwest.com",
	"alaskaair.com",
	"jetblue.com",
];

export const catalog: CardProduct[] = [
	{
		id: "chase-freedom-unlimited",
		issuer: "Chase",
		name: "Freedom Unlimited",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 1.5,
		rules: [
			{ category: "dining", multiplier: 3, excludesMerchants: [] },
			{ category: "drugstore", multiplier: 3, excludesMerchants: [] },
		],
		sourceUrl:
			"https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited",
		checkedOn: "2026-10-22",
	},
	{
		id: "chase-sapphire-preferred",
		issuer: "Chase",
		name: "Sapphire Preferred",
		rewardCurrency: "points",
		annualFeeUsd: 95,
		baseMultiplier: 1,
		rules: [
			{ category: "dining", multiplier: 3, excludesMerchants: [] },
			{ category: "gas", multiplier: 3, excludesMerchants: [] },
			{ category: "streaming", multiplier: 3, excludesMerchants: [] },
			{ category: "travel", multiplier: 2, excludesMerchants: [] },
		],
		sourceUrl:
			"https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred",
		checkedOn: "2026-10-22",
	},
	{
		id: "amex-gold",
		issuer: "American Express",
		name: "Gold Card",
		rewardCurrency: "points",
		annualFeeUsd: 325,
		baseMultiplier: 1,
		rules: [
			{
				category: "dining",
				multiplier: 4,
				capUsd: 50000,
				excludesMerchants: [],
			},
			{
				category: "grocery",
				multiplier: 4,
				capUsd: 25000,
				excludesMerchants: superstoresAndClubs,
			},
			{
				category: "travel",
				multiplier: 3,
				excludesMerchants: [],
				onlyMerchants: airlines,
			},
		],
		sourceUrl:
			"https://www.americanexpress.com/us/credit-cards/card/gold-card/",
		checkedOn: "2026-10-22",
	},
	{
		id: "amex-blue-cash-preferred",
		issuer: "American Express",
		name: "Blue Cash Preferred",
		rewardCurrency: "cash",
		annualFeeUsd: 95,
		baseMultiplier: 1,
		rules: [
			{
				category: "grocery",
				multiplier: 6,
				capUsd: 6000,
				excludesMerchants: superstoresAndClubs,
			},
			{ category: "streaming", multiplier: 6, excludesMerchants: [] },
			{
				category: "gas",
				multiplier: 3,
				excludesMerchants: superstoresAndClubs,
			},
		],
		sourceUrl:
			"https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/",
		checkedOn: "2026-10-22",
	},
	{
		id: "citi-double-cash",
		issuer: "Citi",
		name: "Double Cash",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 2,
		rules: [],
		sourceUrl: "https://www.citi.com/credit-cards/citi-double-cash-credit-card",
		checkedOn: "2026-10-22",
	},
	{
		id: "capital-one-savor",
		issuer: "Capital One",
		name: "Savor",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 1,
		rules: [
			{
				category: "grocery",
				multiplier: 3,
				excludesMerchants: ["walmart.com", "target.com"],
			},
			{ category: "dining", multiplier: 3, excludesMerchants: [] },
			{ category: "streaming", multiplier: 3, excludesMerchants: [] },
		],
		sourceUrl: "https://www.capitalone.com/credit-cards/savor/",
		checkedOn: "2026-10-22",
	},
	{
		id: "wells-fargo-active-cash",
		issuer: "Wells Fargo",
		name: "Active Cash",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 2,
		rules: [],
		sourceUrl: "https://creditcards.wellsfargo.com/active-cash-credit-card/",
		checkedOn: "2026-10-22",
	},
	{
		// Rates assume an eligible Prime membership (3% at Amazon without one).
		id: "chase-prime-visa",
		issuer: "Chase",
		name: "Prime Visa",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 1,
		rules: [
			{
				category: "online_retail",
				multiplier: 5,
				excludesMerchants: [],
				onlyMerchants: ["amazon.com"],
			},
			{
				category: "grocery",
				multiplier: 5,
				excludesMerchants: [],
				onlyMerchants: ["wholefoodsmarket.com"],
			},
			{ category: "gas", multiplier: 2, excludesMerchants: [] },
			{ category: "dining", multiplier: 2, excludesMerchants: [] },
		],
		sourceUrl:
			"https://creditcards.chase.com/cash-back-credit-cards/amazon-prime-rewards",
		checkedOn: "2026-10-22",
	},
];
