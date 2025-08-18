<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="onCancel"></div>
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-4 mt-24 max-h-[90vh] overflow-y-auto">
      <h3 class="text-lg font-semibold mb-3">Área de Trabajo</h3>

      <div class="grid gap-4 md:grid-cols-5">
        <div class="md:col-span-3">
          <div class="border rounded-lg overflow-hidden relative">
            <v-stage ref="stageRef" :config="{ width: canvasW, height: canvasH, draggable: true, scale: {x: stageScale, y: stageScale} }"
                        @wheel="onWheel"
                        @dragmove="onStageDragMove"
                        @dragend="onStageDragMove">
              <!-- Capa recortada: fondo + grilla -->
              <v-layer :config="{ listening: false }">
                <v-rect :config="{ x:0, y:0, width: canvasW, height: canvasH, fill:'#f8fafc' }" />
                <!-- Grid -->
                <GridLayer :width="canvasW"
                           :height="canvasH"
                           :scale="stageScale"
                           :stageX="stagePosition.x"
                           :stageY="stagePosition.y"
                           :pixelsPerUnit="local.pixelsPerUnit"
                           :unit="local.unit"
                           :bbox="gridBBox"/>
              </v-layer>

              <!-- Capa de elementos editables (sin clipping) -->
              <v-layer @mousedown="onCanvasClick">
                <!-- Polígono editable -->
                <v-line :config="{ points: flatPoints, closed:true, stroke:'#0ea5e9', fill:'rgba(14,165,233,0.08)', strokeWidth:2 }" />
                <!-- Etiquetas de segmentos -->
                <template v-for="(seg, i) in segments" :key="'seg-'+i">
                  <v-text :config="{ x: seg.mx, y: seg.my, text: seg.label, fontSize: 12, fill:'#334155' }" />
                </template>

                <!-- Guías y coordenadas durante drag -->
                <template v-if="dragging">
                  <v-line :config="{ points:[guidePos.x,0, guidePos.x, canvasH], stroke:'#94a3b8', dash:[4,4], strokeWidth:1 }" />
                  <v-line :config="{ points:[0,guidePos.y, canvasW, guidePos.y], stroke:'#94a3b8', dash:[4,4], strokeWidth:1 }" />
                  <v-rect :config="{ x: guidePos.x + 8, y: guidePos.y + 8, width: 80, height: 22, fill:'rgba(255,255,255,0.8)', stroke:'#cbd5e1', cornerRadius:4 }" />
                  <v-text :config="{ x: guidePos.x + 12, y: guidePos.y + 12, text: guideLabel, fontSize: 12, fill:'#0f172a' }" />
                </template>

                <!-- Vértices -->
                <template v-for="(p, idx) in local.polygon" :key="idx">
                  <v-circle :config="{ x:p.x, y:p.y, radius: selectedIdx===idx?7:6, fill:selectedIdx===idx?'#0284c7':'#0ea5e9', draggable:true, stroke:selectedIdx===idx?'#0284c7':'#0ea5e9', strokeWidth:selectedIdx===idx?2:1 }"
                            @click="() => selectVertex(idx)"
                            @dragmove="e => onPointDrag(idx, e)"
                            @dragend="e => onPointDragEnd(idx, e)"/>
                </template>

                <!-- Indicador de cerrar polígono en modo agregar -->
                <template v-if="adding">
                  <v-text :config="{ x: 8, y: 8, text: 'Clic para agregar vértices. Doble clic para cerrar.', fontSize: 14, fill:'#0f172a' }" />
                </template>
              </v-layer>
            </v-stage>
            <!-- Rulers overlay -->
            <RulersOverlay :width="canvasW"
                           :height="canvasH"
                           :scale="stageScale"
                           :stageX="stagePosition.x"
                           :stageY="stagePosition.y"
                           :pixelsPerUnit="local.pixelsPerUnit"
                           :unit="local.unit"/>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button class="btn btn-outline" :class="{ 'ring-2 ring-sky-500': adding }" @click="toggleAddMode">{{ adding ? 'Salir de modo añadir vértice' : 'Modo añadir vértice' }}</button>
            <button class="btn btn-outline" :disabled="selectedIdx===-1" @click="deleteSelected">Eliminar vértice</button>
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-600">Restricción:</label>
              <select class="border rounded-lg px-2 py-1" v-model="dragConstraint">
                <option value="free">Libre</option>
                <option value="x">Solo X</option>
                <option value="y">Solo Y</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-600">Margen (px)</label>
              <input type="number" min="0" class="w-20 border rounded-lg px-2 py-1" v-model.number="dragMarginPx" />
            </div>
            <button class="btn btn-outline" :disabled="local.polygon.length < 3" @click="resetRect">Rectángulo</button>
          </div>
          <div class="mt-1 text-xs" :class="notice ? 'text-rose-600' : 'text-transparent'">{{ notice || '.' }}</div>
        </div>
        <div class="md:col-span-2 space-y-3">
          <div class="card p-3">
            <label class="text-xs text-slate-600">Nombre</label>
            <input class="w-full border rounded-lg px-3 py-2" v-model="local.name" placeholder="Ej. Bodega A" />
          </div>
          <div class="card p-3">
            <h4 class="font-medium mb-2">Forma</h4>
            <select class="w-full border rounded-lg px-3 py-2" v-model="local.shape" @change="onShapeChange">
              <option value="rectangle">Rectángulo</option>
              <option value="l">L simple</option>
              <option value="custom">Personalizada</option>
            </select>
            <div v-if="local.shape==='rectangle'" class="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label class="text-xs text-slate-600">Ancho (px)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="rectW" />
              </div>
              <div>
                <label class="text-xs text-slate-600">Alto (px)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="rectH" />
              </div>
              <button class="btn btn-outline col-span-2" @click="applyRect">Aplicar</button>
            </div>
            <div v-if="local.shape==='l'" class="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label class="text-xs text-slate-600">Brazo A (ancho)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="lA" />
              </div>
              <div>
                <label class="text-xs text-slate-600">Brazo A (alto)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="lB" />
              </div>
              <div>
                <label class="text-xs text-slate-600">Brazo B (ancho)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="lC" />
              </div>
              <div>
                <label class="text-xs text-slate-600">Brazo B (alto)</label>
                <input type="number" class="w-full border rounded-lg px-2 py-1" v-model.number="lD" />
              </div>
              <button class="btn btn-outline col-span-2" @click="applyL">Aplicar</button>
            </div>
            <div v-if="local.shape==='custom'" class="mt-2 space-y-2">
              <p class="text-xs text-slate-600">Edita los vértices directamente en el lienzo. Cuando termines, aplica los cambios.</p>
              <button class="btn btn-outline" @click="onSave">Aplicar</button>
            </div>
          </div>
          <div class="card p-3">
            <h4 class="font-medium mb-2">Unidades y escala</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-600">Unidad</label>
                <select class="w-full border rounded-lg px-2 py-1" v-model="local.unit">
                  <option value="m">Metros</option>
                  <option value="cm">Centímetros</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-600">Pixeles por {{ local.unit }}</label>
                <input type="number" min="1" class="w-full border rounded-lg px-2 py-1" v-model.number="local.pixelsPerUnit" />
              </div>
            </div>
            <p class="text-sm text-slate-500 mt-2">Área estimada: <b>{{ areaM2.toFixed(2) }} m²</b> (unidad: {{ local.unit }})</p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="btn btn-outline" @click="onCancel">Cancelar</button>
        <button class="btn btn-primary" @click="onSave">{{ local.shape==='custom' ? 'Aplicar' : 'Guardar' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { polygonArea, metersSquaredFromPxSquared } from '../utils/geom'
import GridLayer from './GridLayer.vue'
import RulersOverlay from './RulersOverlay.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  value: { type: Object, default: null }, // { id?, name, polygon, shape, unit, pixelsPerUnit }
  canvasW: { type: Number, default: 1200 },
  canvasH: { type: Number, default: 700 },
})
const emit = defineEmits(['save','cancel'])

