export function FormField({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export const inputClass =
  "focus-glow w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-all duration-200 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200";

export const buttonPrimaryClass =
  "hover-press inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-zinc-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondaryClass =
  "hover-press inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-all duration-200 hover:bg-zinc-50 hover:shadow-md";
