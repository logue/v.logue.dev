<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue';
import SocialLinks from '@/components/SocialLinks.vue';
import VrmCanvas from '@/components/VrmCanvas.vue';
import { useAppStore } from '@/stores/useAppStore';

// VRM 関連のパラメータ。変えたければここを変えろ。それだけ。
// VRM-related parameters. Change them here if needed. That's all.
const vrm = String(import.meta.env.VITE_VROID_AVATAR_ID);
const store = useAppStore();

const onVrmReady = () => {
  // App 側へイベントを投げるのをやめて、ストア経由で状態共有する。
  // No more bubbling to App; share readiness through store instead.
  store.setVrmReady(true);
};

const accomplishments = [
  // 色々書きたいコンテンツはあるが、全部出そうとしないほうがいい。
  // 扱う情報が増えるほど、コンテンツの重みが薄れていくからだ。
  // There are various contents I want to write, but it's better not to try to show everything.  --- IGNORE -->
  // The more information you include, the more diluted the content becomes.
  { id: 'CORE INFRASTRUCTURE', label: 'VUE-CODEMIRROR6', detail: '1.8M+ DL/YR' },
  { id: 'CULTURAL BRIDGE', label: 'FIRESTORM_OFFICIAL', detail: 'JP_STAFF' },
  {
    id: 'EXPERIMENTAL LAB',
    label: 'RUST / TAURI',
    detail: 'PURE JS MIDI, VRM2SL, UNIVERSAL MARKDOWN'
  }
] satisfies { id: string; label: string; detail: string }[];
</script>

<template>
  <div class="mb-2 text-center">
    <h1 class="glitch-text display-1 font-lubri">LOGUE.DEV</h1>
    <p class="lead">
      EXPERIENCE-DRIVEN INVERSION:
      <br />
      REVERSE-ENGINEERING THE STACK TO MANIFEST THE IDEAL UX.
    </p>
    <!-- 普通のサイトとタイトルとリード文 -->
    <!-- Just a normal site title and lead text -->
  </div>

  <section class="d-flex justify-content-center align-items-center flex-column my-5">
    <!-- A E S T H E T I C S --IGNORE -->
    <VrmCanvas
      :vrm="vrm"
      zip="VRMA_MotionPack.zip"
      vrma="VRMA_MotionPack/vrma/VRMA_01.vrma"
      @ready="onVrmReady"
    />
    <!-- 「エルフ」という亜人のアバターを使うこと自体が、リアリティを廃する行為だ。 -- IGNORE -->
    <!-- これはマトリックスで、ネオが「アンダーソン」という本名を捨て「ネオ」と名乗ったのと同じで、システムの外に出ることの表明。 -- IGNORE -->
    <!-- “なぜ、男アバターを使うのか？”これは「自由度が高いということは、何でもできるではなく、どうとでも作れてしまう」という自分の開発における哲学に基づく。 -- IGNORE  -->
    <!-- VRoid に限らず、MMO-RPGやメタバースの世界では、女アバターは服の種類が多く、「かわいく見せる」ことは誰でもできることである。 -- IGNORE -->
    <!--また、単に「かわいい」といってもその方法は多岐にわたる。 --- IGNORE -->
    <!-- しかし、男アバターはもともと服の種類が少ない上に、「かっこよく見せたい」という需要のほうがはるかに多いので「かわいく見せる」という事は意外と困難である。 --- IGNORE -->
    <!-- 「かわいい男アバター」という、あえて制約の多いところに挑戦するという行為そのものが、「制約下で最良の結果を出す」という考え方に結びついているだろう。  --- IGNORE -->
    <!-- ちなみに、髪の毛が青いのは、MacOS 7の頃のMacのアイコンの画面由来。--- IGNORE -->
    <!-- MacOS 7 の亡霊を、Material Design の器に閉じ込めた。ガンマ値の差は、埋まらない歴史の溝だ。-->

    <!-- Adopting an "elf" — a non-human avatar — is an act of rejecting reality itself. --- IGNORE -->
    <!-- This is like in The Matrix, where Neo discards his real name "Anderson" and adopts the name "Neo", a declaration of stepping outside the system. --- IGNORE -->
    <!-- “Why use a male avatar?” This is based on my development philosophy that "high freedom means not just being able to do anything, but being able to create anything."  --- IGNORE -->
    <!-- In VRoid and not just VRoid, in the world of MMO-RPGs and metaverses, female avatars have more clothing options, and it's easy for anyone to make them look "cute". --- IGNORE -->
    <!-- Also, even if you just say "cute", there are many ways to achieve that. --- IGNORE -->
    <!-- However, male avatars have fewer clothing options to begin with, and since the demand to look "cool" is much higher, making them look "cute" can be surprisingly difficult. --- IGNORE -->
    <!-- The act of deliberately challenging the more constrained "cute male avatar" scenario can be said to be based on my philosophy of producing the best results under constraints. --- IGNORE -->
    <!-- By the way, the reason the hair is blue is inspired by the Mac icon screen from the days of MacOS 7. --- IGNORE -->
    <!-- I trapped the ghost of MacOS 7 in a Material Design vessel. The difference in gamma values is an unbridgeable chasm of history. --- IGNORE -->
  </section>

  <section class="row mt-3 mx-auto my-2">
    <div v-for="item in accomplishments" :key="item.id" class="col ma-3">
      <CardComponent :header="item.id" :label="item.label" :detail="item.detail" />
    </div>
    <!-- ここは、いわゆる「実績」を表示するセクション。  --- IGNORE -->
    <!-- This is a section that displays so-called "accomplishments".  --- IGNORE -->
  </section>

  <nav aria-label="External Links" class="my-3 mx-auto text-center">
    <SocialLinks />
    <!-- 各種SNSなどへのリンクを表示するセクション。  --- IGNORE -->
    <!-- 全部クリックして確認するようなもの好きな人は、たぶんいないだろうけどね --- IGNORE -->
    <!-- This is a section that displays links to various social media platforms. --- IGNORE -->
    <!-- Probably not many people would be interested in clicking and checking them all out, though. --- IGNORE -->
  </nav>

  <p class="text-center opacity-75" style="color: rgb(var(--grid-green-rgb))">
    DOCUMENTED SOURCE AVAILABLE FOR SEEKERS
    <!-- しょうがない。これはたどり着けない人のためのヒントだ。--- IGNORE -->
    <!-- It can't be helped. This is a hint for those who can't reach it. --- IGNORE -->
  </p>

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
