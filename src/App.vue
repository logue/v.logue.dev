<script setup lang="ts">
import { ref } from 'vue';

import AreaFooter from './components/AreaFooter.vue';
import AreaHeader from './components/AreaHeader.vue';
import LayerElfCode from './components/LayerElfCode.vue';
import LayerGlitch from './components/LayerGlitch.vue';
import LayerScanline from './components/LayerScanline.vue';
import PageCover from './components/PageCover.vue';

import bgsrc from '@/assets/bg.jpeg';
import { useAppStore } from '@/stores/useAppStore';

const store = useAppStore();

// カバーの表示フラグ。最初は当然 true。自明すぎてコメントするのも虚しい。
// Cover visibility flag. Obviously true at first. Too obvious to comment on, yet here we are.
const coverVisible = ref(true);

const onLoaded = async (audio: ArrayBuffer) => {
  // オーディオだけ受け取る。VRM はもう VrmCanvas が自分でやってる。
  // Only receiving audio. VRM is already handling itself in VrmCanvas.
  await store.initAudio(audio);
};

const onAccess = () => {
  // ユーザー操作のコンテキストで start() する。iOS の AudioContext 解放もここで行われる。
  // Call start() within user gesture context. This is also where iOS AudioContext gets unlocked.
  store.startAudio();
  coverVisible.value = false;
};
</script>

<template>
  <!-- 全ページ共通のカバー。ここで ACCESS してもらう。 -->
  <!-- App-wide cover. The user grants ACCESS here. -->
  <PageCover
    v-if="coverVisible"
    audio="speaking anything ya (loop).ogg"
    @loaded="onLoaded"
    @access="onAccess"
  />

  <LayerGlitch :bgsrc="bgsrc" />
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

body {
  background-image: url(bgsrc);
}

.font-lubri {
  font-family: var(--font-lubri), sans-serif;
}
</style>
