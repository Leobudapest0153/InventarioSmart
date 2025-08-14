<template>
  <div class="min-h-screen flex flex-col">
    <header class="toolbar">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg sm:text-xl font-semibold text-slate-900">Gestor de Inventario 2D</h1>
        <nav class="flex items-center gap-2">
          <RouterLink to="/" class="btn btn-outline">Inventario</RouterLink>
          <RouterLink to="/about" class="btn btn-outline">Acerca</RouterLink>
        </nav>
      </div>
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
</style>

