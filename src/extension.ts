import * as vscode from 'vscode';
import { ConnectionTreeProvider, DatabaseConnection, TableTreeItem, ConnectionManager } from './database/connectionManager';
import { ConnectionFormPanel } from './webview/connectionForm';
import { TableDataPanel } from './webview/tableDataPanel';

export function activate(context: vscode.ExtensionContext) {
    // Show activation message
    vscode.window.showInformationMessage('Database Manager extension is now active!');

    const connectionManager = new ConnectionManager(context);
    const connectionProvider = new ConnectionTreeProvider();
    
    // Register the tree view
    vscode.window.createTreeView('databaseConnections', {
        treeDataProvider: connectionProvider
    });

    // Command to add a new connection
    context.subscriptions.push(
        vscode.commands.registerCommand('database-manager.addConnection', () => {
            console.log('Add connection command triggered');
            ConnectionFormPanel.createOrShow(context.extensionUri, connectionManager);
        })
    );

    // Command to remove a connection
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
                    await connectionManager.deleteConnection(item.connection.name);
                    await connectionProvider.removeConnection(item.connection.id);
                }
            }
        })
    );

    // Command to view table data
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
