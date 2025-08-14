<template>
  <div class="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 card p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Detalle del Anaquel</h2>
        <div class="flex gap-2">
          <button class="btn btn-outline" @click="goBack">Volver</button>
          <button class="btn btn-outline" v-if="rack" @click="removeRack">Eliminar anaquel</button>
          <button class="btn btn-primary" @click="save">Guardar cambios</button>
        </div>
      </div>
      <div v-if="rack" class="grid md:grid-cols-5 gap-4">
        <div class="md:col-span-3">
          <div class="border rounded-lg overflow-hidden">
            <v-stage :config="{ width: 600, height: 400 }">
              <v-layer>
                <!-- Marco del anaquel -->
                <v-rect :config="{ x:20, y:20, width: rack.width, height: rack.height, stroke:'#0f172a', cornerRadius:10 }" />
                <!-- Estantes -->
                <template v-for="s in rack.shelves" :key="s.id">
                  <ShelfItem :x="24" :y="20 + s.y" :width="rack.width - 8" :height="6"
                             draggable
                             @dragmove="e => onShelfDrag(e, s.id)"
                             @dragend="e => onShelfDragEnd(e, s.id)" />
                </template>
              </v-layer>
            </v-stage>
          </div>
          <div class="text-sm text-slate-500 mt-2">Arrastra las barras para mover los estantes.</div>
        </div>
        <div class="md:col-span-2 space-y-3">
          <div class="card p-4">
            <h3 class="font-medium mb-2">Propiedades</h3>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-500">Nombre</label>
                <input class="w-full border rounded-lg px-2 py-1" v-model="local.name" />
              </div>
              <div>
                <label class="text-xs text-slate-500">Ancho (cm)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.width" />
              </div>
              <div>
                <label class="text-xs text-slate-500">Alto (cm)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.height" />
              </div>
              <div>
                <label class="text-xs text-slate-500">Profundidad (cm)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.depth" />
              </div>
            </div>
          </div>

          <div class="card p-4">
            <h3 class="font-medium mb-2">Material</h3>
            <MaterialSelector :materials="materials" v-model="local.material" />
            <p class="text-sm mt-2">Peso máximo: <b>{{ maxWeight }} kg</b></p>
          </div>

          <div class="card p-4">
            <h3 class="font-medium mb-2">Estantes</h3>
            <div class="flex gap-2">
              <button class="btn btn-outline" @click="addShelf">Agregar estante</button>
              <button class="btn btn-outline" :disabled="!rack.shelves.length" @click="removeLastShelf">Eliminar último</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-slate-500">No se encontró el anaquel.</div>
    </div>

    <div class="card p-4">
      <h3 class="font-medium mb-2">Resumen</h3>
      <ul class="text-sm space-y-1" v-if="rack">
        <li><b>Nombre:</b> {{ local.name }}</li>
        <li><b>Dimensiones:</b> {{ local.width }} x {{ local.height }} x {{ local.depth }} cm</li>
        <li><b>Material:</b> {{ matName }}</li>
        <li><b>Estantes:</b> {{ rack.shelves.length }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '../stores/inventory'
import MaterialSelector from './MaterialSelector.vue'
import ShelfItem from './ShelfItem.vue'

const route = useRoute()
const store = useInventoryStore()

const rack = computed(()=> store.racks.find(r => r.id === route.params.id))
const materials = computed(()=> store.materials)

const local = reactive({ name: '', width: 0, height: 0, depth: 0, material: 'wood' })

watch(rack, (r) => {
  if (!r) return
  Object.assign(local, { name: r.name, width: r.width, height: r.height, depth: r.depth, material: r.material })
}, { immediate: true })

const mat = computed(()=> materials.value.find(m => m.id === local.material))
const maxWeight = computed(()=> mat.value?.maxWeight ?? 0)
const matName = computed(()=> mat.value?.name ?? '-')

function goBack(){ window.location.hash = '#/' }
function save(){ if(!rack.value) return; store.updateRack(rack.value.id, { ...local }) }
function addShelf(){ if(!rack.value) return; store.addShelf(rack.value.id) }
function removeLastShelf(){ if(!rack.value) return; const last = rack.value.shelves.at(-1); if(last) store.removeShelf(rack.value.id, last.id) }
function removeRack(){ if(!rack.value) return; const id = rack.value.id; store.removeRack(id); goBack() }

function onShelfDrag(e, shelfId){
  if(!rack.value) return
  const stageY = e.target.y()
  store.moveShelf(rack.value.id, shelfId, Math.round(stageY - 20))
}
function onShelfDragEnd(e, shelfId){ onShelfDrag(e, shelfId) }
</script>

<style scoped>
</style>

