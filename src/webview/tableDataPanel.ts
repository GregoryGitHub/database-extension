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
        
        // Load initial data
        this._loadTableData();
        
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeQuery':
                        await this._executeQuery(message.query);
                        return;
                    case 'loadTableData':
                        await this._loadTableData();
                        return;
                }
            },
            undefined,
            this._disposables
        );
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
                retainContextWhenHidden: true
            }
        );

        TableDataPanel.currentPanel = new TableDataPanel(panel, tableInfo, extensionUri);
    }

    private async _loadTableData(): Promise<void> {
        try {
            const query = `SELECT * FROM "${this._tableInfo.schema}"."${this._tableInfo.name}" LIMIT 200`;
            await this._executeQuery(query);
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async _executeQuery(query: string): Promise<void> {
        try {
            const client = new Client({
                host: this._tableInfo.connection.host,
                port: this._tableInfo.connection.port,
                database: this._tableInfo.connection.database,
                user: this._tableInfo.connection.username,
                password: this._tableInfo.connection.password
            });

            await client.connect();
            
            const result = await client.query(query);
            
            await client.end();

            this._panel.webview.postMessage({
                command: 'queryResult',
                data: {
                    columns: result.fields.map(field => field.name),
                    rows: result.rows,
                    rowCount: result.rowCount
                }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }    private _getHtmlContent(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'html', 'tableData.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Replace placeholders with actual values
        const defaultQuery = `SELECT * FROM "${this._tableInfo.schema}"."${this._tableInfo.name}" LIMIT 200;`;
        htmlContent = htmlContent
            .replace(/{{SCHEMA}}/g, this._tableInfo.schema)
            .replace(/{{TABLE}}/g, this._tableInfo.name)
            .replace(/{{DEFAULT_QUERY}}/g, defaultQuery);
            
        return htmlContent;
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