const local = reactive({ id:null, name:'', shape:'custom', polygon:[], unit:'m', pixelsPerUnit: 100 })

// Estado de edición y restricciones
const dragConstraint = ref('free') // 'free' | 'x' | 'y'
const dragMarginPx = ref(100)
const selectedIdx = ref(-1)
const dragging = ref(false)
const guidePos = reactive({ x: 0, y: 0 })
const notice = ref('')

watch(() => props.value, (v) => {
  if (!v) return
  local.id = v.id || null
  local.name = v.name || ''
  local.shape = v.shape || 'custom'
  local.unit = v.unit || 'm'
  local.pixelsPerUnit = v.pixelsPerUnit || 100
  local.polygon = (v.polygon && v.polygon.length >= 3) ? v.polygon.map(p => ({ x: p.x, y: p.y })) : defaultRect()
}, { immediate: true })

const canvasW = computed(() => props.canvasW)
const canvasH = computed(() => props.canvasH)

// Bounding box del polígono para la grilla
const gridBBox = computed(() => {
  const pts = local.polygon
  if (!pts || pts.length === 0) return { minX: 0, minY: 0, maxX: canvasW.value, maxY: canvasH.value }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  // En caso de que todos los puntos coincidan, asegurar un bbox mínimo
  if (minX === maxX) maxX = minX + 1
  if (minY === maxY) maxY = minY + 1
  return { minX, minY, maxX, maxY }
})

