import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  /** Header text ('' for an actions column). */
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-aligned, tabular numbers. */
  numeric?: boolean;
  className?: string;
}

/**
 * Data table. Scrolls sideways on small screens instead of squeezing the columns.
 * `expanded` renders an extra full-width row under a row (details).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  footer,
  expanded,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: ReactNode;
  expanded?: (row: T) => ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[720px] border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  'border-b border-border bg-surface-sunken px-3.5 py-3 text-left text-xs font-semibold whitespace-nowrap text-fg-subtle first:rounded-tl-md last:rounded-tr-md',
                  c.numeric && 'text-right',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const extra = expanded?.(row);
            return (
              <Fragment key={rowKey(row)}>
                <tr className="transition-colors duration-100 hover:bg-surface-sunken">
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={cn(
                        'border-b border-border px-3.5 py-3 align-middle',
                        c.numeric && 'text-right whitespace-nowrap tabular-nums',
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                {extra && (
                  <tr data-detail>
                    <td colSpan={columns.length} className="border-b border-border bg-surface-muted p-5">
                      {extra}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {footer && <tfoot className="bg-surface-sunken font-bold [&_td]:px-3.5 [&_td]:py-3">{footer}</tfoot>}
      </table>
    </div>
  );
}

/** First cell of most tables: name in bold, secondary line below. */
export function NameCell({ name, sub, after }: { name: ReactNode; sub?: ReactNode; after?: ReactNode }) {
  return (
    <div className="min-w-[180px]">
      <div className="font-semibold">
        {name}
        {after}
      </div>
      {sub && <div className="text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}

/** Buttons at the end of a row. */
export const RowActions = ({ children }: { children: ReactNode }) => <div className="flex justify-end gap-0.5">{children}</div>;
