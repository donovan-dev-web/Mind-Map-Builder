import React from 'react';
  console.log("TAURI_IPC?", (window as any).__TAURI_IPC__);

    import ReactDOM from 'react-dom/client';
    import App from './App'; 
    import './app/globals.css';

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );