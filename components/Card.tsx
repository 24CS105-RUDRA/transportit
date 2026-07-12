import Link from "next/link";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hover-lift rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="animate-countUp mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="hover-lift block cursor-pointer transition-opacity hover:opacity-80">
        <Card>{content}</Card>
      </Link>
    );
  }
  return <Card>{content}</Card>;
}
