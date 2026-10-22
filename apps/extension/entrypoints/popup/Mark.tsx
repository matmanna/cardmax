// The Pointmaxx mark. Source of truth: docs/brand/mark.svg and the Paper "Brand" page.
export function Mark({ size = 20 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
			<rect width="64" height="64" rx="15" fill="#0A7A52" />
			<rect x="11" y="18" width="42" height="29" rx="5" fill="#FFFFFF" />
			<rect x="11" y="24" width="42" height="5" fill="#0A7A52" />
			<path
				d="M32.5 42.5l7-7 7 7"
				stroke="#0A7A52"
				strokeWidth="4"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
