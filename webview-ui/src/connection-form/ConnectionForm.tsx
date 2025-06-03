import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '../shared/components';
import { useVSCodeAPI } from '../shared/hooks/useVSCodeAPI';
import { useMessageListener } from '../shared/hooks/useMessageListener';
import { validateConnectionForm } from '../shared/utils';
import type { 
  ConnectionFormData, 
  ConnectionTestResult, 
  WebviewMessage,
  ConnectionFormState 
} from '../shared/types';

const initialFormData: ConnectionFormData = {
  name: '',
  host: 'localhost',
  port: 5432,
  database: '',
  username: '',
  password: '',
  ssl: false
};

export function ConnectionForm() {
  const [formData, setFormData] = useState<ConnectionFormData>(initialFormData);
  const [state, setState] = useState<ConnectionFormState>({
    isLoading: false,
    testResult: null,
    savedConnections: []
  });
  const [errors, setErrors] = useState<string[]>([]);
  const { postMessage, getState, setState: setVSCodeState } = useVSCodeAPI();

  // Load saved state on mount
  useEffect(() => {
    const savedState = getState();
    if (savedState) {
      if (savedState.formData) setFormData(savedState.formData);
      if (savedState.state) setState(savedState.state);
    }
    
    // Request saved connections
    postMessage({ type: 'getConnections' });
  }, [getState, postMessage]);

  // Save state when it changes
  useEffect(() => {
    setVSCodeState({ formData, state });
  }, [formData, state, setVSCodeState]);

  // Handle messages from extension
  useMessageListener((message: WebviewMessage) => {
    switch (message.type) {
      case 'testConnection':
        const testResult = message.payload as ConnectionTestResult;
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          testResult 
        }));
        break;
        
      case 'getConnections':
        setState(prev => ({ 
          ...prev, 
          savedConnections: message.payload || [] 
        }));
        break;
        
      case 'saveConnection':
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          savedConnections: message.payload || []
        }));
        // Reset form after successful save
        if (message.payload?.success) {
          setFormData(initialFormData);
          setErrors([]);
        }
        break;
    }
  });

  const handleInputChange = (field: keyof ConnectionFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number'
      ? parseInt(e.target.value) || 0
      : e.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
    
    // Clear test result when form changes
    if (state.testResult) {
      setState(prev => ({ ...prev, testResult: null }));
    }
  };

  const handleTestConnection = () => {
    const validationErrors = validateConnectionForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, testResult: null }));
    postMessage({ 
      type: 'testConnection', 
      payload: formData 
    });
  };

  const handleSaveConnection = () => {
    const validationErrors = validateConnectionForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    postMessage({ 
      type: 'saveConnection', 
      payload: formData 
    });
  };

  const handleLoadConnection = (connection: ConnectionFormData) => {
    setFormData(connection);
    setErrors([]);
    setState(prev => ({ ...prev, testResult: null }));
  };

  const handleDeleteConnection = (connectionName: string) => {
    postMessage({ 
      type: 'deleteConnection', 
      payload: { name: connectionName } 
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Saved Connections */}
      {state.savedConnections.length > 0 && (
        <Card title="Saved Connections">
          <div className="space-y-2">
            {state.savedConnections.map((connection) => (
              <div 
                key={connection.name}
                className="flex items-center justify-between p-3 border border-[var(--vscode-input-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]"
              >
                <div>
                  <div className="font-medium">{connection.name}</div>
                  <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                    {connection.host}:{connection.port}/{connection.database}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleLoadConnection(connection)}
                  >
                    Load
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleDeleteConnection(connection.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Connection Form */}
      <Card title="Database Connection">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Connection Name */}
          <Input
            label="Connection Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="My Database Connection"
            required
          />

          {/* Host and Port */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Host"
                value={formData.host}
                onChange={handleInputChange('host')}
                placeholder="localhost"
                required
              />
            </div>
            <Input
              label="Port"
              type="number"
              value={formData.port.toString()}
              onChange={handleInputChange('port')}
              placeholder="5432"
              required
            />
          </div>

          {/* Database */}
          <Input
            label="Database"
            value={formData.database}
            onChange={handleInputChange('database')}
            placeholder="mydb"
            required
          />

          {/* Username and Password */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username"
              value={formData.username}
              onChange={handleInputChange('username')}
              placeholder="postgres"
              required
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="password"
            />
          </div>

          {/* SSL */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ssl"
              checked={formData.ssl}
              onChange={handleInputChange('ssl')}
              className="rounded border-[var(--vscode-input-border)]"
            />
            <label htmlFor="ssl" className="text-sm">
              Use SSL
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-[var(--vscode-inputValidation-errorBackground)] border border-[var(--vscode-errorForeground)] rounded">
              <ul className="text-sm text-[var(--vscode-errorForeground)] space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Result */}
          {state.testResult && (
            <div className={`p-3 rounded border ${
              state.testResult.success
                ? 'bg-[var(--vscode-inputValidation-infoBackground)] border-[var(--vscode-charts-green)] text-[var(--vscode-charts-green)]'
                : 'bg-[var(--vscode-inputValidation-errorBackground)] border-[var(--vscode-errorForeground)] text-[var(--vscode-errorForeground)]'
            }`}>
              <div className="text-sm font-medium">
                {state.testResult.success ? '✓ Connection successful!' : '✗ Connection failed'}
              </div>
              {state.testResult.message && (
                <div className="text-sm mt-1">{state.testResult.message}</div>
              )}
              {state.testResult.error && (
                <div className="text-sm mt-1 font-mono">{state.testResult.error}</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleTestConnection}
              isLoading={state.isLoading}
              disabled={state.isLoading}
            >
              Test Connection
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveConnection}
              isLoading={state.isLoading}
              disabled={state.isLoading || !state.testResult?.success}
            >
              Save Connection
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
