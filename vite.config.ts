import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv, type UserConfig } from 'vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { checker } from 'vite-plugin-checker';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import vueDevTools from 'vite-plugin-vue-devtools';
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd());
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
      glsl(),
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
          debugProtection: env.VITE_DISABLE_DEVTOOLS !== 'false', // Crash DevTools
          debugProtectionInterval: 4000,
          domainLock: ['v.logue.dev', 'localhost'], // The script will not work if you place files on a domain not listed here.
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
      // Source map option
      sourcemap: false,
      // Rollup Options
      // https://vitejs.dev/config/build-options.html#build-rollupoptions
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            const chunkConfigs = [
              {
                // Combine Vue, Vue Router, and Pinia into a single chunk.
                name: 'vue',
                patterns: [
                  '/node_modules/@vue/',
                  '/node_modules/vue',
                  '/node_modules/vue-router',
                  '/node_modules/pinia',
                  '/node_modules/destr/', // pinia-plugin-persistedstate uses destr.
                  '/node_modules/deep-pick-omit/' // pinia-plugin-persistedstate uses deep-pick-omit.
                ]
              },
              {
                // Three.js core only.
                name: 'three',
                patterns: ['/node_modules/three/']
              },
              {
                // Pixiv VRM runtime + animation + fflate (VRM motion decompression).
                // Note: pattern covers both three-vrm and three-vrm-animation.
                name: 'three-vrm',
                patterns: ['/node_modules/@pixiv/three-vrm', '/node_modules/fflate']
              },
              {
                // Iconify Vue component (small runtime, separate from large icon data).
                name: 'icons',
                patterns: ['/node_modules/@iconify/']
              },
              {
                // FontAwesome 6 Brands icon set (large JSON data).
                name: 'icons-fa6-brands',
                patterns: ['/node_modules/@iconify-json/fa6-brands']
              },
              {
                // FontAwesome 4 icon set (large JSON data).
                name: 'icons-fa',
                patterns: ['/node_modules/@iconify-json/fa']
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
