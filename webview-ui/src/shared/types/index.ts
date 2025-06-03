// Types for VS Code API communication
export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface ConnectionFormData extends DatabaseConfig {
  name: string;
}

// Table data types
export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
}

export interface TableRow {
  [key: string]: any;
}

export interface TableData {
  tableName: string;
  columns: TableColumn[];
  rows: TableRow[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
}

// Message types for communication between webview and extension
export type MessageType = 
  | 'testConnection'
  | 'saveConnection'
  | 'loadTableData'
  | 'executeQuery'
  | 'getConnections'
  | 'deleteConnection'
  | 'updateTableData'
  | 'exportData';

export interface WebviewMessage {
  type: MessageType;
  payload?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface QueryResult {
  success: boolean;
  data?: TableRow[];
  columns?: TableColumn[];
  message?: string;
  error?: string;
}

// UI State types
export interface ConnectionFormState {
  isLoading: boolean;
  testResult: ConnectionTestResult | null;
  savedConnections: ConnectionFormData[];
}

export interface TableDataState {
  isLoading: boolean;
  tableData: TableData | null;
  selectedTable: string | null;
  searchQuery: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}
