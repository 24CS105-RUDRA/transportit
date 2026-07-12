const COLOR_MAP: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  orange: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-rose-100 text-rose-700 border-rose-200",
  gray: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "green",
  COMPLETED: "green",
  ON_TRIP: "blue",
  DISPATCHED: "blue",
  IN_SHOP: "orange",
  PENDING: "orange",
  ACTIVE: "orange",
  DRAFT: "gray",
  OFF_DUTY: "gray",
  RETIRED: "red",
  SUSPENDED: "red",
  CANCELLED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "gray";
  const classes = COLOR_MAP[color];
  const isActive = status === "ON_TRIP" || status === "DISPATCHED";
  return (
    <span
      className={`hover-pop inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-transform ${classes} ${isActive ? "animate-pulseGlow" : ""}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
