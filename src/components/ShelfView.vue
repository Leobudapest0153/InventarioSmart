<template>
  <div class="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 card p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Detalle del Anaquel</h2>
        <div class="flex gap-2">
          <button class="btn btn-outline" @click="goBack">Volver</button>
          <button class="btn btn-outline" v-if="rack" @click="openConfirmDelete">Eliminar anaquel</button>
          <button class="btn btn-primary" @click="save">Guardar cambios</button>
        </div>
      </div>
      <div v-if="rack" class="grid md:grid-cols-5 gap-4">
        <div class="md:col-span-3">
          <div class="border rounded-lg overflow-hidden">
            <v-stage :config="{ width: 600, height: 400 }">
              <v-layer>
                <!-- Representación según tipo -->
                <template v-if="rack.type==='barrel'">
                  <v-circle :config="{ x: 60 + local.diameter/2, y: 60 + local.diameter/2, radius: local.diameter/2, stroke:'#0f172a' }" />
                  <v-text :config="{ x: 20, y: 20, text: local.name, fontSize: 14, fill: '#0f172a' }" />
                </template>
                <template v-else>
                  <!-- Marco del anaquel -->
                  <v-rect :config="{ x:20, y:20, width: local.width, height: local.height, stroke:'#0f172a', cornerRadius:10 }" />
                  <!-- Estantes -->
                  <template v-for="s in rack.shelves" :key="s.id">
                    <ShelfItem :x="24" :y="20 + s.y" :width="local.width - 8" :height="6"
                               draggable
                               @dragmove="e => onShelfDrag(e, s.id)"
                               @dragend="e => onShelfDragEnd(e, s.id)" />
                  </template>
                </template>
              </v-layer>
            </v-stage>
          </div>
          <div class="text-sm text-slate-500 mt-2" v-if="rack.type!=='barrel'">Arrastra las barras para mover los estantes.</div>
        </div>
        <div class="md:col-span-2 space-y-3">
          <div class="card p-4">
            <h3 class="font-medium mb-2">Propiedades</h3>
            <div class="grid grid-cols-2 gap-2">
              <div class="col-span-2">
                <label class="text-xs text-slate-500">Nombre</label>
                <input class="w-full border rounded-lg px-2 py-1" v-model="local.name" />
              </div>
              <template v-if="rack.type==='barrel'">
                <div>
                  <label class="text-xs text-slate-500">Diámetro (cm)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.diameter" />
                </div>
                <div>
                  <label class="text-xs text-slate-500">Altura (cm)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.barrelHeight" />
                </div>
              </template>
              <template v-else>
                <div>
                  <label class="text-xs text-slate-500">Ancho (cm)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.width" />
                </div>
                <div>
                  <label class="text-xs text-slate-500">Alto (cm)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.height" />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-slate-500">Profundidad (cm)</label>
                  <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="local.depth" />
                </div>
              </template>
            </div>
          </div>

          <div class="card p-4">
            <h3 class="font-medium mb-2">Material</h3>
            <MaterialSelector :materials="materials" v-model="local.material" />
            <p class="text-sm mt-2">Peso máximo: <b>{{ maxWeight }} kg</b></p>
          </div>

          <div class="card p-4" v-if="rack.type!=='barrel'">
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
        <li v-if="rack.type==='barrel'"><b>Diámetro:</b> {{ local.diameter }} cm</li>
        <li v-if="rack.type==='barrel'"><b>Altura:</b> {{ local.barrelHeight }} cm</li>
        <li v-else><b>Dimensiones:</b> {{ local.width }} x {{ local.height }} x {{ local.depth }} cm</li>
        <li><b>Material:</b> {{ matName }}</li>
        <li v-if="rack.type!=='barrel'"><b>Estantes:</b> {{ rack.shelves.length }}</li>
      </ul>
    </div>

    <!-- Modal de confirmación para eliminar anaquel del área -->
    <div v-if="confirmOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="confirmOpen=false"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-semibold mb-2">Eliminar anaquel</h3>
        <p class="text-slate-700 mb-4">¿Estás seguro que deseas eliminar este anaquel? Esta acción no se puede deshacer.</p>
        <div class="flex justify-end gap-2">
          <button class="btn btn-outline" @click="confirmOpen=false">Cancelar</button>
          <button class="btn btn-primary" @click="confirmDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '../stores/inventory'
import MaterialSelector from './MaterialSelector.vue'
import ShelfItem from './ShelfItem.vue'

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()

const rack = computed(()=> store.racks.find(r => r.id === route.params.id))
const materials = computed(()=> store.materials)

const local = reactive({ name: '', type: 'rectangle', width: 0, height: 0, depth: 0, material: 'wood', diameter: 0, barrelHeight: 0 })

watch(rack, (r) => {
  if (!r) return
  Object.assign(local, {
    name: r.name,
    type: r.type || 'rectangle',
    width: r.width || 0,
    height: r.height || 0,
    depth: r.depth || 0,
    material: r.material || 'wood',
    diameter: r.type==='barrel' ? r.width : 0,
    barrelHeight: r.type==='barrel' ? (r.barrelHeight || r.height || 0) : 0,
  })
}, { immediate: true })

const mat = computed(()=> materials.value.find(m => m.id === local.material))
const maxWeight = computed(()=> mat.value?.maxWeight ?? 0)
const matName = computed(()=> mat.value?.name ?? '-')

function goBack(){ router.push('/') }
function save(){
  if(!rack.value) return
  if (rack.value.type === 'barrel') {
    // width/height del canvas usan diámetro; preservamos altura real en barrelHeight
    store.updateRack(rack.value.id, { name: local.name, material: local.material, width: local.diameter, height: local.diameter, barrelHeight: local.barrelHeight })
  } else {
    store.updateRack(rack.value.id, { name: local.name, width: local.width, height: local.height, depth: local.depth, material: local.material })
  }
}
function addShelf(){ if(!rack.value) return; if (rack.value.type==='barrel') return; store.addShelf(rack.value.id) }
function removeLastShelf(){ if(!rack.value) return; if (rack.value.type==='barrel') return; const last = rack.value.shelves.at(-1); if(last) store.removeShelf(rack.value.id, last.id) }

function onShelfDrag(e, shelfId){
  if(!rack.value) return
  const stageY = e.target.y()
  store.moveShelf(rack.value.id, shelfId, Math.round(stageY - 20))
}
function onShelfDragEnd(e, shelfId){ onShelfDrag(e, shelfId) }

// Confirmación eliminación de rack del área actual
const confirmOpen = ref(false)
function openConfirmDelete(){ confirmOpen.value = true }
function confirmDelete(){
  if(!rack.value) return
  const id = rack.value.id
  store.removeRack(id)
  confirmOpen.value = false
  goBack()
}
</script>

<style scoped>
</style>
