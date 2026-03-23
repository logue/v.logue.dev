<template>
  <div class="scanline-overlay position-fixed overflow-hidden top-0 left-0 w-100 h-100 z-n1"></div>
  <!-- 走査線オーバーレイ --IGNORE -->
  <!-- 背景に走査線のような効果を重ねることで、古いディスプレイの雰囲気を再現している。 --IGNORE -->
  <!-- 走査線はCSSの線形グラデーションを使って作成されており、半透明の黒い線が一定の間隔で繰り返される。 --IGNORE -->
  <!-- pointer-events: none; を指定することで、走査線レイヤーがクリックなどのユーザーインタラクションを妨げないようにしている。 --IGNORE -->

  <!-- Scanline Overlay --IGNORE -->
  <!-- By overlaying a scanline-like effect on the background, it recreates the feel of an old display. --IGNORE -->
  <!-- The scanlines are created using CSS linear gradients, with semi-transparent black lines repeating at regular intervals. --IGNORE -->
  <!-- Specifying pointer-events: none; prevents the scanline layer from interfering with user interactions such as clicks. --IGNORE -->
</template>

<style scoped>
.scanline-overlay {
  background: linear-gradient(
    rgba(var(--bs-dark-rgb), 0.25) 50%,
    rgba(var(--bs-dark-rgb), 0.5) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
}
</style>
