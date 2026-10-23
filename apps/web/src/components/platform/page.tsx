import { cn } from "@cardmax/ui/lib/utils";
import type { ReactNode } from "react";

// Shared frame for the signed-in screens (Paper: Platform).
export function Page({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-10 py-8">
			{children}
		</div>
	);
}

export function PageHeader({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex flex-col gap-0.5">
				<h1 className="text-[22px] leading-7 font-semibold">{title}</h1>
				{subtitle && (
					<p className="text-muted-foreground text-[13px] leading-[18px]">
						{subtitle}
					</p>
				)}
			</div>
			{action}
		</div>
	);
}

export function Panel({
	title,
	action,
	tone = "outline",
	className,
	children,
}: {
	title?: string;
	action?: ReactNode;
	tone?: "outline" | "muted";
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			className={cn(
				"flex flex-col gap-2.5 rounded-xl p-4",
				tone === "outline" ? "border" : "bg-muted",
				className,
			)}
		>
			{(title || action) && (
				<div className="flex items-center justify-between gap-3">
					{title && (
						<h2 className="text-sm leading-5 font-semibold">{title}</h2>
					)}
					{action}
				</div>
			)}
			{children}
		</section>
	);
}

export const buttonShape = "h-9 rounded-lg px-3.5 text-sm font-medium";
