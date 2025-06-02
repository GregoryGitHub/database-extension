import * as vscode from 'vscode';
import { ConnectionTreeProvider, DatabaseConnection, TableTreeItem } from './database/connectionManager';
import { ConnectionFormPanel } from './webview/connectionForm';
import { TableDataPanel } from './webview/tableDataPanel';

export function activate(context: vscode.ExtensionContext) {
    // Mostra mensagem de ativação
    vscode.window.showInformationMessage('Database Manager extension is now active!');

    const connectionProvider = new ConnectionTreeProvider();
    
    // Registra a view
    vscode.window.createTreeView('databaseConnections', {
        treeDataProvider: connectionProvider
    });    // Comando para adicionar uma nova conexão
    context.subscriptions.push(
        vscode.commands.registerCommand('database-manager.addConnection', () => {
            console.log('Add connection command triggered');
            ConnectionFormPanel.createOrShow(context.extensionUri, async (data: Omit<DatabaseConnection, 'id'>) => {
                console.log('Form data received:', data);
                const connection: DatabaseConnection = {
                    id: Date.now().toString(),
                    ...data
                };

                try {
                    await connectionProvider.addConnection(connection);
                } catch (error) {
                    // Erro já é tratado no addConnection
                    console.error('Error in command handler:', error);
                }
            });
        })
    );    // Comando para remover uma conexão
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
                    await connectionProvider.removeConnection(item.connection.id);
                }
            }
        })
    );

    // Comando para visualizar dados da tabela
    context.subscriptions.push(
        vscode.commands.registerCommand('database-manager.viewTableData', (tableItem: TableTreeItem) => {
            if (tableItem) {
                TableDataPanel.createOrShow(context.extensionUri, {
                    name: tableItem.name,
                    schema: tableItem.schema,
                    connection: tableItem.connection
                });
            }
        })
    );
}

export function deactivate() {}
