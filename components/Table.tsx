export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">{children}</table>
    </div>
  );
}

export function Thead({
  columns,
  sort,
}: {
  columns: string[];
  sort?: {
    keys: Record<string, string>;
    active: string;
    dir: "asc" | "desc";
    onSort: (key: string) => void;
  };
}) {
  return (
    <thead className="bg-zinc-50 dark:bg-zinc-900">
      <tr>
        {columns.map((c) => {
          const key = sort?.keys[c];
          const sortable = sort && key;
          const isActive = sort && key === sort.active;
          return (
            <th
              key={c}
              onClick={sortable ? () => sort.onSort(key) : undefined}
              className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors ${
                sortable ? "cursor-pointer select-none hover:text-zinc-900" : ""
              }`}
            >
              {c}
              {isActive ? (sort!.dir === "asc" ? " ▲" : " ▼") : ""}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-zinc-500">
        {message}
      </td>
    </tr>
  );
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-zinc-500">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </td>
    </tr>
  );
}
