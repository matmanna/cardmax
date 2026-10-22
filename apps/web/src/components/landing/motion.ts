import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const onChange = () => setReduced(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);
	return reduced;
}

// True while the element is on screen, so autoplay only runs when watched.
export function useInView<T extends Element>(threshold = 0.3) {
	const ref = useRef<T>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const observer = new IntersectionObserver(
			([entry]) => setInView(entry?.isIntersecting ?? false),
			{ threshold },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [threshold]);
	return [ref, inView] as const;
}
