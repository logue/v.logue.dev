<script setup lang="ts">
import { onMounted } from 'vue';

import { Icon } from '@iconify/vue';
import { Tooltip } from 'bootstrap';

import { useAppStore } from '@/stores/useAppStore';

const appStore = useAppStore();

interface SocialLink {
  /** ツールチップの内容 */
  name: string;
  /** リンク先の URL */
  url: string;
  /** アイコンの識別子 */
  icon: string;
}

const links: SocialLink[] = [
  {
    // 悲しいことに青い鳥はもういないのだ。 --- IGNORE ---
    // Unfortunately, the blue bird is no more. --- IGNORE ---
    name: 'X',
    url: 'https://x.com/logue256',
    icon: 'simple-icons:x'
  },
  {
    // Facebook はまだ生きてるけど、有名人や著名なサイトを騙った広告が出たあたりから使わなくなった。。 --- IGNORE ---
    // Facebook is still alive, but I stopped using it after ads started appearing that impersonated celebrities and prominent sites... --- IGNORE ---
    name: 'Facebook',
    url: 'https://facebook.com/logue256',
    icon: 'simple-icons:facebook'
  },
  {
    // 全く使ってないけど、念のため残してる --- IGNORE ---
    // I don't use it at all, but I'm keeping it just in case --- IGNORE
    name: 'Instagram',
    url: 'https://instagram.com/logue256',
    icon: 'simple-icons:instagram'
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/in/logue',
    icon: 'simple-icons:linkedin'
  },
  {
    // ここでの活動がメインになってる --- IGNORE ---
    // This is where most of my activity happens --- IGNORE ---
    name: 'GitHub',
    url: 'https://github.com/logue',
    icon: 'simple-icons:github'
  },
  {
    // あまり活動していない。 --- IGNORE ---
    // Not very active. --- IGNORE ---
    name: 'GitLab',
    url: 'https://gitlab.com/logue',
    icon: 'simple-icons:gitlab'
  },
  /*
  {
    name: 'Qiita',
    url: 'https://qiita.com/logue256',
    icon: 'simple-icons:qiita'
  },
  */
  {
    // 一時期使っていたが最近さっぱり更新してない --- IGNORE ---
    // I used to use it for a while, but I haven't updated it at all recently
    name: 'StackOverflow',
    url: 'https://ja.stackoverflow.com/users/5461/logue',
    icon: 'simple-icons:stackoverflow'
  },
  {
    // 割とよく使う --- IGNORE ---
    // I use it quite often --- IGNORE ---
    name: 'Discord',
    url: 'https://discord.com/users/300930832699490306',
    icon: 'simple-icons:discord'
  },
  {
    // ここもあまり更新してないけど、たまに何か書いてる --- IGNORE ---
    // I don't update it much, but I occasionally write something --- IGNORE ---
    name: 'Tumblr',
    url: 'https://blog.logue.be/',
    icon: 'simple-icons:tumblr'
  },
  {
    // LINE は好きではない。 --- IGNORE ---
    // I don't like LINE. --- IGNORE ---
    name: 'LINE',
    url: 'https://line.me/ti/p/Hd8erPz_55',
    icon: 'simple-icons:line'
  },
  {
    // ここもあまり更新してないけど、たまに何か書いてる --- IGNORE ---
    // I don't update it much, but I occasionally write something --- IGNORE ---
    name: 'Reddit',
    url: 'https://reddit.com/u/logue256',
    icon: 'simple-icons:reddit'
  },
  {
    // しょっちゅう更新している。 --- IGNORE ---
    // I update it frequently. --- IGNORE ---
    name: 'NPM',
    url: 'https://www.npmjs.com/~logue',
    icon: 'simple-icons:npm'
  },
  {
    // 多分これから使うようになると思う。 --- IGNORE ---
    // I think I'll probably start using this from now on. --- IGNORE ---
    name: 'Crate.io',
    url: 'https://crates.io/users/logue',
    icon: 'simple-icons:rust'
  },
  {
    name: 'Docker Hub',
    url: 'https://hub.docker.com/u/logue',
    icon: 'simple-icons:docker'
  },
  {
    // PHP をあまり使わなくなったので、最近はあまり更新してない --- IGNORE ---
    // I don't use PHP much anymore, so I haven't updated it much recently --- IGNORE ---
    name: 'Packagist',
    url: 'https://packagist.org/users/logue',
    icon: 'simple-icons:packagist'
  },
  {
    // 新曲のリリースはここで行っている。 --- IGNORE ---
    // This is where I release new music. --- IGNORE ---
    name: 'SoundCloud',
    url: 'https://soundcloud.com/logue256',
    icon: 'simple-icons:soundcloud'
  },
  {
    // まとまったら、こっちで発表しようかなと思ってる --- IGNORE ---
    // Once I have something substantial, I might release it here --- IGNORE ---
    name: 'Bandcamp',
    url: 'https://logue256.bandcamp.com/',
    icon: 'simple-icons:bandcamp'
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/user/logue256',
    icon: 'simple-icons:spotify'
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com/c/logue256',
    icon: 'simple-icons:youtube'
  },
  {
    // 黎明期はよくアップしていたが、最近はあまり更新してない --- IGNORE ---
    // I used to upload a lot during the early days, but I haven't updated it much
    name: 'Niconico',
    url: 'https://www.nicovideo.jp/user/239946',
    icon: 'simple-icons:niconico'
  },
  {
    name: 'Twitch',
    url: 'https://twitch.tv/logue256',
    icon: 'simple-icons:twitch'
  },
  {
    // 昔ほどゲームをやらなくなった。 --- IGNORE ---
    // I don't play games as much as I used to. --- IGNORE ---
    name: 'Steam',
    url: 'https://steamcommunity.com/id/logue256',
    icon: 'simple-icons:steam'
  },
  {
    // WindowsがメインPCだった頃は使ってたけど、Macに移行してからはあまり使ってない --- IGNORE ---
    // I used to use it when Windows was my main PC, but I haven't used it
    name: 'Xbox',
    url: 'https://account.xbox.com/ja-jp/Profile?Gamertag=Logue256',
    icon: 'simple-icons:xbox'
  },
  {
    // ko-fiは、寄付や支援者を募るためのプラットフォームで、クリエイターがファンから直接支援を受けることができるサービス。 --- IGNORE ---
    // Ko-fi is a platform for soliciting donations and supporters, allowing creators to receive direct support from their fans. --- IGNORE ---
    name: 'Ko-fi',
    url: 'https://ko-fi.com/logue256',
    icon: 'simple-icons:kofi'
  },
  {
    name: 'PayPal',
    url: 'https://paypal.me/logue256',
    icon: 'simple-icons:paypal'
  }
];

