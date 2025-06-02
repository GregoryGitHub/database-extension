import * as vscode from 'vscode';
import { ConnectionTreeProvider, DatabaseConnection } from './database/connectionManager';
import { ConnectionFormPanel } from './webview/connectionForm';

export function activate(context: vscode.ExtensionContext) {
    // Mostra mensagem de ativação
    vscode.window.showInformationMessage('Database Manager extension is now active!');

    const connectionProvider = new ConnectionTreeProvider();
    
    // Registra a view
    vscode.window.createTreeView('databaseConnections', {
        treeDataProvider: connectionProvider
    });

    // Comando para adicionar uma nova conexão
    context.subscriptions.push(
        vscode.commands.registerCommand('database-manager.addConnection', () => {
            ConnectionFormPanel.createOrShow(context.extensionUri, async (data: Omit<DatabaseConnection, 'id'>) => {
                const connection: DatabaseConnection = {
                    id: Date.now().toString(),
                    ...data
                };

                try {
                    await connectionProvider.addConnection(connection);
                } catch (error) {
                    // Erro já é tratado no addConnection
                }
            });
        })
    );

    // Comando para remover uma conexão
    context.subscriptions.push(
        vscode.commands.registerCommand('database-manager.removeConnection', async (item) => {
            if (item && item.connection) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Are you sure you want to remove the connection '${item.connection.name}'?`,
                    { modal: true },
                    'Yes',
                    'No'
                );

                if (confirmed === 'Yes') {
                    connectionProvider.removeConnection(item.connection.id);
                }
            }
        })
    );
}

export function deactivate() {}
