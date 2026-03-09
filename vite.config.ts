import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Make Vite-injected CSS non-render-blocking by deferring load
function deferCssPlugin(): Plugin {
  return {
    name: 'defer-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        '<link rel="preload" as="style" crossorigin href="$1" onload="this.rel=\'stylesheet\'">' +
        '<noscript><link rel="stylesheet" crossorigin href="$1"></noscript>'
      );
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['host.docker.internal'],
  },
  plugins: [tailwindcss(), react(), deferCssPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    modulePreload: {
      // Only preload direct imports, not all transitive deps
      resolveDependencies: (_url, _deps, _context) => [],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast-') || id.includes('node_modules/micromark') || id.includes('node_modules/hast-')) {
            return 'vendor-markdown';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
});
