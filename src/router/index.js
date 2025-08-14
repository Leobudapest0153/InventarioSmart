import { createRouter, createWebHashHistory } from 'vue-router'
import InventoryView from '../components/InventoryView.vue'
import ShelfView from '../components/ShelfView.vue'

const routes = [
  { path: '/', name: 'home', component: InventoryView },
  { path: '/shelf/:id', name: 'shelf', component: ShelfView, props: true },
  { path: '/about', name: 'about', component: { template: '<div class="max-w-4xl mx-auto p-4"><div class="card p-6"><h2 class="text-xl font-semibold mb-2">Acerca</h2><p>Demo de gestor de inventario 2D con Vue 3, Pinia, Tailwind y Konva.</p></div></div>' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

