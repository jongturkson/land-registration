import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: [
      // Workaround for a rolldown (Vite 8) false "missing export" on the
      // colorManipulator re-exports of @mui/system's ESM barrel when
      // @mui/x-data-grid is in the module graph. Pointing the bare import at
      // the CJS entry lets rolldown's interop expose every named export.
      {
        find: /^@mui\/system$/,
        replacement: path.resolve(__dirname, 'node_modules/@mui/system/index.js'),
      },
    ],
  },
});
