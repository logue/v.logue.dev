<script setup lang="ts">
import SocialLinks from '@/components/SocialLinks.vue';
import VrmCanvas from '@/components/VrmCanvas.vue';

const api = `/api/vrm/${import.meta.env.VITE_VROID_AVATAR_ID}`;

const accomplishments = [
  { id: 'OSS', label: 'VUE-CODEMIRROR6', detail: '1.8M+ DL/YR' },
  { id: 'L10N', label: 'FIRESTORM_OFFICIAL', detail: 'JP_STAFF' },
  { id: 'ARCH', label: 'OUTCOME_DRIVEN', detail: 'TOP_DOWN' }
] satisfies { id: string; label: string; detail: string }[];
</script>

<template>
  <h1 class="display-1 mb-4 text-center glitch-text font-lubri">LOGUE.DEV</h1>
  <p class="lead mb-3 text-center">
    EXPERIENCE-DRIVEN INVERSION:
    <br />
    REVERSE-ENGINEERING THE STACK TO MANIFEST THE IDEAL UX.
  </p>

  <VrmCanvas :api="api" />

  <div class="row mt-3 mx-auto py-4">
    <div
      v-for="item in accomplishments"
      :key="item.id"
      class="col card border-start border-info border-2"
    >
      <div class="card-header font-lubri opacity-50">[{{ item.id }}]</div>
      <div class="card-body">
        <div class="fw-bold">{{ item.label }}</div>
        <div class="small opacity-75">{{ item.detail }}</div>
      </div>
    </div>
  </div>

  <SocialLinks />
  <!-- どうでもいいけど、bootstrap のクラス名の順番も tailwind みたく、 linter で整形できるようにしてほしいね。 --- IGNORE -->
  <!-- This is irrelevant, but I wish Bootstrap's class names could be formatted with a linter, like Tailwind's. --- IGNORE -->
</template>

<style scoped>
.glitch-text:hover {
  animation: glitch-anim 0.3s infinite;
  color: var(--arasaka-red);
  text-shadow:
    2px 0 var(--hud-cyan),
    -2px 0 var(--arasaka-red);
}

@keyframes glitch-anim {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
  100% {
    transform: translate(0);
  }
}
</style>
