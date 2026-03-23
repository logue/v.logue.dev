<script setup lang="ts">
import { ref } from 'vue';

const isOpen = ref(false);
</script>

<template>
  <header>
    <nav class="navbar navbar-expand-md navbar-dark fixed-top">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">.ELF_LOADED</a>
        <button
          class="navbar-toggler"
          type="button"
          :aria-expanded="isOpen"
          aria-controls="navbarCollapse"
          aria-label="Toggle navigation"
          @click="isOpen = !isOpen"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div
          id="navbarCollapse"
          class="navbar-collapse"
          :class="isOpen ? 'collapse show' : 'collapse'"
        >
          <ul class="navbar-nav ms-auto mb-2 mb-md-0">
            <li class="nav-item">
              <a class="nav-link active" aria-current="page" href="#">HOME</a>
            </li>
            <li class="nav-item"><a class="nav-link" href="https://github.com/logue">GITHUB</a></li>
            <li class="nav-item"><a class="nav-link" href="https://x.com/logue256">X_LOG</a></li>
          </ul>
        </div>
      </div>
    </nav>
  </header>
  <!-- オーソドックスなbootstrapのナビゲーションバー --- IGNORE -->
  <!-- A standard Bootstrap navigation bar --- IGNORE -->
</template>

<style scoped>
.nav-link {
  color: var(--hud-cyan);
  opacity: 0.5;
  transition: all 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  opacity: 1;
  color: var(--arasaka-red);
  text-shadow: 0 0 8px var(--arasaka-red);
}
</style>
