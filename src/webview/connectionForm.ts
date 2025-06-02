import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private readonly _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, onSubmit: (data: any) => Promise<void>) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.webview.html = this._getHtmlContent();
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'submitConnection':
                        try {
                            console.log('Webview received connection data:', message.data);
                            await onSubmit(message.data);
                            this._panel.dispose();
                        } catch (error) {
                            console.error('Error submitting connection:', error);
                            // Send error back to webview
                            this._panel.webview.postMessage({
                                command: 'connectionError',
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        return;
                    case 'cancel':
                        this._panel.dispose();
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }    public static createOrShow(extensionUri: vscode.Uri, onSubmit: (data: any) => Promise<void>) {
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

        ConnectionFormPanel.currentPanel = new ConnectionFormPanel(panel, extensionUri, onSubmit);
    }    private _getHtmlContent(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'html', 'connectionForm.html');
        return fs.readFileSync(htmlPath, 'utf8');
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
