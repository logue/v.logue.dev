<script setup lang="ts">
import AreaFooter from './components/AreaFooter.vue';
import AreaHeader from './components/AreaHeader.vue';
import LayerElfCode from './components/LayerElfCode.vue';
import LayerGlitch from './components/LayerGlitch.vue';
import LayerScanline from './components/LayerScanline.vue';
</script>

<template>
  <LayerGlitch />
  <LayerElfCode />
  <LayerScanline />

  <div class="d-flex flex-column min-vh-100 z-1">
    <AreaHeader />
    <main class="flex-grow-1 container py-5">
      <RouterView />
    </main>
    <AreaFooter />
  </div>
  <!-- 実はスタイルシートじゃなくレイヤー --IGNORE -->
  <!-- Actually, it's a layer, not a stylesheet --IGNORE -->
</template>

<style lang="scss">
@import './styles/bootstrap';

.font-lubri {
  font-family: var(--font-lubri), sans-serif;
}
</style>
