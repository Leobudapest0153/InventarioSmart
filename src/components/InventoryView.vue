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
          <button class="btn btn-outline" @click="openEditWsModal">Editar Área</button>
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
        <div v-for="tpl in templates" :key="getTplKey(tpl)" class="flex items-center justify-between p-3 border rounded-lg cursor-grab"
             :class="{ 'opacity-0': dragKey === getTplKey(tpl) }"
             draggable="true"
             @dragstart="e => onDragStart(e, tpl)"
             @dragend="onCardDragEnd">
          <div>
            <p class="font-medium flex items-center gap-2">
              {{ tpl.name }}
              <span class="inline-block w-3 h-3 rounded-full border border-slate-300" :style="{ backgroundColor: materialColor(tpl.material) }"></span>
              <span class="text-xs text-slate-500">{{ getMaterialName(tpl.material) }}</span>
            </p>
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
          <v-stage ref="stageRef" :config="{ width: workspace.width, height: workspace.height, draggable: true, scale: {x: scale, y: scale} }"
                   @wheel="onWheel"
                   @dragmove="onStageDragMove"
                   @dragend="onStageDragMove">
            <v-layer>
              <!-- Fondo -->
              <v-rect :config="{ x:0, y:0, width: workspace.width, height: workspace.height, fill:'#f8fafc' }" />

              <!-- Grid -->
              <GridLayer :width="workspace.width"
                         :height="workspace.height"
                         :scale="scale"
                         :stageX="stagePosition.x"
                         :stageY="stagePosition.y"
                         :pixelsPerUnit="store.workspacePixelsPerUnit"
                         :unit="store.workspaceUnit"
                         :bbox="wsBBox"/>

              <!-- Límite del área -->
              <v-line :config="{ points: workspaceFlatPoints, closed:true, stroke:'#22c55e', strokeWidth:3, lineJoin:'round', fill:'rgba(34,197,94,0.06)' }" />

              <!-- Anaqueles -->
              <template v-for="rack in racks" :key="rack.id">
                <v-group :config="{ x: rack.x, y: rack.y, draggable: true }"
                         @dragstart="() => onRackDragStart(rack)"
                         @dragmove="e => onRackDragMove(rack, e)"
                         @dragend="e => onRackDragEnd(rack, e)"
                         @dblclick="onRackDblClick(rack)"
                         @click="select(rack.id)">
                  <template v-if="rack.type==='barrel'">
                    <v-circle :config="{ x: (rack.width/2), y: (rack.width/2), radius: rack.width/2, stroke: invalidMap[rack.id] ? '#ef4444' : '#0ea5e9', fill: materialColor(rack.material) }" />
                    <v-text :config="{ x:8, y: rack.width + 4, text:rack.name, fontSize:14, fill:'#0f172a' }" />
                    <v-text :config="{ x:8, y: rack.width + 22, text: capacityExceeded ? 'Capacidad excedida' : '', fontSize:12, fill:'#ef4444' }" />
                  </template>
                  <template v-else>
                    <v-rect :config="{ x:0, y:0, width:rack.width, height:rack.height, stroke: invalidMap[rack.id] ? '#ef4444' : '#0ea5e9', cornerRadius:8, fill: materialColor(rack.material) }" />
                    <v-line :config="{ points:[0,0, rack.width,0], stroke:'#e2e8f0', strokeWidth:1 }" />
                    <v-text :config="{ x:8, y:8, text:rack.name, fontSize:14, fill:'#0f172a' }" />
                  </template>
                </v-group>
              </template>
            </v-layer>
        </v-stage>
          <!-- Rulers overlay -->
          <RulersOverlay :width="workspace.width"
                         :height="workspace.height"
                         :scale="scale"
                         :stageX="stagePosition.x"
                         :stageY="stagePosition.y"
                         :pixelsPerUnit="store.workspacePixelsPerUnit"
                         :unit="store.workspaceUnit"/>
        </div>
      </div>
    </section>

    <!-- Editor de área: crear/editar -->
    <WorkspaceEditor
      :open="wsEditor.open"
      :value="wsEditor.value"
      :canvasW="workspace.width"
      :canvasH="workspace.height"
      @save="saveWorkspace"
      @cancel="closeWsEditor"
    />

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
import { computed, ref, reactive } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import Toolbar from './Toolbar.vue'
import MaterialSelector from './MaterialSelector.vue'
import WorkspaceEditor from './WorkspaceEditor.vue'
import GridLayer from './GridLayer.vue'
import RulersOverlay from './RulersOverlay.vue'
import { isRectInsidePolygon as geomIsRectInside, isCircleInsidePolygon as geomIsCircleInside, polygonArea } from '../utils/geom'
import { useRouter } from 'vue-router'

