<template>
  <div class="flex items-center gap-2">
    <label class="text-sm">Material</label>
    <select class="border rounded-lg px-2 py-1" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
    </select>
  </div>
</template>

<script setup>
defineProps({
  materials: { type: Array, required: true },
  modelValue: { type: String, required: true },
})
</script>

<style scoped>
</style>

