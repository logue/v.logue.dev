import { createRouter, createWebHistory } from 'vue-router';

import IndexPage from '@/pages/IndexPage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexPage
    }
  ]
});

export default router;

// ルーティングに関するコードはここに置いておく。 --- IGNORE ---
// 今のところトップページしか設定していなく、あまり意味がない。 --- IGNORE ---
// しかし、将来的にページが増えたときのために、ルーターは最初から設定しておくことにした。 --- IGNORE ---
// Routing code is kept here for now.
// Now I only have the index page, so it doesn't do much.
// But I set up the router from the start in case we add more pages in the future. --- IGNORE ---
