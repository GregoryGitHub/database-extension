import React from 'react';
import ReactDOM from 'react-dom/client';
import { TableDataPanel } from './TableDataPanel';
import '../shared/styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <TableDataPanel />
  </React.StrictMode>
);
