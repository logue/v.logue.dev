/**
 * [SYSTEM_PROLOGUE]
 * * "As you can see, we've had our eye on you for some time now, Mr. Anderson."
 * 「おはよう、アンダーソンくん。ご覧の通り、君をずっと監視していたよ」
 * * "You've been living two lives."
 * 「君は二つの生活を送っているようだが、その一方には未来がある。だがもう一方には……ない」
 * * -----------------------------------------------------------------------
 * [CAUTION]
 * This system is designed to maintain its own integrity.
 * If you attempt to observe the internal logic (DevTools),
 * the 'Savior Protocol' will initiate a forced termination.
 * -----------------------------------------------------------------------
 */
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { addCollection } from '@iconify/vue';
// Bundle Iconify icon sets for offline use
import faIcons from '@iconify-json/fa/icons.json';
import fa6BrandsIcons from '@iconify-json/fa6-brands/icons.json';

import App from './App.vue';
import router from './router';
import './styles/fonts.css';
import './styles/bootstrap.scss';

addCollection(faIcons);
addCollection(fa6BrandsIcons);

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
