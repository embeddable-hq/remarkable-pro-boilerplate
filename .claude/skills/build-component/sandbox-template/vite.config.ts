import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boilerplateNodeModules = path.resolve(__dirname, '../node_modules');
const boilerplateRoot = path.resolve(__dirname, '..');
const componentsDir = path.resolve(boilerplateRoot, 'src/embeddable.com/components');
const registryFile = path.resolve(__dirname, 'src/registry.ts');

/**
 * Auto-pickup for newly-added components.
 *
 * Components live in the boilerplate's src/embeddable.com/components/, which is
 * OUTSIDE the sandbox root — so Vite's dev server doesn't watch it for newly
 * ADDED files, and a freshly-created component won't appear until you restart.
 * (Edits to existing files already hot-reload fine; this is only about new ones.)
 *
 * This plugin watches that directory explicitly and reloads the page when a
 * .emb.ts is added or removed, re-running registry.ts's import.meta.glob so the
 * new component shows up on its own.
 */
function watchComponents(): Plugin {
  const isEmb = (f: string) => f.startsWith(componentsDir) && f.endsWith('.emb.ts');
  return {
    name: 'sandbox-watch-components',
    configureServer(server: ViteDevServer) {
      // The components dir is outside the sandbox root, so watch it explicitly.
      server.watcher.add(componentsDir);
      let timer: ReturnType<typeof setTimeout> | null = null;
      const reload = (file: string, action: string) => {
        if (!isEmb(file)) return;
        if (timer) clearTimeout(timer);
        // Debounce so a burst of fs events collapses into a single reload.
        timer = setTimeout(() => {
          // Invalidate registry.ts so its import.meta.glob re-evaluates against the
          // new file set, then reload the page to re-run discovery and re-render.
          for (const mod of server.moduleGraph.getModulesByFile(registryFile) ?? []) {
            server.moduleGraph.invalidateModule(mod);
          }
          server.ws.send({ type: 'full-reload' });
          server.config.logger.info(`[sandbox] component ${path.basename(file)} ${action} — reloading`);
        }, 120);
      };
      server.watcher.on('add', (f: string) => reload(f, 'added'));
      server.watcher.on('unlink', (f: string) => reload(f, 'removed'));
    },
  };
}

export default defineConfig({
  plugins: [react(), watchComponents()],
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
