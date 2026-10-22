import { type ReactNode, useEffect, useRef, useState } from "react";

import { useInView, usePrefersReducedMotion } from "./motion";

// Fades a block up once, the first time it scrolls into view. It stays fully
// visible until the page has loaded in the browser, so nothing is hidden
// without JavaScript, and blocks already on screen never flash.
export function Reveal({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>(0.15);
	const [armed, setArmed] = useState(false);
	const [seen, setSeen] = useState(false);
	const local = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const node = local.current;
		if (!node || reduced) return;
		const top = node.getBoundingClientRect().top;
		if (top > window.innerHeight * 0.9) setArmed(true);
	}, [reduced]);

	useEffect(() => {
		if (inView) setSeen(true);
	}, [inView]);

	return (
		<div
			ref={(node) => {
				local.current = node;
				(ref as { current: HTMLDivElement | null }).current = node;
			}}
			className={`lp-reveal ${className}`}
			data-armed={armed || undefined}
			data-shown={seen || undefined}
		>
			{children}
		</div>
	);
}
