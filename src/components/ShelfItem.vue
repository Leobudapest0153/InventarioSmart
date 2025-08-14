<template>
  <!-- Representación de un estante como rectángulo Konva -->
  <v-rect :config="{ x, y, width, height, fill: '#94a3b8' }"
          :draggable="draggable"
          @dragmove="onDragMove"
          @dragend="onDragEnd" />
</template>

<script setup>
const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  draggable: { type: Boolean, default: false },
})

const emit = defineEmits(['dragmove', 'dragend'])

function onDragMove(e){ emit('dragmove', e) }
function onDragEnd(e){ emit('dragend', e) }
</script>

<style scoped>
</style>
