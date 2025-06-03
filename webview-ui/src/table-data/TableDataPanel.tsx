import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Card, Table, Select } from '../shared/components';
import { useVSCodeAPI } from '../shared/hooks/useVSCodeAPI';
import { useMessageListener } from '../shared/hooks/useMessageListener';
import { debounce } from '../shared/utils';
import type { 
  TableData, 
  TableDataState, 
  WebviewMessage
} from '../shared/types';

export function TableDataPanel() {
  const [state, setState] = useState<TableDataState>({
    isLoading: false,
    tableData: null,
    selectedTable: null,
    searchQuery: '',
    sortColumn: null,
    sortDirection: 'asc'
  });
  
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [showQueryEditor, setShowQueryEditor] = useState(false);
  
  const { postMessage, getState, setState: setVSCodeState } = useVSCodeAPI();

  // Load saved state on mount
  useEffect(() => {
    const savedState = getState();
    if (savedState) {
      setState(savedState);
    }
  }, [getState]);

  // Save state when it changes
  useEffect(() => {
    setVSCodeState(state);
  }, [state, setVSCodeState]);

  // Handle messages from extension
  useMessageListener((message: WebviewMessage) => {
    switch (message.type) {
      case 'loadTableData':
        const tableData = message.payload as TableData;
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          tableData,
          selectedTable: tableData.tableName
        }));
        break;
        
      case 'executeQuery':
        const queryResult = message.payload;
        if (queryResult.success) {
          const customTableData: TableData = {
            tableName: 'Query Result',
            columns: queryResult.columns || [],
            rows: queryResult.data || [],
            totalRows: queryResult.data?.length || 0,
            currentPage: 1,
            pageSize: 50
          };
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            tableData: customTableData,
            selectedTable: 'custom-query'
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
          // Handle error - you might want to show an error message
        }
        break;
        
      case 'updateTableData':
        setAvailableTables(message.payload || []);
        break;
    }
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }));
    }, 300),
    []
  );

  // Filtered and sorted data
  const processedData = useMemo(() => {
    if (!state.tableData) return [];
    
    let filtered = state.tableData.rows;
    
    // Apply search filter
    if (state.searchQuery) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(state.searchQuery.toLowerCase())
        )
      );
    }
    
    // Apply sorting
    if (state.sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[state.sortColumn!];
        const bVal = b[state.sortColumn!];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return state.sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [state.tableData, state.searchQuery, state.sortColumn, state.sortDirection]);

  // Table columns configuration
  const tableColumns = useMemo(() => {
    if (!state.tableData) return [];
    
    return state.tableData.columns.map(column => ({
      key: column.name,
      label: column.name,
      sortable: true,
      width: undefined // Let it auto-size
    }));
  }, [state.tableData]);

  const handleTableSelect = (tableName: string) => {
    if (tableName === state.selectedTable) return;
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      selectedTable: tableName,
      searchQuery: '',
      sortColumn: null,
      sortDirection: 'asc'
    }));
    
    postMessage({ 
      type: 'loadTableData', 
      payload: { tableName } 
    });
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setState(prev => ({ 
      ...prev, 
      sortColumn: column, 
      sortDirection: direction 
    }));
  };

  const handleExecuteQuery = () => {
    if (!customQuery.trim()) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    postMessage({ 
      type: 'executeQuery', 
      payload: { query: customQuery } 
    });
  };

  const handleExportData = () => {
    if (!state.tableData) return;
    
    postMessage({ 
      type: 'exportData', 
      payload: { 
        tableName: state.tableData.tableName,
        data: processedData 
      } 
    });
  };

  const handleRefresh = () => {
    if (state.selectedTable && state.selectedTable !== 'custom-query') {
      handleTableSelect(state.selectedTable);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <div className="flex flex-col gap-4">
          {/* Table Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                label="Select Table"
                value={state.selectedTable || ''}
                onChange={(e) => handleTableSelect(e.target.value)}
                options={[
                  { value: '', label: 'Select a table...' },
                  ...availableTables.map(table => ({ value: table, label: table }))
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowQueryEditor(!showQueryEditor)}
              >
                {showQueryEditor ? 'Hide Query' : 'Custom Query'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={!state.selectedTable || state.selectedTable === 'custom-query'}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Custom Query Editor */}
          {showQueryEditor && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Custom SQL Query</label>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="SELECT * FROM your_table WHERE..."
                className="w-full h-24 px-3 py-2 text-sm bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded resize-none font-mono"
              />
              <Button
                onClick={handleExecuteQuery}
                disabled={!customQuery.trim()}
                isLoading={state.isLoading}
              >
                Execute Query
              </Button>
            </div>
          )}

          {/* Search and Actions */}
          {state.tableData && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search in table..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleExportData}
                disabled={processedData.length === 0}
              >
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Table Info */}
      {state.tableData && (
        <Card>
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">{state.tableData.tableName}</span>
              {' - '}
              <span>{processedData.length} of {state.tableData.totalRows} rows</span>
              {state.searchQuery && (
                <span className="text-[var(--vscode-descriptionForeground)]">
                  {' (filtered)'}
                </span>
              )}
            </div>
            <div className="text-[var(--vscode-descriptionForeground)]">
              {state.tableData.columns.length} columns
            </div>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        {!state.selectedTable ? (
          <div className="text-center py-8 text-[var(--vscode-descriptionForeground)]">
            Select a table to view its data
          </div>
        ) : (          <Table
            columns={tableColumns}
            data={processedData}
            onSort={handleSort}
            sortColumn={state.sortColumn || undefined}
            sortDirection={state.sortDirection}
            isLoading={state.isLoading}
            emptyMessage={
              state.searchQuery 
                ? `No results found for "${state.searchQuery}"`
                : 'No data available'
            }
          />
        )}
      </Card>

      {/* Schema Info */}
      {state.tableData && (
        <Card title="Table Schema">
          <div className="space-y-2">
            {state.tableData.columns.map((column, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 border border-[var(--vscode-input-border)] rounded text-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium">{column.name}</span>
                  <span className="text-[var(--vscode-descriptionForeground)]">
                    {column.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {column.isPrimaryKey && (
                    <span className="px-2 py-1 bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded">
                      PK
                    </span>
                  )}
                  {column.isForeignKey && (
                    <span className="px-2 py-1 bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded">
                      FK
                    </span>
                  )}
                  {!column.nullable && (
                    <span className="px-2 py-1 bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded">
                      NOT NULL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
