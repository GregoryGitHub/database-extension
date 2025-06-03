import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'pg';
import { DatabaseConnection } from '../database/connectionManager';

export interface TableInfo {
    name: string;
    schema: string;
    connection: DatabaseConnection;
}

export class TableDataPanel {
    public static currentPanel: TableDataPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private readonly _tableInfo: TableInfo;
    private readonly _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, tableInfo: TableInfo, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._tableInfo = tableInfo;
        this._extensionUri = extensionUri;
        this._panel.webview.html = this._getHtmlContent();
        this._setupMessageHandling();
        
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Load initial data
        this._loadInitialData();
    }

    private _setupMessageHandling() {
        this._panel.webview.onDidReceiveMessage(
            async message => {
                try {
                    switch (message.type) {
                        case 'loadTableData':
                            await this._handleLoadTableData(message.payload);
                            break;
                        case 'executeQuery':
                            await this._handleExecuteQuery(message.payload);
                            break;
                        case 'exportData':
                            await this._handleExportData(message.payload);
                            break;
                        default:
                            console.warn('Unknown message type:', message.type);
                    }
                } catch (error) {
                    console.error('Error handling webview message:', error);
                    this._panel.webview.postMessage({
                        type: message.type,
                        payload: {
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }
                    });
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _loadInitialData() {
        try {
            // Get list of tables for the dropdown
            const tables = await this._getTableList();
            this._panel.webview.postMessage({
                type: 'updateTableData',
                payload: tables
            });

            // Load data for the specific table
            await this._loadTableData(this._tableInfo.name);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    private async _getTableList(): Promise<string[]> {
        try {
            const client = new Client({
                host: this._tableInfo.connection.host,
                port: this._tableInfo.connection.port,
                database: this._tableInfo.connection.database,
                user: this._tableInfo.connection.username,
                password: this._tableInfo.connection.password
            });

            await client.connect();
            
            const result = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = $1 
                ORDER BY table_name
            `, [this._tableInfo.schema]);
            
            await client.end();

            return result.rows.map(row => row.table_name);
        } catch (error) {
            console.error('Error getting table list:', error);
            return [this._tableInfo.name]; // Fallback to current table
        }
    }

    private async _handleLoadTableData(payload: { tableName: string }) {
        await this._loadTableData(payload.tableName);
    }

    private async _loadTableData(tableName: string): Promise<void> {
        try {
            const client = new Client({
                host: this._tableInfo.connection.host,
                port: this._tableInfo.connection.port,
                database: this._tableInfo.connection.database,
                user: this._tableInfo.connection.username,
                password: this._tableInfo.connection.password
            });

            await client.connect();

            // Get table schema
            const schemaResult = await client.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
                    CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT ku.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                    WHERE tc.constraint_type = 'PRIMARY KEY' 
                    AND tc.table_schema = $1 
                    AND tc.table_name = $2
                ) pk ON c.column_name = pk.column_name
                LEFT JOIN (
                    SELECT ku.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_schema = $1 
                    AND tc.table_name = $2
                ) fk ON c.column_name = fk.column_name
                WHERE c.table_schema = $1 AND c.table_name = $2
                ORDER BY c.ordinal_position
            `, [this._tableInfo.schema, tableName]);

            // Get row count
            const countResult = await client.query(`
                SELECT COUNT(*) as total_rows 
                FROM "${this._tableInfo.schema}"."${tableName}"
            `);

            // Get data (limit to 200 rows for performance)
            const dataResult = await client.query(`
                SELECT * FROM "${this._tableInfo.schema}"."${tableName}" 
                LIMIT 200
            `);

            await client.end();

            const tableData = {
                tableName,
                columns: schemaResult.rows.map(row => ({
                    name: row.column_name,
                    type: row.data_type,
                    nullable: row.is_nullable === 'YES',
                    isPrimaryKey: row.is_primary_key,
                    isForeignKey: row.is_foreign_key,
                    defaultValue: row.column_default
                })),
                rows: dataResult.rows,
                totalRows: parseInt(countResult.rows[0].total_rows),
                currentPage: 1,
                pageSize: 200
            };

            this._panel.webview.postMessage({
                type: 'loadTableData',
                payload: tableData
            });

        } catch (error) {
            this._panel.webview.postMessage({
                type: 'loadTableData',
                payload: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    private async _handleExecuteQuery(payload: { query: string }) {
        try {
            const client = new Client({
                host: this._tableInfo.connection.host,
                port: this._tableInfo.connection.port,
                database: this._tableInfo.connection.database,
                user: this._tableInfo.connection.username,
                password: this._tableInfo.connection.password
            });

            await client.connect();
            
            const result = await client.query(payload.query);
            
            await client.end();

            const columns = result.fields.map(field => ({
                name: field.name,
                type: 'unknown', // We don't have type info from query results
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false
            }));

            this._panel.webview.postMessage({
                type: 'executeQuery',
                payload: {
                    success: true,
                    data: result.rows,
                    columns: columns,
                    message: `Query executed successfully. ${result.rowCount} rows returned.`
                }
            });

        } catch (error) {
            this._panel.webview.postMessage({
                type: 'executeQuery',
                payload: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    private async _handleExportData(payload: { tableName: string; data: any[] }) {
        try {
            const csvContent = this._convertToCSV(payload.data);
            const fileName = `${payload.tableName}_${new Date().toISOString().split('T')[0]}.csv`;
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    'CSV Files': ['csv']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent, 'utf8'));
                vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }    private _convertToCSV(data: any[]): string {
        if (!data.length) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) {
                    return '';
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    public static createOrShow(extensionUri: vscode.Uri, tableInfo: TableInfo) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, dispose it
        if (TableDataPanel.currentPanel) {
            TableDataPanel.currentPanel.dispose();
        }

        const panel = vscode.window.createWebviewPanel(
            'tableData',
            `${tableInfo.schema}.${tableInfo.name} - ${tableInfo.connection.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')
                ]
            }
        );

        TableDataPanel.currentPanel = new TableDataPanel(panel, tableInfo, extensionUri);
    }

    private _getHtmlContent(): string {
        const webviewUri = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview-ui')
        );

        const tableDataHtmlPath = path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'table-data.html');
        let html = fs.readFileSync(tableDataHtmlPath, 'utf8');

        // Replace relative paths with webview URIs
        html = html.replace(
            /src="\/src\//g,
            `src="${webviewUri}/assets/`
        );
        html = html.replace(
            /from "\/src\//g,
            `from "${webviewUri}/assets/`
        );

        // Add CSP meta tag for VS Code webview
        html = html.replace(
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\';">',
            `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src ${this._panel.webview.cspSource} 'unsafe-inline';">`
        );

        return html;
    }

    public dispose() {
        TableDataPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
