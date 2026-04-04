<script setup lang="ts">
import { Icon } from '@iconify/vue';

import { useAppStore } from '@/stores/useAppStore';

const appStore = useAppStore();

/**
 * 再生/一時停止をトグルする
 * Toggle play/pause
 */
async function togglePlayback() {
  if (appStore.isAudioPlaying) {
    await appStore.pauseAudio();
  } else {
    await appStore.resumeAudio();
  }
}
</script>

<template>
  <div class="audio-toast-container position-fixed bottom-0 start-0 p-3">
    <section
      class="audio-toast d-flex align-items-center overflow-hidden border border-secondary shadow"
      aria-label="Audio controls"
    >
      <button
        class="audio-control btn btn-primary inline-flex align-items-center justify-content-center rounded-circle"
        type="button"
        :title="appStore.isAudioPlaying ? 'Pause' : 'Play'"
        @click="togglePlayback"
      >
        <Icon :icon="appStore.isAudioPlaying ? 'bi:pause-fill' : 'bi:play-fill'" />
      </button>
      <div class="audio-toast-content">
        <div class="audio-toast-header d-flex align-items-center" style="color: var(--arasaka-red)">
          <Icon icon="bi:music-note-beamed" class="me-2" />
          <strong class="me-auto">{{ appStore.isAudioPlaying ? 'NOW PLAYING' : 'PAUSED' }}</strong>
        </div>
        <div class="audio-toast-body overflow-hidden text-truncate">
          speaking anything ya
          <!-- 曲名がハードコーディングされているのは、自分が作曲者だからなのだ。-->
          <!-- The music title is hardcoded because I'm the composer. -->
          <!--eslint-disable-next-line vuejs-accessibility/anchor-has-content -->
          <a
            href="https://soundcloud.com/logue256/sets/bgm?si=5a4a228532a24e8c8ad96140f3d120b2&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing"
            target="_blank"
            rel="noopener noreferrer"
            class="ms-2 soundcloud-link"
            @click="appStore.pauseAudio()"
          >
            <Icon icon="simple-icons:soundcloud" class="ms-1" />
          </a>
        </div>
      </div>
    </section>
  </div>
  <!-- 音楽が再生されっぱなしなのは問題なので、再生/一時停止制御を実装。AudioManager の isPlaying で状態を追跡。 -->
  <!-- Since having music play indefinitely can be an issue, I've implemented play/pause controls. The AudioManager's isPlaying tracks the state. -->
</template>

<style scoped lang="scss">
.audio-toast-container {
  z-index: 1010;
}

.audio-toast {
  z-index: 1011;
  gap: 0.5rem;
  height: 3rem;
  width: 3rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--bs-light-rgb), 0.25);
  background: rgba(var(--bs-dark-rgb), 0.25);
  box-shadow: 0px 5px 15px 0px rgba(var(--bs-dark-rgb), 0.35);
  backdrop-filter: blur(6px);
  transition:
    width 0.24s ease,
    border-radius 0.24s ease,
    background-color 0.24s ease;

  // 普段はボタンだけ。必要になった時だけ情報を見せる。たぶん誰も本文は読んでない。
  // Only the button by default. Show details only when needed. Nobody reads the body anyway.
  &:hover,
  &:focus-within {
    width: min(22rem, calc(100vw - 2rem));
    border-radius: 0.75rem;
    background: rgba(var(--bs-dark-rgb), 0.5);
  }
}

.audio-control {
  width: 3rem;
  min-width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  box-shadow: 0px 5px 15px 0px rgba(var(--bs-dark-rgb), 0.35);
}

.audio-toast-content {
  min-width: 0;
  flex: 1;
  opacity: 0;
  transform: translateX(-0.25rem);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.audio-toast:hover .audio-toast-content,
.audio-toast:focus-within .audio-toast-content {
  opacity: 1;
  transform: translateX(0);
}

.audio-toast-body {
  color: var(--bs-light);
  white-space: nowrap;
}

.soundcloud-link {
  color: var(--bs-orange);
  opacity: 0.8;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
    color: var(--hud-cyan);
    transform: translateY(-3px);
    /* Chromatic aberration: blue ghost shifted left, red ghost shifted right */
    filter: drop-shadow(-0.5rem 0 0.05rem var(--color-ghost-blue)) /* 左：青 */
      drop-shadow(0.5rem 0 0.05rem var(--color-ghost-red)) /* 右：赤 */
      drop-shadow(0 0 8px var(--hud-cyan));
  }
}

@media (hover: none) {
  .audio-toast {
    width: min(22rem, calc(100vw - 2rem));
    border-radius: 0.75rem;
  }

  .audio-toast-content {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
