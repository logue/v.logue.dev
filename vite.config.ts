import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv, type UserConfig } from 'vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import glsl from 'vite-plugin-glsl';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import vueDevTools from 'vite-plugin-vue-devtools';

import pkg from './package.json';

/**
 * Vite Configure
 *
 * @see {@link https://vitejs.dev/config/}
 */
export default defineConfig(({ command, mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd());
  const buildDate = new Date().toISOString();

  const config: UserConfig = {
    // https://vitejs.dev/config/shared-options.html#base
    base: './',
    // https://vitejs.dev/config/shared-options.html#define
    define: {
      'process.env': {},
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(buildDate)
    },
    plugins: [
      // Vue3
      vue(),
      vueDevTools(),
      // vite-plugin-checker
      // https://github.com/fi3ework/vite-plugin-checker
      checker({
        typescript: true
        // vueTsc: true,
        // eslint: { lintCommand: 'eslint' },
        // stylelint: { lintCommand: 'stylelint' },
      }),
      // Cloudflare Workers (dev only: provides miniflare bindings via vite dev server)
      // Excluded during build to avoid adding Workers Assets config that conflicts with Pages projects.
      ...(command === 'serve' ? [cloudflare()] : []),
      glsl(),
      obfuscatorPlugin({
        // このプラグインを使うとより強固な難読化が行われ、開発ツールをクラッシュさせることができる。 --- IGNORE ---
        // 本来は解析を困難にするためのものだが、今回は演出として使用した。 --- IGNORE ---
        // Using this plugin provides stronger obfuscation and can crash dev tools. --- IGNORE ---
        // Originally intended to make analysis more difficult, but in this case used for performance. --- IGNORE ---
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
          domainLockRedirectUrl: 'https://github.com/logue/v.logue.dev/issues',
          selfDefending: true
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
      // https://vitejs.dev/config/build-options.html#build-target
      target: 'esnext',
      // Minify option
      // https://vitejs.dev/config/build-options.html#build-minify
      minify: 'esbuild',
      // Rollup Options
      // https://vitejs.dev/config/build-options.html#build-rollupoptions
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // Split external library from transpiled code.
            if (id.includes('/node_modules/vuetify') || id.includes('/node_modules/@mdi')) {
              // Split Vuetify before vue.
              return 'vuetify';
            }
            if (
              id.includes('/node_modules/@vue/') ||
              id.includes('/node_modules/vue') ||
              id.includes('/node_modules/pinia') ||
              id.includes('/node_modules/destr/') || // pinia-plugin-persistedstate uses destr.
              id.includes('/node_modules/deep-pick-omit/') // pinia-plugin-persistedstate uses deep-pick-omit.
            ) {
              // Combine Vue and Pinia into a single chunk.
              // This is because Pinia is a state management library for Vue.
              return 'vue';
            }

            return 'vendor';
          },
          plugins: [
            mode === 'analyze'
              ? // rollup-plugin-visualizer
                // https://github.com/btd/rollup-plugin-visualizer
                visualizer({
                  open: true,
                  filename: 'dist/stats.html'
                })
              : undefined
          ]
        }
      }
    },
    esbuild: {
      // Drop console when production build.
      drop: command === 'serve' ? [] : ['console']
    }
  };

  return config;
});
