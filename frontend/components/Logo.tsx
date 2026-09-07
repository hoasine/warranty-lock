export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-bold">GenLayer</span>
    </div>
  );
}

export function LogoMark({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  return (
    <svg className={`${dim} ${className}`} viewBox="0 0 97.76 91.93" aria-label="GenLayer">
      <path
        fill="currentColor"
        d="M44.26 32.35L27.72 67.12L43.29 74.9L0 91.93L44.26 0L44.26 32.35ZM53.5 32.35L70.04 67.12L54.47 74.9L97.76 91.93L53.5 0L53.5 32.35ZM48.64 43.78L58.33 62.94L48.64 67.69L39.47 62.92L48.64 43.78Z"
      />
    </svg>
  );
}
