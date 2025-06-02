import * as vscode from 'vscode';
import { Client } from 'pg';

export interface DatabaseConnection {
    id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(public readonly connection: DatabaseConnection) {
        super(connection.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${connection.username}@${connection.host}:${connection.port}/${connection.database}`;
        this.iconPath = new vscode.ThemeIcon('database');
    }
}

export class ConnectionTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private connections: DatabaseConnection[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<ConnectionTreeItem[]> {
        return Promise.resolve(this.connections.map(conn => new ConnectionTreeItem(conn)));
    }

    async addConnection(connection: DatabaseConnection): Promise<void> {
        try {
            // Testa a conexão antes de adicionar
            const client = new Client({
                host: connection.host,
                port: connection.port,
                database: connection.database,
                user: connection.username,
                password: connection.password
            });

            await client.connect();
            await client.end();

            this.connections.push(connection);
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${connection.name}' added successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    removeConnection(connectionId: string): void {
        const index = this.connections.findIndex(conn => conn.id === connectionId);
        if (index !== -1) {
            const connection = this.connections[index];
            this.connections.splice(index, 1);
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${connection.name}' removed successfully!`);
        }
    }
}
