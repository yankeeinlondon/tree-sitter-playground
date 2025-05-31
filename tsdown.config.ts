import { defineConfig } from 'tsdown';

export default defineConfig([
  // Extension backend
  {
    entry: 'src/extension.ts',
    outDir: 'dist',
    format: ['cjs'],
    platform: 'node',
    dts: false,
    clean: true,
    sourcemap: true,
    external: ['vscode'],
    outExtensions: () => ({
        js: ".cjs"
    })
  },
  // Webview frontend
  {
    entry: 'src/webview/webviewScript.ts',
    outDir: 'dist',
    format: ['esm'],
    platform: 'browser',
    dts: false,
    clean: false,
    sourcemap: true,
    outExtensions: () => ({
        js: ".js"
    })
    // Note: CSS/fonts must be copied separately if needed
  },
  {
    entry: 'test/**/*.test.ts',
    outDir: 'dist/test',
    format: ["cjs"],
    platform: "browser",
    dts: false,
    clean: false,
    sourcemap: true,
    external: [
        "assert",
        "vscode"
    ],
    outExtensions: () => ({
        js: ".cjs"
    })
  }
  
]);
