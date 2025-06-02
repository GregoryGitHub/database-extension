import * as vscode from 'vscode';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, onSubmit: (data: any) => void) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlContent();
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'submitConnection':
                        onSubmit(message.data);
                        this._panel.dispose();
                        return;
                    case 'cancel':
                        this._panel.dispose();
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, onSubmit: (data: any) => void) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConnectionFormPanel.currentPanel) {
            ConnectionFormPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'databaseConnection',
            'Add Database Connection',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ConnectionFormPanel.currentPanel = new ConnectionFormPanel(panel, onSubmit);
    }

    private _getHtmlContent(): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    padding: 20px;
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                }
                input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 2px;
                }
                .buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .primary {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
            </style>
        </head>
        <body>
            <form id="connectionForm">
                <div class="form-group">
                    <label for="name">Connection Name:</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="host">Host:</label>
                    <input type="text" id="host" name="host" value="localhost" required>
                </div>
                <div class="form-group">
                    <label for="port">Port:</label>
                    <input type="number" id="port" name="port" value="5432" required>
                </div>
                <div class="form-group">
                    <label for="database">Database:</label>
                    <input type="text" id="database" name="database" required>
                </div>
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div class="buttons">
                    <button type="button" class="secondary" onclick="cancel()">Cancel</button>
                    <button type="submit" class="primary">Connect</button>
                </div>
            </form>
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('connectionForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const data = {
                        name: formData.get('name'),
                        host: formData.get('host'),
                        port: parseInt(formData.get('port')),
                        database: formData.get('database'),
                        username: formData.get('username'),
                        password: formData.get('password')
                    };
                    vscode.postMessage({
                        command: 'submitConnection',
                        data
                    });
                });

                function cancel() {
                    vscode.postMessage({ command: 'cancel' });
                }
            </script>
        </body>
        </html>`;
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
