<script setup lang="ts">
const props = defineProps<{
  header: string;
  label: string;
  detail: string;
}>();
</script>

<template>
  <div class="card">
    <div class="card-header font-lubri opacity-50">[{{ props.header }}]</div>
    <div class="card-body">
      <div class="fw-bold">{{ props.label }}</div>
      <div class="small opacity-75">{{ props.detail }}</div>
    </div>
  </div>
</template>

<style scoped>
.card {
  /* 無駄な改造 */
  /* Unnecessary modifications */
  border: none;
  border-left: 0.25rem solid var(--hud-cyan);
  border-radius: 0;
  background-color: transparent;
}
</style>
