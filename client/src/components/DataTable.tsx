import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  /** The first column is the row title on mobile; others become label / value pairs unless hidden. */
  hideOnMobile?: boolean;
}

/**
 * One surface, quiet separators. On phones the table becomes a readable stacked list
 * rather than a shrunken grid.
 */
export function DataTable<T>({ columns, rows, getKey, onRowClick, empty, pageSize = 10 }: {
  columns: Column<T>[]; rows: T[]; getKey: (row: T) => string;
  onRowClick?: (row: T) => void; empty?: ReactNode; pageSize?: number;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [rows.length]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!sort || !col?.sortValue) return rows;
    const val = col.sortValue;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = val(a); const y = val(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, sort]);

  if (!rows.length) return <>{empty}</>;

  const pages = Math.ceil(sorted.length / pageSize);
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  const activate = (row: T) => (e: React.KeyboardEvent) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(row); }
  };
  const [titleCol, ...restCols] = columns;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('px-5 py-3 text-foot font-medium text-fg2', c.className)}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)}
                        className={cn('-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:text-fg', active && 'text-fg')}>
                        {c.header}
                        {active && (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) => (
              <tr key={getKey(row)} onClick={() => onRowClick?.(row)} onKeyDown={activate(row)}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('transition-colors focus-visible:outline-offset-[-2px]', onRowClick && 'cursor-pointer hover:bg-subtle')}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-5 py-4 align-middle', c.className)}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="divide-y divide-line md:hidden">
        {visible.map((row) => (
          <li key={getKey(row)} onClick={() => onRowClick?.(row)} onKeyDown={activate(row)}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn('px-5 py-4 focus-visible:outline-offset-[-2px]', onRowClick && 'cursor-pointer active:bg-subtle')}>
            <div>{titleCol.render(row)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {restCols.filter((c) => !c.hideOnMobile).map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-cap text-fg2">{c.header}</dt>
                  <dd className="mt-0.5 text-body">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-5 py-3 text-foot text-fg2">
          <span className="num">
            {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="grid h-9 w-9 place-items-center rounded-control transition-colors hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}
              className="grid h-9 w-9 place-items-center rounded-control transition-colors hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
