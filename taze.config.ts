import { defineConfig } from 'taze';

export default defineConfig({
  mode: 'major',
  include: ['/vite/', '/vitest/', '/vize/', '/oxlint/', '/oxfmt/'],
  write: true,
  recursive: true
});
