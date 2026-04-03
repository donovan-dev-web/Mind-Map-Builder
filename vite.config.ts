    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';
    import path from 'path';

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      optimizeDeps: {
      include: [
          "@tauri-apps/api",
          "@tauri-apps/api/dialog",
          "@tauri-apps/api/fs",
          "@tauri-apps/api/path",
          "@tauri-apps/api/window"
        ],
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
    });
