<script setup lang="ts">
import { shallowRef } from 'vue';

// 画像はインポートして URL を得るスタイル。 --IGNORE
// Images are imported to get their URLs. --IGNORE
import bgsrc from '@/assets/bg.jpeg';
import AreaFooter from '@/components/AreaFooter.vue';
import AreaHeader from '@/components/AreaHeader.vue';
import AudioToast from '@/components/AudioToast.vue';
import LayerElfCode from '@/components/LayerElfCode.vue';
import LayerGlitch from '@/components/LayerGlitch.vue';
import LayerScanline from '@/components/LayerScanline.vue';
import PageCover from '@/components/PageCover.vue';
import { useAppStore } from '@/stores/useAppStore';

const store = useAppStore();

// カバーの表示フラグ。最初は当然 true。自明すぎてコメントするのも虚しい。 --IGNORE
// Cover visibility flag. Obviously true at first. Too obvious to comment on, yet here we are. --IGNORE
const coverVisible = shallowRef(true);

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
    :ready="store.isReady"
    audio="speaking anything ya (loop).ogg"
    @loaded="store.initAudio"
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
