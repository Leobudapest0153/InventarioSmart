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
      <h2 class="text-lg font-semibold mb-3">Anaqueles predefinidos</h2>
      <div class="space-y-2">
        <div v-for="tpl in templates" :key="tpl.id" class="flex items-center justify-between p-3 border rounded-lg"
             draggable="true"
             @dragstart="e => onDragStart(e, tpl.id)">
          <div>
            <p class="font-medium">{{ tpl.name }}</p>
            <p class="text-sm text-slate-500">{{ tpl.width }}x{{ tpl.height }} cm</p>
          </div>
          <button class="btn btn-primary" @click="addFromTpl(tpl.id)">Agregar</button>
        </div>
      </div>
      <div class="mt-4 text-sm text-slate-500">También puedes arrastrar una tarjeta al plano para crear un anaquel.</div>
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
                  <v-rect :config="{ x:0, y:0, width:rack.width, height:rack.height, stroke:'#0ea5e9', cornerRadius:8, fill:'#ffffff' }" />
                  <!-- asas -->
                  <v-line :config="{ points:[0,0, rack.width,0], stroke:'#e2e8f0', strokeWidth:1 }" />
                  <v-text :config="{ x:8, y:8, text:rack.name, fontSize:14, fill:'#0f172a' }" />
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
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import { shelfTemplates } from '../data/mock'
import Toolbar from './Toolbar.vue'

const store = useInventoryStore()
const templates = shelfTemplates

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

function addFromTpl(id){
  store.addRackFromTemplate(id, { x: 50 + Math.random()*100, y: 50 + Math.random()*100 })
}
function onDragStart(e, id){
  try {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'copy'
  } catch {}
}
function onDrop(e){
  const id = e.dataTransfer?.getData('text/plain')
  if(!id) return
  const container = canvasContainer.value
  if(!container) return
  const rect = container.getBoundingClientRect()
  const clientX = e.clientX
  const clientY = e.clientY
  const x = (clientX - rect.left + container.scrollLeft) / scale.value
  const y = (clientY - rect.top + container.scrollTop) / scale.value
  store.addRackFromTemplate(id, { x: Math.round(x), y: Math.round(y) })
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
</script>

<style scoped>
</style>
