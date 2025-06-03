import { cn } from '../utils';

interface TableProps {
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    sortable?: boolean;
  }>;
  data: Array<Record<string, any>>;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table({
  columns,
  data,
  onSort,
  sortColumn,
  sortDirection,
  isLoading = false,
  emptyMessage = 'No data available',
  className
}: TableProps) {
  const handleSort = (column: string) => {
    if (!onSort) return;
    
    const newDirection = 
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto border border-[var(--vscode-input-border)] rounded', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--vscode-list-activeSelectionBackground)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-2 text-left text-sm font-medium text-[var(--vscode-list-activeSelectionForeground)]',
                  column.sortable && 'cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)]'
                )}
                style={column.width ? { width: column.width } : undefined}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable && (
                    <span className="text-xs">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? '↑' : '↓'
                      ) : (
                        '↕'
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="px-3 py-8 text-center text-sm text-[var(--vscode-descriptionForeground)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={index}
                className="border-t border-[var(--vscode-input-border)] hover:bg-[var(--vscode-list-hoverBackground)]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-2 text-sm text-[var(--vscode-foreground)]"
                  >
                    {row[column.key] !== null && row[column.key] !== undefined 
                      ? String(row[column.key]) 
                      : <span className="text-[var(--vscode-descriptionForeground)]">NULL</span>
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
