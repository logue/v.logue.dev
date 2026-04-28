<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{ bgsrc: string }>();

const scrollY = ref(0);
/**
 * 脳筋実装。スクロールイベントをリッスンして、スクロール量をリアルタイムで更新する。
 * もっとも、この場合の「脳筋」は本来の意味とは逆だが。
 * A musclehead implementation. Listen to scroll events and update the scroll amount in real time.
 * In this case, "musclehead" is actually the opposite of its original meaning.
 */
const handleScroll = () => {
  scrollY.value = window.scrollY;
};

onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<template>
  <aside class="position-fixed top-0 left-0 w-100 h-100 z-n1 overflow-hidden">
    <div
      :style="`background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25)), url(${props.bgsrc});`"
      class="glitch position-relative overflow-hidden w-100 h-100"
    >
      <div class="channel r top-0 left-0 right-0 bottom-0"></div>
      <div class="channel g top-0 left-0 right-0 bottom-0"></div>
      <div class="channel b top-0 left-0 right-0 bottom-0"></div>
    </div>
  </aside>
  <!-- 画面全体にグリッチエフェクトを重ねるレイヤー --IGNORE -->
  <!-- 背景画像は、グリッチエフェクトと同じレイヤーで表示することで、エフェクトが背景に自然に溶け込むようにしている。 --IGNORE -->
  <!-- グリッチエフェクトは、CSSアニメーションを使用して、背景画像をランダムに切り取ってずらすことで実現している。 --IGNORE -->
  <!-- 例えば、clip-pathを使用して、背景画像の一部を切り取ることで、グリッチの「ノイズ」のような効果を作り出している。 --IGNORE -->
  <!-- また、transformを使用して、背景画像をランダムにずらすことで、グリッチの「歪み」のような効果を作り出している。 --IGNORE -->
  <!-- これらのアニメーションは、ランダムなタイミングで発生するように設定されているため、グリッチエフェクトが常に変化し続けるようになっている。 --IGNORE -->
  <!-- グリッチエフェクトは、背景画像と同じレイヤーで表示されるため、背景に自然に溶け込むようになっている。 --IGNORE -->
  <!-- これにより、画面全体にグリッチエフェクトがかかっているように見えるようになっている。 --IGNORE -->
  <!-- https://codepen.io/ixkaito/pen/NWgVyMz を参考にしている。 --IGNORE -->

  <!-- A layer overlays the glitch effect across the entire screen --IGNORE -->
  <!-- The background image is displayed on the same layer as the glitch effect, allowing the effect to blend naturally into the background. --IGNORE -->
  <!-- The glitch effect is achieved by using CSS animation to randomly cut and shift the background image. --IGNORE -->
  <!-- For example, using clip-path to cut out a portion of the background image creates a "noise" effect similar to the glitch. --IGNORE -->
  <!-- Also, using transform to randomly shift the background image creates a "distortion" effect similar to the glitch. --IGNORE -->
  <!-- These animations are set to occur at random timings, so the glitch effect is constantly changing. --IGNORE -->
  <!-- The glitch effect is displayed on the same layer as the background image, allowing it to blend naturally into the background. --IGNORE -->
  <!-- This makes it appear as if the glitch effect is applied to the entire screen. --IGNORE -->
  <!-- Based on https://codepen.io/ixkaito/pen/NWgVyMz. --IGNORE -->
</template>

<style scoped lang="scss">
@use 'sass:math';

@function rand($min, $max) {
  @return math.random() * ($max - $min) + $min;
}

$animation-duration: 2.5s;
$glitch-duration: 25%;
$glitch-frequency: 10;
$glitch-interval: math.div($glitch-duration, $glitch-frequency);

@mixin rgb-shift($name) {
  @keyframes rgb-shift-#{$name} {
    @for $i from 0 to $glitch-frequency {
      #{$i * $glitch-interval} {
        transform: translate(#{rand(-2, 2) * 1%}, #{rand(-0.5, 0.5) * 1%});
      }
    }

    #{$glitch-duration},
    100% {
      transform: none;
    }
  }

  animation: rgb-shift-#{$name} $animation-duration steps(1, jump-end) infinite alternate both;
}

@mixin glitch($name) {
  @keyframes glitch-#{$name} {
    @for $i from 0 to $glitch-frequency {
      $left: 0%;
      $right: 100%;
      $top: rand(0, 90) * 1%;
      $bottom: $top + rand(1, 10) * 1%;

      #{$i * $glitch-interval} {
        clip-path: polygon($left $top, $right $top, $right $bottom, $left $bottom);
        transform: translate(#{rand(-8, 8) * 1%}, #{rand(-0.5, 0.5) * 1%});
      }
    }

    #{$glitch-duration},
    100% {
      clip-path: none;
      transform: none;
    }
  }

  animation: glitch-#{$name} $animation-duration linear infinite alternate both;
}

.slice,
.glitch {
  background-size: cover;
  background-position: center;
}

.glitch {
  &::before,
  &::after,
  .channel {
    background: inherit;
    background-size: cover;
    bottom: 0;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
  }

  &::before {
    @include glitch(before);
    content: '';
  }

  &::after {
    @include glitch(after);
    content: '';
  }

  .channel {
    mix-blend-mode: screen;

    &::before {
      bottom: 0;
      content: '';
      display: block;
      mix-blend-mode: multiply;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
    }
  }

  .r {
    @include rgb-shift(r);

    &::before {
      background: var(--color-ghost-red);
    }
  }

  .g {
    @include rgb-shift(g);

    &::before {
      background: var(--color-ghost-green);
    }
  }

  .b {
    @include rgb-shift(b);

    &::before {
      background: --var(--color-ghost-blue);
    }
  }
}
</style>
<!-- ここまでスタイルシートを書き込むと、もはやCSSフレームワーク使う意味ないよね。 --- IGNORE -->
<!-- グリッチエフェクトは、CSSフレームワークのユーティリティクラスだけでは実装が難しいほど特殊なものだからね。 --- IGNORE -->
<!-- At this point, writing the stylesheet like this kind of defeats the purpose of using a CSS framework, doesn't it? --- IGNORE -->
<!-- Well, the glitch effect is so special that it's difficult to implement it using only utility classes from a CSS framework. --- IGNORE -->
