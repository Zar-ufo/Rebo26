import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

const releaseDownloads = [
  'Rebo26 Setup 1.0.0.exe',
  'Rebo26-Android.apk',
];

function copyReleaseDownloads() {
  return {
    name: 'copy-release-downloads',
    closeBundle() {
      const releaseDirectory = path.resolve(__dirname, 'release');
      const outputDirectory = path.resolve(__dirname, 'dist', 'release');
      mkdirSync(outputDirectory, { recursive: true });
      for (const fileName of releaseDownloads) {
        const source = path.join(releaseDirectory, fileName);
        // Release binaries are not committed to git, so skip any that are missing.
        if (!existsSync(source)) {
          console.warn(`[copy-release-downloads] Skipping missing file: release/${fileName}`);
          continue;
        }
        copyFileSync(source, path.join(outputDirectory, fileName));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyReleaseDownloads()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
