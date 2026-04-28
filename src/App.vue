<script setup lang="ts">
import { ref } from 'vue';

import AreaFooter from './components/AreaFooter.vue';
import AreaHeader from './components/AreaHeader.vue';
import AudioToast from './components/AudioToast.vue';
import LayerElfCode from './components/LayerElfCode.vue';
import LayerGlitch from './components/LayerGlitch.vue';
import LayerScanline from './components/LayerScanline.vue';
import PageCover from './components/PageCover.vue';

// 画像はインポートして URL を得るスタイル。パラメータはスタイルシートでも流用。 --IGNORE
// Images are imported to get their URLs. The parameter is also used in stylesheets. --IGNORE
import bgsrc from '@/assets/bg.jpeg';
import { useAppStore } from '@/stores/useAppStore';

const store = useAppStore();

// カバーの表示フラグ。最初は当然 true。自明すぎてコメントするのも虚しい。 --IGNORE
// Cover visibility flag. Obviously true at first. Too obvious to comment on, yet here we are. --IGNORE
const coverVisible = ref(true);

// オーディオとVRM両方の準備状況をトラッキング。 --IGNORE
// Audio loaded flag. Tracking the readiness of both audio and VRM. --IGNORE
const audioReady = ref(false);

const onAudioLoaded = async (audio: ArrayBuffer) => {
  // オーディオだけ受け取る。VRM はもう VrmCanvas.vue が自分でやってる。 --IGNORE
  // Only receiving audio. VRM is already handling itself in VrmCanvas.vue. --IGNORE
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
    :ready="audioReady && store.vrmReady"
    audio="speaking anything ya (loop).ogg"
    @loaded="onAudioLoaded"
    @access="onAccess"
  />
  <!-- 全ページ共通のカバー。ここで ACCESS してもらう。 --IGNORE -->
  <!-- オーディオと VRM 両方の準備完了まで ACCESS ボタンは無効化される。 --IGNORE-->
  <!-- App-wide cover. The user grants ACCESS here. --IGNORE -->
  <!-- ACCESS button is disabled until both audio and VRM are ready.  --IGNORE -->

  <LayerGlitch :bgsrc="bgsrc" />
  <LayerElfCode />
  <LayerScanline />
  <!-- 実はスタイルシートじゃなくレイヤー --IGNORE -->
  <!-- Actually, it's a layer, not a stylesheet --IGNORE -->

  <div class="d-flex flex-column min-vh-100 z-1">
    <AreaHeader />
    <main class="flex-grow-1 container py-5">
      <RouterView />
      <!-- ここに本文が入る。Vue使った事がある人間なら自明の理だよな？ --IGNORE -->
      <!-- The main content goes here. If you've used Vue before, this is self-explanatory, right? --IGNORE -->
    </main>
    <AreaFooter />
  </div>

  <!-- オーディオトーストは全ページ共通で表示。 --IGNORE -->
  <!-- Audio toast is displayed across all pages. --IGNORE -->
  <AudioToast />
</template>

<style scoped lang="scss">
@import './styles/bootstrap';

body {
  background-image: url(bgsrc);
}
</style>