const store = useInventoryStore()
const router = useRouter()

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

  // Polígono del área actual
  const wsPolygon = computed(() => store.workspacePolygon)
  const workspaceFlatPoints = computed(() => wsPolygon.value.flatMap(p => [p.x, p.y]))
  const wsBBox = computed(() => {
    const poly = wsPolygon.value || []
    if (!poly.length) return { minX: 0, minY: 0, maxX: workspace.value.width, maxY: workspace.value.height }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of poly){
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    if (minX === maxX) maxX = minX + 1
    if (minY === maxY) maxY = minY + 1
    return { minX, minY, maxX, maxY }
  })
  // Capacidad de superficie
  const workspaceAreaPx2 = computed(() => polygonArea(wsPolygon.value || []))
  function rackAreaPx2(r){
    if ((r.type || 'rectangle') === 'barrel'){
      const d = Number(r.width)
      const radsq = (d/2) * (d/2)
      return Math.PI * radsq
    }
    return Number(r.width) * Number(r.height)
  }
  const totalOccupiedPx2 = computed(() => racks.value.reduce((acc, r) => acc + rackAreaPx2(r), 0))
  const capacityExceeded = computed(() => totalOccupiedPx2.value > workspaceAreaPx2.value)

const canvasContainer = ref(null)
const stageRef = ref(null)
const stagePosition = ref({ x: 0, y: 0 })

// Zoom con rueda del ratón en el área actual
function onWheel(e){
  // Evitar scroll de página/contenedor mientras se hace zoom
  e?.evt?.preventDefault?.()
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const oldScale = Number(scale.value) || 1
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const scaleBy = 1.05
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
  // Punto fijo del puntero antes de cambiar escala
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }
  // Limitar factor de zoom
  scale.value = Math.min(5, Math.max(0.2, newScale))
  // Reposicionar para mantener el foco bajo el puntero
  const newPos = {
    x: pointer.x - mousePointTo.x * scale.value,
    y: pointer.y - mousePointTo.y * scale.value,
  }
  stage.position(newPos)
  stage.batchDraw()
  // Actualizar posición para grid/rulers
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

function onStageDragMove(){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

function toHumanType(t){
  if (t==='barrel') return 'Barril'
  if (t==='square') return 'Cuadrado'
  return 'Rectángulo'
}

// Quitar mapeo hardcodeado y usar datos de materiales
const materials = computed(() => store.materials)
function materialColor(id){
  const m = materials.value.find(x => x.id === id)
  return m?.color || '#ffffff'
}
function getMaterialName(id){
  const m = materials.value.find(x => x.id === id)
  return m?.name || '-'
}

function drawRoundedRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+rr, y)
  ctx.lineTo(x+w-rr, y)
  ctx.quadraticCurveTo(x+w, y, x+w, y+rr)
  ctx.lineTo(x+w, y+h-rr)
  ctx.quadraticCurveTo(x+w, y+h, x+w-rr, y+h)
  ctx.lineTo(x+rr, y+h)
  ctx.quadraticCurveTo(x, y+h, x, y+h-rr)
  ctx.lineTo(x, y+rr)
  ctx.quadraticCurveTo(x, y, x+rr, y)
  ctx.closePath()
}

