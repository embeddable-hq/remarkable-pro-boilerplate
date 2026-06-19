import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boilerplateNodeModules = path.resolve(__dirname, '../node_modules');
const boilerplateRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    alias: {
      // Force a single React instance
      'react': path.join(boilerplateNodeModules, 'react'),
      'react-dom': path.join(boilerplateNodeModules, 'react-dom'),
      'react/jsx-runtime': path.join(boilerplateNodeModules, 'react/jsx-runtime'),
      // @real/react → the actual ESM file (used by react-shim.ts to call through)
      '@real/react': path.join(boilerplateNodeModules, '@embeddable.com/react/lib/index.esm.js'),
      // @embeddable.com/react → shim that captures defineComponent calls
      '@embeddable.com/react': path.resolve(__dirname, 'src/shims/react-shim.ts'),
      '@embeddable.com/core': path.join(boilerplateNodeModules, '@embeddable.com/core'),
      '@embeddable.com/remarkable-pro': path.join(boilerplateNodeModules, '@embeddable.com/remarkable-pro'),
      '@embeddable.com/remarkable-ui': path.join(boilerplateNodeModules, '@embeddable.com/remarkable-ui'),
      '@embeddable.com/sdk-core': path.join(boilerplateNodeModules, '@embeddable.com/sdk-core'),
      '@embeddable.com/sdk-react': path.join(boilerplateNodeModules, '@embeddable.com/sdk-react'),
      // Allow sandbox to import from boilerplate src/
      '@boilerplate': boilerplateRoot,
    },
  },
  server: {
    port: 5210,
    proxy: {
      // Proxy build API calls to the build server
      '/api': {
        target: 'http://localhost:5211',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5210,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
  },
});
