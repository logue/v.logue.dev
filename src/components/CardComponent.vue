<script setup lang="ts">
const props = defineProps<{
  header: string;
  label: string;
  detail: string;
}>();
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h3 class="card-title h5 font-lubri opacity-50">{{ props.header }}</h3>
      <div class="fw-bold">{{ props.label }}</div>
      <div class="small opacity-75">{{ props.detail }}</div>
    </div>
  </div>
  <!-- ただのBoostrapのカードコンポーネント。 -->
  <!-- Just a simple Bootstrap card component. -->
</template>

<style scoped lang="scss">
.card {
  /* 無駄な改造 */
  /* Unnecessary modifications */
  border: none;
  border-left: 0.25rem solid var(--hud-cyan);
  border-radius: 0;
  background-color: transparent;
}

.card-title {
  &::before {
    content: '[';
  }
  &::after {
    content: ']';
  }
}
</style>
