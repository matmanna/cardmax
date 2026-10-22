import { useDebugValue, useMemo, useRef, useSyncExternalStore } from "react";

// React 19 ships useSyncExternalStore, so the npm shim isn't needed. The shim's
// CommonJS build does a runtime require("react") that fails once the server
// bundle is self-contained on Vercel, so vite.config.ts aliases it here there.
export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => Snapshot,
	getServerSnapshot: undefined | null | (() => Snapshot),
	selector: (snapshot: Snapshot) => Selection,
	isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
	const inst = useRef<{ hasValue: boolean; value: Selection | null }>({
		hasValue: false,
		value: null,
	});

	const [getSelection, getServerSelection] = useMemo(() => {
		let hasMemo = false;
		let memoSnapshot: Snapshot;
		let memoSelection: Selection;

		const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
			if (!hasMemo) {
				hasMemo = true;
				memoSnapshot = nextSnapshot;
				const nextSelection = selector(nextSnapshot);
				if (isEqual !== undefined && inst.current.hasValue) {
					const current = inst.current.value as Selection;
					if (isEqual(current, nextSelection)) {
						memoSelection = current;
						return current;
					}
				}
				memoSelection = nextSelection;
				return nextSelection;
			}
			if (Object.is(memoSnapshot, nextSnapshot)) return memoSelection;
			const nextSelection = selector(nextSnapshot);
			if (isEqual?.(memoSelection, nextSelection)) {
				memoSnapshot = nextSnapshot;
				return memoSelection;
			}
			memoSnapshot = nextSnapshot;
			memoSelection = nextSelection;
			return nextSelection;
		};

		return [
			() => memoizedSelector(getSnapshot()),
			getServerSnapshot == null
				? undefined
				: () => memoizedSelector(getServerSnapshot()),
		] as const;
	}, [getSnapshot, getServerSnapshot, selector, isEqual]);

	const value = useSyncExternalStore(
		subscribe,
		getSelection,
		getServerSelection,
	);
	const _ = useMemo(() => {
		inst.current.hasValue = true;
		inst.current.value = value;
	}, [value]);
	void _;
	useDebugValue(value);
	return value;
}
