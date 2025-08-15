<template>
  <div class="rulers" :style="{ width: width + 'px', height: height + 'px' }">
    <canvas ref="hCanvas" class="ruler ruler-h" :width="width - rulerSize" :height="rulerSize"/>
    <canvas ref="vCanvas" class="ruler ruler-v" :width="rulerSize" :height="height - rulerSize"/>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'

const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, required: true },
  stageX: { type: Number, required: true },
  stageY: { type: Number, required: true },
  pixelsPerUnit: { type: Number, required: true },
  unit: { type: String, default: 'm' },
})

const rulerSize = 28
const hCanvas = ref(null)
const vCanvas = ref(null)

function niceStepPx(targetPx) {
  const pow10 = Math.pow(10, Math.floor(Math.log10(targetPx)))
  const cands = [1, 2, 5].map(c => c * pow10)
  let best = cands[0]
  let bestErr = Math.abs(best - targetPx)
  for (const c of cands) {
    const err = Math.abs(c - targetPx)
    if (err < bestErr) { best = c; bestErr = err }
  }
  return best
}

function drawRulers() {
  const s = Number(props.scale) || 1
  const ppu = Number(props.pixelsPerUnit) || 100
  const stageX = Number(props.stageX) || 0
  const stageY = Number(props.stageY) || 0
  const unit = props.unit === 'cm' ? 'cm' : 'm'

  const innerW = Math.max(0, props.width - rulerSize)
  const innerH = Math.max(0, props.height - rulerSize)

  const targetMinor = 50
  // paso menor en px de pantalla, convertido a mundo (px mundo)
  const minorStepPxScreen = niceStepPx(targetMinor)
  const minorStepPxWorld = minorStepPxScreen / s

  // Ticks mayores cada 1 unidad completa seleccionada
  const majorStepPxWorld = 1 * ppu

  // Horizontal
  const hc = hCanvas.value
  const hctx = hc?.getContext('2d')
  if (hctx) {
    hctx.clearRect(0,0,hc.width, hc.height)
    hctx.fillStyle = '#f8fafc'
    hctx.fillRect(0,0,hc.width, hc.height)
    hctx.strokeStyle = '#94a3b8'
    hctx.fillStyle = '#0f172a'
    hctx.lineWidth = 1

    const worldX0 = -stageX / s
    const worldX1 = worldX0 + (innerW / s)

    const startX = Math.floor(worldX0 / minorStepPxWorld) * minorStepPxWorld
    for (let xw = startX; xw <= worldX1; xw += minorStepPxWorld) {
      const xs = Math.round((xw - worldX0) * s)
      const isMajor = (Math.round(xw / majorStepPxWorld) === xw / majorStepPxWorld)
      const tickH = isMajor ? 14 : 8
      hctx.beginPath()
      hctx.moveTo(xs + 0.5, rulerSize)
      hctx.lineTo(xs + 0.5, rulerSize - tickH)
      hctx.stroke()
      if (isMajor) {
        const unitsVal = xw / ppu
        const label = unit === 'cm' ? `${unitsVal.toFixed(0)} ${unit}` : `${unitsVal.toFixed(2)} ${unit}`
        hctx.font = '10px sans-serif'
        hctx.textAlign = 'center'
        hctx.textBaseline = 'top'
        hctx.fillText(label, xs, 2)
      }
    }
  }

  // Vertical
  const vc = vCanvas.value
  const vctx = vc?.getContext('2d')
  if (vctx) {
    vctx.clearRect(0,0,vc.width, vc.height)
    vctx.fillStyle = '#f8fafc'
    vctx.fillRect(0,0,vc.width, vc.height)
    vctx.strokeStyle = '#94a3b8'
    vctx.fillStyle = '#0f172a'
    vctx.lineWidth = 1

    const worldY0 = -stageY / s
    const worldY1 = worldY0 + (innerH / s)

    const startY = Math.floor(worldY0 / minorStepPxWorld) * minorStepPxWorld
    for (let yw = startY; yw <= worldY1; yw += minorStepPxWorld) {
      const ys = Math.round((yw - worldY0) * s)
      const isMajor = (Math.round(yw / majorStepPxWorld) === yw / majorStepPxWorld)
      const tickW = isMajor ? 14 : 8
      vctx.beginPath()
      vctx.moveTo(rulerSize, ys + 0.5)
      vctx.lineTo(rulerSize - tickW, ys + 0.5)
      vctx.stroke()
      if (isMajor) {
        const unitsVal = yw / ppu
        const label = unit === 'cm' ? `${unitsVal.toFixed(0)} ${unit}` : `${unitsVal.toFixed(2)} ${unit}`
        vctx.save()
        vctx.translate(2, ys)
        vctx.rotate(-Math.PI/2)
        vctx.font = '10px sans-serif'
        vctx.textAlign = 'center'
        vctx.textBaseline = 'top'
        vctx.fillText(label, 0, 0)
        vctx.restore()
      }
    }
  }
}

onMounted(() => {
  drawRulers()
})

onBeforeUnmount(() => {})

watch(() => [props.scale, props.stageX, props.stageY, props.pixelsPerUnit, props.unit, props.width, props.height], () => {
  nextTick(() => drawRulers())
})
</script>

<style scoped>
.rulers { position: absolute; top: 0; left: 0; pointer-events: none; }
.ruler { position: absolute; background: #f8fafc; }
.ruler-h { top: 0; left: 28px; height: 28px; border-bottom: 1px solid #cbd5e1; width: calc(100% - 28px); }
.ruler-v { top: 28px; left: 0; width: 28px; border-right: 1px solid #cbd5e1; height: calc(100% - 28px); }
</style>
