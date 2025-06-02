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

export class TableTreeItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly schema: string
    ) {
        super(`${schema}.${name}`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${schema}.${name}`;
        this.iconPath = new vscode.ThemeIcon('table');
        this.contextValue = 'table';
    }
}

export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly connection: DatabaseConnection
    ) {
        super(connection.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `${connection.username}@${connection.host}:${connection.port}/${connection.database}`;
        this.iconPath = new vscode.ThemeIcon('database');
        this.contextValue = 'connection';
    }
}

export class ConnectionTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem | TableTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | TableTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | TableTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | TableTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private connections: DatabaseConnection[] = [];
    private tableCache: Map<string, TableTreeItem[]> = new Map();

    constructor() {
        this.loadConnections();
    }    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private loadConnections(): void {
        const config = vscode.workspace.getConfiguration('database-manager');
        const savedConnections = config.get<DatabaseConnection[]>('connections', []);
        this.connections = savedConnections;
        console.log('Loaded connections:', this.connections.length);
    }

    private async saveConnections(): Promise<void> {
        const config = vscode.workspace.getConfiguration('database-manager');
        await config.update('connections', this.connections, vscode.ConfigurationTarget.Global);
        console.log('Saved connections:', this.connections.length);
    }

    getTreeItem(element: ConnectionTreeItem | TableTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConnectionTreeItem | TableTreeItem): Promise<(ConnectionTreeItem | TableTreeItem)[]> {
        if (!element) {
            return this.connections.map(conn => new ConnectionTreeItem(conn));
        }

        if (element instanceof ConnectionTreeItem) {
            // Se já temos as tabelas em cache, retorna do cache
            if (this.tableCache.has(element.connection.id)) {
                return this.tableCache.get(element.connection.id) || [];
            }

            try {
                const client = new Client({
                    host: element.connection.host,
                    port: element.connection.port,
                    database: element.connection.database,
                    user: element.connection.username,
                    password: element.connection.password
                });

                await client.connect();

                // Busca todas as tabelas do banco
                const result = await client.query(`
                    SELECT table_schema, table_name 
                    FROM information_schema.tables 
                    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY table_schema, table_name
                `);

                await client.end();

                const tables = result.rows.map(row => 
                    new TableTreeItem(row.table_name, row.table_schema)
                );

                // Armazena em cache
                this.tableCache.set(element.connection.id, tables);

                return tables;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch tables: ${error instanceof Error ? error.message : String(error)}`);
                return [];
            }
        }

        return [];
    }    async addConnection(connection: DatabaseConnection): Promise<void> {
        try {
            console.log('Attempting to add connection:', connection.name);
            
            // Testa a conexão antes de adicionar
            const client = new Client({
                host: connection.host,
                port: connection.port,
                database: connection.database,
                user: connection.username,
                password: connection.password
            });

            console.log('Testing connection...');
            await client.connect();
            await client.end();
            console.log('Connection test successful');

            this.connections.push(connection);
            await this.saveConnections();
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${connection.name}' added successfully!`);
            console.log('Connection added successfully');
        } catch (error) {
            console.error('Failed to add connection:', error);
            vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }    async removeConnection(connectionId: string): Promise<void> {
        const index = this.connections.findIndex(conn => conn.id === connectionId);
        if (index !== -1) {
            const connection = this.connections[index];
            this.connections.splice(index, 1);
            // Remove as tabelas do cache
            this.tableCache.delete(connectionId);
            await this.saveConnections();
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${connection.name}' removed successfully!`);
        }
    }
}
