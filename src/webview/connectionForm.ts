import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConnectionManager } from '../database/connectionManager';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private readonly _extensionUri: vscode.Uri;
    private readonly _connectionManager: ConnectionManager;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, connectionManager: ConnectionManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._connectionManager = connectionManager;
        this._panel.webview.html = this._getHtmlContent();
        this._setupMessageHandling();
        
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private _setupMessageHandling() {
        this._panel.webview.onDidReceiveMessage(
            async message => {
                try {
                    switch (message.type) {
                        case 'testConnection':
                            await this._handleTestConnection(message.payload);
                            break;
                        case 'saveConnection':
                            await this._handleSaveConnection(message.payload);
                            break;
                        case 'getConnections':
                            await this._handleGetConnections();
                            break;
                        case 'deleteConnection':
                            await this._handleDeleteConnection(message.payload);
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

    private async _handleTestConnection(connectionData: any) {
        try {
            const result = await this._connectionManager.testConnection(connectionData);
            this._panel.webview.postMessage({
                type: 'testConnection',
                payload: {
                    success: true,
                    message: 'Connection successful!'
                }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'testConnection',
                payload: {
                    success: false,
                    message: 'Connection failed',
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    private async _handleSaveConnection(connectionData: any) {
        try {
            await this._connectionManager.saveConnection(connectionData);
            const connections = await this._connectionManager.getSavedConnections();
            this._panel.webview.postMessage({
                type: 'saveConnection',
                payload: {
                    success: true,
                    connections
                }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'saveConnection',
                payload: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    private async _handleGetConnections() {
        try {
            const connections = await this._connectionManager.getSavedConnections();
            this._panel.webview.postMessage({
                type: 'getConnections',
                payload: connections
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'getConnections',
                payload: []
            });
        }
    }

    private async _handleDeleteConnection(data: { name: string }) {
        try {
            await this._connectionManager.deleteConnection(data.name);
            const connections = await this._connectionManager.getSavedConnections();
            this._panel.webview.postMessage({
                type: 'getConnections',
                payload: connections
            });
        } catch (error) {
            console.error('Error deleting connection:', error);
        }
    }

    public static createOrShow(extensionUri: vscode.Uri, connectionManager: ConnectionManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConnectionFormPanel.currentPanel) {
            ConnectionFormPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'databaseConnection',
            'Database Connection',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui')
                ]
            }
        );

        ConnectionFormPanel.currentPanel = new ConnectionFormPanel(panel, extensionUri, connectionManager);
    }    private _getHtmlContent(): string {
        const webviewUri = this._panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview-ui')
        );

        const connectionFormHtmlPath = path.join(this._extensionUri.fsPath, 'out', 'webview-ui', 'connection-form.html');
        let html = fs.readFileSync(connectionFormHtmlPath, 'utf8');

        // Replace absolute asset paths with webview URIs
        html = html.replace(
            /src="\/assets\//g,
            `src="${webviewUri}/assets/`
        );
        html = html.replace(
            /href="\/assets\//g,
            `href="${webviewUri}/assets/`
        );

        // Update CSP meta tag for VS Code webview
        html = html.replace(
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\';">',
            `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src ${this._panel.webview.cspSource} 'unsafe-inline';">`
        );

        return html;
    }

    public dispose() {
        ConnectionFormPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