function createDragPreviewCanvas(tpl){
  // Obtener dimensiones según tipo
  let w, h
  const type = tpl.type || 'rectangle'
  if (type === 'square') {
    const side = Number(tpl.side || tpl.width || tpl.height || 100)
    w = side; h = side
  } else if (type === 'barrel') {
    const d = Number(tpl.diameter || tpl.width || 80)
    w = d; h = d
  } else {
    w = Number(tpl.width || 120)
    h = Number(tpl.height || 80)
  }

  // Escalar a previsualización (máx 160px mayor dimensión)
  const maxDim = 160
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const pad = 12
  const dpr = window.devicePixelRatio || 1
  const cw = Math.ceil((w*scale + pad*2) * dpr)
  const ch = Math.ceil((h*scale + pad*2) * dpr)

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  canvas.style.width = `${cw/dpr}px`
  canvas.style.height = `${ch/dpr}px`
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // Fondo transparente con sombra suave
  ctx.clearRect(0,0, cw, ch)
  ctx.save()
  ctx.translate(pad, pad)

  const fill = materialColor(tpl.material)
  const stroke = '#0ea5e9'
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  if (tpl.type === 'barrel') {
    const r = (w*scale)/2
    ctx.beginPath()
    ctx.arc(r, r, r, 0, Math.PI*2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else {
    const rw = w*scale
    const rh = h*scale
    drawRoundedRect(ctx, 0, 0, rw, rh, 8)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()

  return { canvas, offsetX: (w*scale)/2 + pad, offsetY: (h*scale)/2 + pad }
}

function addFromTpl(tpl){
  store.addRackFromTemplate(`${tpl.__source || 'builtin'}:${tpl.id}`, { x: 50 + Math.random()*100, y: 50 + Math.random()*100 })
}
const dragKey = ref(null)
const previewElRef = ref(null)
function getTplKey(tpl){ return `${tpl.__source || 'builtin'}:${tpl.id}` }

function onCardDragEnd(){
  dragKey.value = null
  if (previewElRef.value) {
    try { previewElRef.value.remove() } catch {}
    previewElRef.value = null
  }
}

function onDragStart(e, tpl){
  try {
    const key = getTplKey(tpl)
    dragKey.value = key
    e.dataTransfer.setData('text/plain', key)
    e.dataTransfer.effectAllowed = 'copy'

    // Vista previa real con canvas temporal durante todo el drag
    const preview = createDragPreviewCanvas(tpl)
    if (preview?.canvas) {
      const el = preview.canvas
      el.style.position = 'fixed'
      el.style.top = '-1000px'
      el.style.left = '0'
      el.style.pointerEvents = 'none'
      document.body.appendChild(el)
      previewElRef.value = el
      e.dataTransfer.setDragImage(el, preview.offsetX, preview.offsetY)
    }
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
  const x = Math.round((clientX - rect.left + container.scrollLeft) / scale.value)
  const y = Math.round((clientY - rect.top + container.scrollTop) / scale.value)

  const tpl = findTemplateByKey(key)
  if (!tpl) return
  const geom = getGeomForTemplate(tpl, x, y)
  if (willCollideWithGeom(geom) || !geomInsideWorkspace(geom)) {
    // bloquear colocación
    return
  }
  // Verificar capacidad de superficie
  const addArea = geom.kind === 'circle' ? Math.PI * geom.r * geom.r : geom.w * geom.h
  if ((totalOccupiedPx2.value + addArea) > workspaceAreaPx2.value) {
    return
  }
  store.addRackFromTemplate(key, { x, y })
}
function onRackDragStart(rack){
  prevPos[rack.id] = { x: rack.x, y: rack.y }
  invalidMap[rack.id] = false
}
function onRackDragMove(rack, e){
  const x = Math.round(e.target.x())
  const y = Math.round(e.target.y())
  let bad = willCollideAt(rack.id, x, y)
  // Validar límites del área
  bad = bad || !isInsideWorkspace(rack, x, y)
  invalidMap[rack.id] = bad
}
function onRackDragEnd(rack, e){
  const x = Math.round(e.target.x())
  const y = Math.round(e.target.y())
  const coll = willCollideAt(rack.id, x, y)
  const out = !isInsideWorkspace(rack, x, y)
  const bad = coll || out
  if (bad) {
    const prev = prevPos[rack.id]
    if (prev) {
      // revertir posición visual y no guardar
      e.target.position({ x: prev.x, y: prev.y })
      e.target.getLayer()?.batchDraw?.()
    }
  } else {
    store.updateRackPosition(rack.id, x, y)
  }
  invalidMap[rack.id] = false
}

// Validación de colisión al soltar desde la lista
function findTemplateByKey(key){
  const [source, id] = (key || '').split(':')
  return templates.value.find(t => `${t.__source || 'builtin'}:${t.id}` === `${source}:${id}`)
}
function getGeomForTemplate(tpl, x, y){
  const type = tpl.type || 'rectangle'
  if (type === 'barrel'){
    const d = Number(tpl.diameter || tpl.width || 80)
    return { kind: 'circle', cx: x + d/2, cy: y + d/2, r: d/2 }
  }
  if (type === 'square'){
    const side = Number(tpl.side || tpl.width || tpl.height || 100)
    return { kind: 'rect', x, y, w: side, h: side }
  }
  const w = Number(tpl.width || 120)
  const h = Number(tpl.height || 80)
  return { kind: 'rect', x, y, w, h }
}
function willCollideWithGeom(geom){
  for (const r of racks.value) {
    const g2 = getRackGeom(r, r.x, r.y)
    if (geomsOverlapStrict(geom, g2)) return true
  }
  return false
}

// Navegar al detalle de un anaquel
function goDetail(id){
  if (!id) return
  // Guardamos selección opcionalmente
  store.setCurrentRack(id)
  router.push({ name: 'shelf', params: { id } })
}

// Doble click: solo entrar si el elemento tiene hijos (estantes)
function onRackDblClick(rack){
  if (!rack) return
  const hasChildren = Array.isArray(rack.shelves) && rack.shelves.length > 0
  if (!hasChildren) return
  goDetail(rack.id)
}

// Selección simple
function select(id){
  if (!id) return
  store.setCurrentRack(id)
}

// Validar límites contra polígono del workspace
function isInsideWorkspace(rack, x, y){
  const poly = wsPolygon.value
  if (!poly?.length) return true
  if ((rack.type || 'rectangle') === 'barrel'){
    const d = Number(rack.width)
    const cx = x + d/2
    const cy = y + d/2
    const r = d/2
    return geomIsCircleInside(cx, cy, r, poly)
  }
  return geomIsRectInside(x, y, Number(rack.width), Number(rack.height), poly)
}
function geomInsideWorkspace(geom){
  const poly = wsPolygon.value
  if (!poly?.length) return true
  if (geom.kind === 'circle') return geomIsCircleInside(geom.cx, geom.cy, geom.r, poly)
  if (geom.kind === 'rect') return geomIsRectInside(geom.x, geom.y, geom.w, geom.h, poly)
  return true
}

// Estado para validación de colisiones durante drag
const invalidMap = reactive({})
const prevPos = reactive({})

function getRackGeom(r, x, y){
  if ((r.type || 'rectangle') === 'barrel') {
    const d = Number(r.width)
    return { kind: 'circle', cx: x + d/2, cy: y + d/2, r: d/2 }
  }
  return { kind: 'rect', x, y, w: Number(r.width), h: Number(r.height) }
}
function rectsOverlapStrict(a,b){
  return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
}
function circlesOverlapStrict(a,b){
  const dx = a.cx - b.cx
  const dy = a.cy - b.cy
  const dist2 = dx*dx + dy*dy
  const rsum = a.r + b.r
  return dist2 < rsum*rsum
}
function circleRectOverlapStrict(c, r){
  const nx = Math.max(r.x, Math.min(c.cx, r.x + r.w))
  const ny = Math.max(r.y, Math.min(c.cy, r.y + r.h))
  const dx = c.cx - nx
  const dy = c.cy - ny
  return (dx*dx + dy*dy) < (c.r * c.r)
}
function geomsOverlapStrict(g1, g2){
  if (g1.kind === 'rect' && g2.kind === 'rect') return rectsOverlapStrict(g1,g2)
  if (g1.kind === 'circle' && g2.kind === 'circle') return circlesOverlapStrict(g1,g2)
  if (g1.kind === 'circle' && g2.kind === 'rect') return circleRectOverlapStrict(g1,g2)
  if (g1.kind === 'rect' && g2.kind === 'circle') return circleRectOverlapStrict(g2,g1)
  return false
}
function willCollideAt(id, x, y){
  const me = racks.value.find(r => r.id === id)
  if (!me) return false
  const g1 = getRackGeom(me, x, y)
  for (const r of racks.value) {
    if (r.id === id) continue
    const g2 = getRackGeom(r, r.x, r.y)
    if (geomsOverlapStrict(g1, g2)) return true
  }
  return false
}

// Editor de área (crear/editar)
const wsEditor = reactive({ open: false, value: null })
function openEditWsModal(){
  const ws = store.currentWorkspace
  if (!ws) return
  wsEditor.open = true
  wsEditor.value = { id: ws.id, name: ws.name, shape: ws.shape || 'custom', polygon: ws.polygon || [], unit: store.workspaceUnit, pixelsPerUnit: store.workspacePixelsPerUnit }
}
function closeWsEditor(){ wsEditor.open = false; wsEditor.value = null }
function saveWorkspace(payload){
  if (payload.id){
    // Validar racks dentro del nuevo polígono
    const outIds = []
    for (const r of racks.value){
      const inside = isInsideWorkspace(r, r.x, r.y)
      if (!inside) outIds.push(r.id)
    }
    if (outIds.length){
      store.currentWorkspace.racks = store.currentWorkspace.racks.filter(r => !outIds.includes(r.id))
    }
    store.updateWorkspace(payload.id, { name: payload.name, polygon: payload.polygon, shape: payload.shape, unit: payload.unit, pixelsPerUnit: payload.pixelsPerUnit })
  } else {
    store.addWorkspace(payload.name, { polygon: payload.polygon, shape: payload.shape, unit: payload.unit, pixelsPerUnit: payload.pixelsPerUnit })
  }
  closeWsEditor()
}

// Modal nueva área
const newWsOpen = ref(false)
const newWsName = ref('')
function openNewWsModal(){ newWsOpen.value = true }
function closeNewWsModal(){ newWsOpen.value = false; newWsName.value = '' }
function createWorkspace(){
  // Abrir editor con rect por defecto y nombre
  wsEditor.open = true
  wsEditor.value = { id: null, name: newWsName.value || '', shape: 'rectangle', unit: 'm', pixelsPerUnit: 100, polygon: [ { x:10, y:10 }, { x: workspace.value.width-10, y:10 }, { x:workspace.value.width-10, y: workspace.value.height-10 }, { x:10, y: workspace.value.height-10 } ] }
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

// Limpiar anaqueles
function clearRacks(){
  store.clearRacks()
}
</script>

<style scoped>
</style>
