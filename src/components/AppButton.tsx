import type { ButtonHTMLAttributes } from "react";

type AppButtonVariant = "primary" | "outline" | "danger" | "panel";
type AppButtonSize =
  | "md"
  | "compact"
  | "header"
  | "chip"
  | "icon"
  | "field"
  | "hero"
  | "panel";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 uppercase font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

const VARIANT_CLASS: Record<AppButtonVariant, string> = {
  primary: "bg-white text-black hover:bg-gray-100",
  outline:
    "border border-(--input-focus) text-(--text-primary) hover:border-white/40 opacity-90 hover:opacity-100",
  danger: "border border-red-300/40 text-red-100 hover:border-red-200/70",
  panel:
    "border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
};

const SIZE_CLASS: Record<AppButtonSize, string> = {
  md: "px-7 py-3 text-xs tracking-[0.12em]",
  compact: "px-5 py-2 text-xs tracking-[0.12em]",
  header: "px-6 py-2 text-xs tracking-[0.12em]",
  chip: "px-3 py-1.5 text-[11px] tracking-[0.12em]",
  icon: "w-8 h-8 p-0",
  field: "px-4 py-2.5 text-xs tracking-[0.12em]",
  hero: "px-8 py-3.5 text-xs tracking-[0.12em]",
  panel: "px-2.5 py-1.5 text-[11px] tracking-[0.08em]",
};

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AppButton({
  variant = "outline",
  size = "md",
  className,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
}