// Zoom / Pan
const stageRef = ref(null)
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })
function onWheel(e){
  // Evita el scroll de página cuando se hace zoom con la rueda
  e?.evt?.preventDefault?.()
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const oldScale = stageScale.value
  const pointer = stage.getPointerPosition()
  const scaleBy = 1.05
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }
  stageScale.value = Math.min(5, Math.max(0.2, newScale))
  const newPos = {
    x: pointer.x - mousePointTo.x * stageScale.value,
    y: pointer.y - mousePointTo.y * stageScale.value,
  }
  stage.position(newPos)
  stage.batchDraw()
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

function onStageDragMove(){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  stagePosition.value = { x: stage.x(), y: stage.y() }
}

const flatPoints = computed(() => local.polygon.flatMap(p => [p.x, p.y]))
const areaPx2 = computed(() => polygonArea(local.polygon))
const areaM2 = computed(() => metersSquaredFromPxSquared(areaPx2.value, local.pixelsPerUnit, local.unit))

const guideLabel = computed(() => {
  const ppu = Number(local.pixelsPerUnit)||100
  const u = local.unit === 'cm' ? 'cm' : 'm'
  const ux = guidePos.x / ppu
  const uy = guidePos.y / ppu
  const fmt = (val) => u==='cm' ? val.toFixed(0) : val.toFixed(2)
  return `${fmt(ux)}, ${fmt(uy)} ${u}`
})

// Longitudes de segmentos
function dist(a,b){ const dx=b.x-a.x, dy=b.y-a.y; return Math.sqrt(dx*dx+dy*dy) }
const segments = computed(() => {
  const pts = local.polygon
  if (!pts || pts.length < 2) return []
  const segs = []
  for (let i=0; i<pts.length; i++){
    const a = pts[i]
    const b = pts[(i+1) % pts.length]
    const dpx = dist(a,b)
    const du = dpx / (Number(local.pixelsPerUnit)||100)
    const val = local.unit === 'cm' ? du.toFixed(0) : du.toFixed(2)
    const label = `${val} ${local.unit}`
    segs.push({ mx: (a.x+b.x)/2 + 4, my: (a.y+b.y)/2 + 4, label })
  }
  return segs
})

function defaultRect() {
  return [ { x: 10, y: 10 }, { x: props.canvasW - 10, y: 10 }, { x: props.canvasW - 10, y: props.canvasH - 10 }, { x: 10, y: props.canvasH - 10 } ]
}

function bboxOfOthers(excludeIdx){
  const pts = local.polygon.filter((_,i) => i !== excludeIdx)
  if (!pts.length) return { minX: 0, minY: 0, maxX: canvasW.value, maxY: canvasH.value }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts){ minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }
  return { minX, minY, maxX, maxY }
}
function applyConstraint(idx, x, y){
  const mode = dragConstraint.value
  const orig = local.polygon[idx]
  let nx = x, ny = y
  if (mode === 'x') ny = orig.y
  else if (mode === 'y') nx = orig.x
  // Limitar por bounding box de los otros puntos + margen
  const bb = bboxOfOthers(idx)
  const m = Number(dragMarginPx.value) || 0
  const minX = bb.minX - m, maxX = bb.maxX + m, minY = bb.minY - m, maxY = bb.maxY + m
  nx = Math.max(minX, Math.min(nx, maxX))
  ny = Math.max(minY, Math.min(ny, maxY))
  return { x: Math.round(nx), y: Math.round(ny) }
}
function onPointDrag(idx, e) {
  dragging.value = true
  selectedIdx.value = idx
  const x = e.target.x()
  const y = e.target.y()
  const p = applyConstraint(idx, x, y)
  local.polygon[idx].x = p.x
  local.polygon[idx].y = p.y
  guidePos.x = p.x
  guidePos.y = p.y
}
function onPointDragEnd(idx, e) {
  // aplicar una última vez por seguridad y limpiar estado de guía
  onPointDrag(idx, e)
  dragging.value = false
}