onMounted(() => {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach(el => new Tooltip(el));
});
</script>

<template>
  <!-- eslint-disable vuejs-accessibility/anchor-has-content -->
  <ul class="list-inline mb-0">
    <li v-for="(link, index) in links" :key="index" class="list-inline-item mx-2">
      <a
        :data-bs-title="link.name"
        :href="link.url"
        :title="link.name"
        class="cyber-icon-link fs-3"
        data-bs-placement="top"
        data-bs-toggle="tooltip"
        rel="noopener noreferrer"
        target="_blank"
        @click="appStore.pauseAudio"
      >
        <Icon :icon="link.icon" />
      </a>
    </li>
  </ul>
  <!-- ここでは、Font Awesomeのアイコンを使用して、各ソーシャルメディアのロゴを表示している。 --- IGNORE -->
  <!-- アイコンは、Bootstrapのツールチップと組み合わせて、ユーザーがアイコンにカーソルを合わせたときに、ツールチップが表示されるようになっている。 --- IGNORE -->

  <!-- Font Awesome icons are used here to display the logos of various social media platforms. --- IGNORE -->
  <!-- The icons are combined with Bootstrap tooltips so that tooltips appear when the user hovers over the icons. --- IGNORE -->
</template>

<style scoped>
.cyber-icon-link {
  color: var(--bs-gray-100);
  opacity: 0.8;
  transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

.cyber-icon-link:hover {
  opacity: 1;
  color: var(--hud-cyan);
  transform: translateY(-3px);
  /* Chromatic aberration: blue ghost shifted left, red ghost shifted right */
  filter: drop-shadow(-0.5rem 0 0.05rem var(--color-ghost-blue)) /* 左：青 */
    drop-shadow(0.5rem 0 0.05rem var(--color-ghost-red)) /* 右：赤 */
    drop-shadow(0 0 8px var(--hud-cyan));
}
</style>
