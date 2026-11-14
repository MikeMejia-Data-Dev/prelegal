/** The Prelegal mark and name. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={inverted ? "#fff" : "#4f46e5"} />
        <path d="M10 7h9l5 5v13a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill={inverted ? "#4f46e5" : "#fff"} />
        <path d="M12 15h8M12 19h8M12 23h5" stroke={inverted ? "#fff" : "#4f46e5"} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-indigo-950"}`}>Prelegal</span>
    </span>
  );
}
