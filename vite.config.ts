import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'pdf-vendor': ['react-pdf', 'pdfjs-dist', 'pdf-lib'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['zustand', 'isomorphic-dompurify'],
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Optimize bundle size
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // Enable compression
    cssCodeSplit: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-pdf',
      'pdfjs-dist',
      '@supabase/supabase-js',
      'zustand',
      'isomorphic-dompurify'
    ],
    exclude: ['pdf-lib'] // Large library that should be loaded on demand
  },
  // Enable asset inlining for small files
  assetsInclude: ['**/*.woff2', '**/*.woff'],
})
