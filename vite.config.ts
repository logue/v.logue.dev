import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, type UserConfig } from 'vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { checker } from 'vite-plugin-checker';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }): UserConfig => {
  return {
    plugins: [
      // Vue 3
      vue(),
      // Vue DevTools
      vueDevTools(),
      // TypeScript checker
      // https://github.com/fi3ework/vite-plugin-checker
      checker({ typescript: true }),
      // Cloudflare Workers (dev only: provides miniflare bindings via vite dev server)
      // Excluded during build to avoid adding Workers Assets config that conflicts with Pages projects.
      ...(command === 'serve' ? [cloudflare()] : []),
      obfuscatorPlugin({
        include: ['src/**/*.ts', 'src/**/*.vue'],
        exclude: [/node_modules/, /polyfill/],
        apply: 'build',
        debugger: false,
        /**
         * Obfuscation options
         *
         * @see {@link https://github.com/javascript-obfuscator/javascript-obfuscator#preset-options}
         */
        options: {
          optionsPreset: 'default',
          debugProtection: true,
          debugProtectionInterval: 4000,
          domainLock: mode === 'deploy' ? ['v.logue.dev'] : ['localhost'], // リリース時以外はローカルでのみ
          // domainLockRedirectUrl: 'https://v.logue.dev/contact',
          selfDefending: true,
          stringArrayEncoding: ['base64']
        }
      })
    ],
    // Resolver
    resolve: {
      // https://vitejs.dev/config/shared-options.html#resolve-alias
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./node_modules', import.meta.url))
      },
      extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
    },
    // Build Options
    // https://vitejs.dev/config/build-options.html
    build: {
      // Build Target
      target: 'esnext',
      // Minify option
      minify: 'esbuild',
      // Rollup Options
      // https://vitejs.dev/config/build-options.html#build-rollupoptions
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const chunkConfigs = [
              {
                // Combine Vue and Pinia into a single chunk.
                // This is because Pinia is a state management library for Vue.

                name: 'vue',
                patterns: [
                  '/node_modules/@vue/',
                  '/node_modules/vue',
                  '/node_modules/pinia',
                  '/node_modules/destr/', // pinia-plugin-persistedstate uses destr.
                  '/node_modules/deep-pick-omit/' // pinia-plugin-persistedstate uses deep-pick-omit.
                ]
              },
              {
                // Combine Three.js and VRM into a single chunk.
                // This is because VRM is a 3D model format for Three.js.
                name: 'three',
                patterns: ['/node_modules/three/', '/node_modules/@pixiv/three-vrm']
              }
            ];

            for (const config of chunkConfigs) {
              if (config.patterns.some(pattern => id.includes(pattern))) {
                return config.name;
              }
            }

            if (id.includes('/node_modules/')) {
              return 'vendor';
            }
          }
        }
      }
    },
    esbuild: {
      // Drop console when production build.
      drop: command === 'serve' ? [] : ['console']
    }
  };
});
