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

app.use(router);

app.mount('#app');
