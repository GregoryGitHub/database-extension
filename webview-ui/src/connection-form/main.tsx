import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConnectionForm } from './ConnectionForm';
// Import CSS for VS Code theming
import '../shared/styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ConnectionForm />
  </React.StrictMode>
);
