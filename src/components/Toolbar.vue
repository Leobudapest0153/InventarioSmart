<template>
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <button class="btn btn-outline" @click="$emit('zoomOut')">-</button>
      <button class="btn btn-outline" @click="$emit('zoomIn')">+</button>
    </div>
    <div class="flex items-center gap-2">
      <button class="btn btn-outline" @click="$emit('clear')">Limpiar</button>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
</style>

