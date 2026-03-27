<script setup lang="ts">
import { ref } from 'vue';

import AreaFooter from './components/AreaFooter.vue';
import AreaHeader from './components/AreaHeader.vue';
import AudioToast from './components/AudioToast.vue';
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

// オーディオとVRM両方の準備状況をトラッキング。
// オーディオロード完了フラグ。
// Audio loaded flag.
const audioReady = ref(false);

const onAudioLoaded = async (audio: ArrayBuffer) => {
  // オーディオだけ受け取る。VRM はもう VrmCanvas が自分でやってる。
  // Only receiving audio. VRM is already handling itself in VrmCanvas.
  await store.initAudio(audio);
  audioReady.value = true;
};

const onAccess = () => {
  // ユーザー操作のコンテキストで start() する。iOS の AudioContext 解放もここで行われる。
  // Call start() within user gesture context. This is also where iOS AudioContext gets unlocked.
  store.startAudio();
  coverVisible.value = false;
};
</script>

<template>
  <PageCover
    v-if="coverVisible"
    audio="speaking anything ya (loop).ogg"
    :ready="audioReady && store.vrmReady"
    @loaded="onAudioLoaded"
    @access="onAccess"
  />
  <!-- 全ページ共通のカバー。ここで ACCESS してもらう。 -->
  <!-- オーディオと VRM 両方の準備完了まで ACCESS ボタンは無効化される。 -->
  <!-- App-wide cover. The user grants ACCESS here. -->
  <!-- ACCESS button is disabled until both audio and VRM are ready. -->

  <LayerGlitch :bgsrc="bgsrc" />
  <LayerElfCode />
  <LayerScanline />
  <!-- 実はスタイルシートじゃなくレイヤー --IGNORE -->
  <!-- Actually, it's a layer, not a stylesheet --IGNORE -->

  <div class="d-flex flex-column min-vh-100 z-1">
    <AreaHeader />
    <main class="flex-grow-1 container py-5">
      <RouterView />
    </main>
    <AreaFooter />
  </div>

  <AudioToast />
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
