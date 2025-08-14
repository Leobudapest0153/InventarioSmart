<template>
  <div class="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
    <!-- Panel superior de áreas de trabajo -->
    <div class="card p-4 lg:col-span-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Área actual: {{ currentWorkspaceName }}</h2>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label class="text-sm text-slate-600">Cambiar área:</label>
          <select class="border rounded-lg px-2 py-1 min-w-[220px]" :value="selectedWsId" @change="onWorkspaceChange($event.target.value)">
            <option v-for="w in workspaces" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
          <button class="btn btn-primary" @click="openNewWsModal">+ Nueva Área de Trabajo</button>
        </div>
      </div>
    </div>

    <!-- Panel lateral de plantillas -->
    <aside class="card p-4 lg:col-span-1 h-fit">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Anaqueles</h2>
        <button class="btn btn-outline text-sm" @click="openNewRackTplModal">+ Agregar Anaquel</button>
      </div>
      <div class="space-y-2">
        <div v-for="tpl in templates" :key="(tpl.__source || 'builtin') + ':' + tpl.id" class="flex items-center justify-between p-3 border rounded-lg"
             draggable="true"
             @dragstart="e => onDragStart(e, tpl)">
          <div>
            <p class="font-medium">{{ tpl.name }}</p>
            <p class="text-xs text-slate-500 capitalize">Tipo: {{ toHumanType(tpl.type) }}</p>
            <p class="text-sm text-slate-500" v-if="tpl.type==='rectangle'">{{ tpl.width }}x{{ tpl.height }} cm</p>
            <p class="text-sm text-slate-500" v-else-if="tpl.type==='square'">Lado: {{ tpl.side || tpl.width }} cm</p>
            <p class="text-sm text-slate-500" v-else-if="tpl.type==='barrel'">Diámetro: {{ tpl.diameter || tpl.width }} cm</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-primary" @click="addFromTpl(tpl)">Agregar</button>
            <button v-if="tpl.__source==='custom'" class="btn btn-outline" title="Eliminar" @click="askDeleteTemplate(tpl)">🗑</button>
          </div>
        </div>
      </div>
      <div class="mt-4 text-sm text-slate-500">También puedes arrastrar una tarjeta al plano para crear un anaquel.</div>

      <hr class="my-4" />
      <h3 class="text-sm font-semibold mb-2">En área actual</h3>
      <div class="space-y-2" v-if="racks.length">
        <div v-for="r in racks" :key="r.id" class="flex items-center justify-between p-2 border rounded-lg">
          <div>
            <p class="font-medium text-sm">{{ r.name }}</p>
            <p class="text-xs text-slate-500">{{ toHumanType(r.type) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-outline" title="Ir al detalle" @click="goDetail(r.id)">Ver</button>
            <button class="btn btn-outline" title="Eliminar" @click="askDeleteRack(r)">🗑</button>
          </div>
        </div>
      </div>
      <div v-else class="text-xs text-slate-500">Aún no hay anaqueles en esta área.</div>
    </aside>

    <!-- Zona de trabajo 2D -->
    <section class="lg:col-span-3">
      <div class="card p-3">
        <Toolbar
          @clear="clearRacks"
          @zoomIn="scale*=1.1"
          @zoomOut="scale=Math.max(0.4, scale*0.9)"
        />
        <div ref="canvasContainer" class="relative overflow-auto border border-border rounded-lg" :style="{height: '700px'}"
             @dragover.prevent
             @drop="onDrop">
          <v-stage ref="stageRef" :config="{ width: workspace.width, height: workspace.height, draggable: false, scale: {x: scale, y: scale} }">
            <v-layer>
              <!-- Fondo -->
              <v-rect :config="{ x:0, y:0, width: workspace.width, height: workspace.height, fill:'#f8fafc' }" />

              <!-- Anaqueles -->
              <template v-for="rack in racks" :key="rack.id">
                <v-group :config="{ x: rack.x, y: rack.y, draggable: true }"
                         @dragend="e => onDragEnd(rack.id, e.target.x(), e.target.y())"
                         @dblclick="goDetail(rack.id)"
                         @click="select(rack.id)">
                  <template v-if="rack.type==='barrel'">
                    <v-circle :config="{ x: (rack.width/2), y: (rack.width/2), radius: rack.width/2, stroke:'#0ea5e9', fill:'#ffffff' }" />
                    <v-text :config="{ x:8, y: rack.width + 4, text:rack.name, fontSize:14, fill:'#0f172a' }" />
                  </template>
                  <template v-else>
                    <v-rect :config="{ x:0, y:0, width:rack.width, height:rack.height, stroke:'#0ea5e9', cornerRadius:8, fill:'#ffffff' }" />
                    <v-line :config="{ points:[0,0, rack.width,0], stroke:'#e2e8f0', strokeWidth:1 }" />
                    <v-text :config="{ x:8, y:8, text:rack.name, fontSize:14, fill:'#0f172a' }" />
                  </template>
                </v-group>
              </template>
            </v-layer>
          </v-stage>
        </div>
      </div>
    </section>

    <!-- Modal nueva área de trabajo -->
    <div v-if="newWsOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeNewWsModal"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-semibold mb-3">Nueva Área de Trabajo</h3>
        <div class="space-y-2">
          <label class="text-sm text-slate-600">Nombre del área</label>
          <input class="w-full border rounded-lg px-3 py-2" v-model="newWsName" placeholder="Ej. Almacén Norte" />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn btn-outline" @click="closeNewWsModal">Cancelar</button>
          <button class="btn btn-primary" @click="createWorkspace">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal agregar plantilla de anaquel -->
    <div v-if="newRackTplOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeNewRackTplModal"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
        <h3 class="text-lg font-semibold mb-3">Nuevo Anaquel</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="text-xs text-slate-600">Nombre</label>
            <input class="w-full border rounded-lg px-3 py-2" v-model="newTpl.name" placeholder="Ej. Anaquel Custom" />
          </div>
          <div>
            <label class="text-xs text-slate-600">Tipo de figura</label>
            <select class="w-full border rounded-lg px-3 py-2" v-model="newTpl.type">
              <option value="rectangle">Rectángulo</option>
              <option value="square">Cuadrado</option>
              <option value="barrel">Barril</option>
            </select>
          </div>
          <div>
            <MaterialSelector :materials="materials" v-model="newTpl.material" />
          </div>

          <template v-if="newTpl.type==='rectangle'">
            <div>
              <label class="text-xs text-slate-600">Ancho (cm)</label>
              <input type="number" class="w-full border rounded-lg px-3 py-2" v-model.number="newTpl.width" />
            </div>
            <div>
              <label class="text-xs text-slate-600">Alto (cm)</label>
              <input type="number" class="w-full border rounded-lg px-3 py-2" v-model.number="newTpl.height" />
            </div>
          </template>
          <template v-else-if="newTpl.type==='square'">
            <div>
              <label class="text-xs text-slate-600">Lado (cm)</label>
              <input type="number" class="w-full border rounded-lg px-3 py-2" v-model.number="newTpl.side" />
            </div>
          </template>
          <template v-else>
            <div>
              <label class="text-xs text-slate-600">Diámetro (cm)</label>
              <input type="number" class="w-full border rounded-lg px-3 py-2" v-model.number="newTpl.diameter" />
            </div>
            <div>
              <label class="text-xs text-slate-600">Altura (cm)</label>
              <input type="number" class="w-full border rounded-lg px-3 py-2" v-model.number="newTpl.height" />
            </div>
          </template>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn btn-outline" @click="closeNewRackTplModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveNewRackTpl">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal confirmación eliminar plantilla -->
    <div v-if="confirmDel.open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="confirmDel.open=false"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-semibold mb-2">Eliminar anaquel</h3>
        <p class="text-slate-700 mb-4">¿Estás seguro que deseas eliminar este anaquel? Esta acción no se puede deshacer.</p>
        <div class="flex justify-end gap-2">
          <button class="btn btn-outline" @click="confirmDel.open=false">Cancelar</button>
          <button class="btn btn-primary" @click="doDeleteTemplate">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal confirmación eliminar anaquel del área actual -->
    <div v-if="confirmRackDel.open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="confirmRackDel.open=false"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-semibold mb-2">Eliminar anaquel</h3>
        <p class="text-slate-700 mb-4">¿Estás seguro que deseas eliminar este anaquel? Esta acción no se puede deshacer.</p>
        <div class="flex justify-end gap-2">
          <button class="btn btn-outline" @click="confirmRackDel.open=false">Cancelar</button>
          <button class="btn btn-primary" @click="doDeleteRack">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, reactive } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import Toolbar from './Toolbar.vue'
import MaterialSelector from './MaterialSelector.vue'

const store = useInventoryStore()

// Plantillas visibles (built-in + locales)
const templates = computed(() => store.templates)

// Áreas de trabajo
const workspaces = computed(() => store.workspaces)
const selectedWsId = computed(() => store.currentWorkspaceId)
const currentWorkspaceName = computed(() => store.currentWorkspace?.name || '-')

function onWorkspaceChange(id) {
  store.setCurrentWorkspace(id)
}

// Racks del área actual
const racks = computed(() => store.racks)
const workspace = computed(() => store.workspace)
const scale = ref(1)

const canvasContainer = ref(null)
const stageRef = ref(null)

function toHumanType(t){
  if (t==='barrel') return 'Barril'
  if (t==='square') return 'Cuadrado'
  return 'Rectángulo'
}

function addFromTpl(tpl){
  store.addRackFromTemplate(`${tpl.__source || 'builtin'}:${tpl.id}`, { x: 50 + Math.random()*100, y: 50 + Math.random()*100 })
}
function onDragStart(e, tpl){
  try {
    e.dataTransfer.setData('text/plain', `${tpl.__source || 'builtin'}:${tpl.id}`)
    e.dataTransfer.effectAllowed = 'copy'
  } catch {}
}
function onDrop(e){
  const key = e.dataTransfer?.getData('text/plain')
  if(!key) return
  const container = canvasContainer.value
  if(!container) return
  const rect = container.getBoundingClientRect()
  const clientX = e.clientX
  const clientY = e.clientY
  const x = (clientX - rect.left + container.scrollLeft) / scale.value
  const y = (clientY - rect.top + container.scrollTop) / scale.value
  store.addRackFromTemplate(key, { x: Math.round(x), y: Math.round(y) })
}
function onDragEnd(id, x, y){
  store.updateRackPosition(id, Math.round(x), Math.round(y))
}
function goDetail(id){
  store.setCurrentRack(id)
  window.location.hash = `#/shelf/${id}`
}
function select(id){
  store.setCurrentRack(id)
}
function clearRacks(){
  store.clearRacks()
}

onMounted(()=>{
  // Los datos iniciales ahora se cargan por área desde el store.
})

// Modal nueva área
const newWsOpen = ref(false)
const newWsName = ref('')
function openNewWsModal(){ newWsOpen.value = true }
function closeNewWsModal(){ newWsOpen.value = false; newWsName.value = '' }
function createWorkspace(){
  store.addWorkspace(newWsName.value)
  closeNewWsModal()
}

// Modal nueva plantilla
const newRackTplOpen = ref(false)
const newTpl = reactive({ name: '', type: 'rectangle', width: 120, height: 80, side: 100, diameter: 80, material: 'wood' })
function openNewRackTplModal(){ newRackTplOpen.value = true }
function closeNewRackTplModal(){
  newRackTplOpen.value = false
  Object.assign(newTpl, { name: '', type: 'rectangle', width: 120, height: 80, side: 100, diameter: 80, material: 'wood' })
}
const materials = computed(() => store.materials)
function saveNewRackTpl(){
  const payload = { name: newTpl.name, type: newTpl.type, material: newTpl.material }
  if (newTpl.type === 'barrel') Object.assign(payload, { diameter: newTpl.diameter, height: newTpl.height })
  else if (newTpl.type === 'square') Object.assign(payload, { side: newTpl.side, depth: 40, shelves: 0 })
  else Object.assign(payload, { width: newTpl.width, height: newTpl.height, depth: 40, shelves: 0 })
  store.addCustomTemplate(payload)
  closeNewRackTplModal()
}

// Confirmación eliminar plantilla
const confirmDel = reactive({ open: false, id: null })
function askDeleteTemplate(tpl){
  confirmDel.open = true
  confirmDel.id = tpl.id
}
function doDeleteTemplate(){
  if (confirmDel.id) store.removeCustomTemplate(confirmDel.id)
  confirmDel.open = false
  confirmDel.id = null
}

// Confirmación eliminar rack del área
const confirmRackDel = reactive({ open: false, id: null })
function askDeleteRack(r){
  confirmRackDel.open = true
  confirmRackDel.id = r.id
}
function doDeleteRack(){
  if (confirmRackDel.id) store.removeRack(confirmRackDel.id)
  confirmRackDel.open = false
  confirmRackDel.id = null
}
</script>

<style scoped>
</style>
