import type { CSSProperties } from "react";

// A vertical hairline between two step cards, with a port at each end and a
// short beam gliding down it. `delay` staggers the beams so the steps read as
// one flow.
export function StepEdge({ delay = 0 }: { delay?: number }) {
	return (
		<span
			aria-hidden="true"
			className="lp-step-edge"
			style={{ "--bd": `${delay}s` } as CSSProperties}
		>
			<span className="lp-port" />
			<span className="lp-edge">
				<i />
			</span>
			<span className="lp-port" />
		</span>
	);
}