const adding = ref(false)
function toggleAddMode(){ adding.value = !adding.value }
function stageToLocal(pos){
  const stage = stageRef.value?.getNode?.()
  if (!stage) return { x: pos?.x||0, y: pos?.y||0 }
  const scale = stageScale.value || 1
  return { x: (pos.x - stage.x()) / scale, y: (pos.y - stage.y()) / scale }
}
function onCanvasClick(){
  const stage = stageRef.value?.getNode?.()
  const pointer = stage?.getPointerPosition?.()
  if (!pointer) return
  const p = stageToLocal(pointer)
  if (adding.value){
    local.polygon.push({ x: Math.round(p.x), y: Math.round(p.y) })
    selectedIdx.value = local.polygon.length - 1
  } else {
    // si no estamos añadiendo, limpiar selección al hacer click vacío (aprox)
    selectedIdx.value = -1
  }
}

function resetRect(){ local.shape='rectangle'; applyRect() }
const rectW = ref(1000)
const rectH = ref(600)
function applyRect(){
  const w = Math.max(40, rectW.value)
  const h = Math.max(40, rectH.value)
  local.polygon = [ { x: 10, y: 10 }, { x: 10 + w, y: 10 }, { x: 10 + w, y: 10 + h }, { x: 10, y: 10 + h } ]
  selectedIdx.value = -1
}

// L simple como polígono (en forma de U cerrada sin huecos)
const lA = ref(600), lB = ref(300), lC = ref(300), lD = ref(600)
function applyL(){
  const A = Math.max(40, lA.value)
  const B = Math.max(40, lB.value)
  const C = Math.max(40, lC.value)
  const D = Math.max(40, lD.value)
  const x0 = 10, y0 = 10
  // Construimos una L convencional con 6 puntos
  local.polygon = [
    { x: x0, y: y0 },
    { x: x0 + A, y: y0 },
    { x: x0 + A, y: y0 + B },
    { x: x0 + A - C, y: y0 + B },
    { x: x0 + A - C, y: y0 + D },
    { x: x0, y: y0 + D },
  ]
  selectedIdx.value = -1
}

function onShapeChange() {
  if (local.shape === 'rectangle') {
    applyRect()
  } else if (local.shape === 'l') {
    applyL()
  }
}

function selectVertex(idx){
  selectedIdx.value = idx
}

function deleteSelected(){
  notice.value = ''
  if (selectedIdx.value === -1) return
  if ((local.polygon?.length || 0) <= 3){
    notice.value = 'No se puede eliminar: el polígono debe tener al menos 3 vértices.'
    return
  }
  local.polygon.splice(selectedIdx.value, 1)
  selectedIdx.value = -1
}

function onSave(){
  notice.value = ''
  // Validar polígono
  const pts = local.polygon || []
  if (!Array.isArray(pts) || pts.length < 3){
    notice.value = 'El polígono debe tener al menos 3 vértices.'
    return
  }
  for (let i=0;i<pts.length;i++){
    const p = pts[i]
    const nx = Number(p.x), ny = Number(p.y)
    if (!Number.isFinite(nx) || !Number.isFinite(ny)){
      notice.value = 'Coordenadas de vértices inválidas.'
      return
    }
  }
  // Área > 0
  if ((areaPx2.value || 0) <= 0){
    notice.value = 'El polígono debe tener área mayor a 0.'
    return
  }
  emit('save', { id: local.id, name: local.name.trim() || 'Área', shape: local.shape, polygon: local.polygon, unit: local.unit, pixelsPerUnit: Number(local.pixelsPerUnit) || 100 })
}
function onCancel(){ emit('cancel') }
</script>

<style scoped>
.card { @apply border rounded-lg; }
.btn { @apply px-3 py-2 rounded-lg border; }
.btn-primary { @apply bg-blue-600 text-white border-blue-600; }
.btn-outline { @apply bg-white text-slate-800; }
</style>
