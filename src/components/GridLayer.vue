<template>
  <v-shape :config="{ listening: false }" :sceneFunc="draw"></v-shape>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Tamaño del lienzo/stage en px (mundo)
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  // Escala actual del Stage
  scale: { type: Number, required: true },
  // Posición actual del Stage (en px pantalla)
  stageX: { type: Number, required: true },
  stageY: { type: Number, required: true },
  // Unidades y escala
  pixelsPerUnit: { type: Number, required: true }, // px por unidad (m o cm)
  unit: { type: String, default: 'm' }, // 'm' | 'cm'
  // Polígono de recorte (opcional)
  polygon: { type: Array, default: () => [] }, // [{x,y}, ...]
})

function niceStep(targetPx, pxPerUnit) {
  // Devuelve un tamaño de paso en unidades (no px), elegible entre 1,2,5 * 10^n, de modo que el tamaño en px ~ targetPx
  if (!pxPerUnit || pxPerUnit <= 0) return 1
  const approxUnits = targetPx / pxPerUnit
  if (approxUnits <= 0) return 1
  const pow10 = Math.pow(10, Math.floor(Math.log10(approxUnits)))
  const candidates = [1, 2, 5].map(c => c * pow10)
  let best = candidates[0]
  let bestErr = Math.abs(best - approxUnits)
  for (const c of candidates) {
    const err = Math.abs(c - approxUnits)
    if (err < bestErr) { best = c; bestErr = err }
  }
  return best
}

const draw = (ctx, shape) => {
  const w = props.width
  const h = props.height
  const scale = props.scale || 1
  const stageX = props.stageX || 0
  const stageY = props.stageY || 0
  const ppu = Number(props.pixelsPerUnit) || 100
  const unit = props.unit === 'cm' ? 'cm' : 'm'

  // Convertir viewport visible en coords de mundo (px del mundo)
  const viewW = w / scale
  const viewH = h / scale
  const worldX0 = -stageX / scale
  const worldY0 = -stageY / scale

  // Densidad de grilla adaptativa
  const pxPerUnitOnScreen = ppu * scale
  const minorTargetPx = 35 // ~35px entre líneas menores
  let stepUnits = niceStep(minorTargetPx, pxPerUnitOnScreen)
  // Limitar para no dibujar demasiadas líneas
  if (stepUnits <= 0) stepUnits = 1
  const stepPxWorld = stepUnits * ppu

  // Paso mayor: 10x del menor o 100cm -> 1m cuando unit=cm
  let majorUnits = stepUnits * 10
  if (unit === 'cm') {
    // Etiquetas principales cada 100 cm (1 m) preferentemente
    if (stepUnits < 100) majorUnits = 100
    else majorUnits = stepUnits * 10
  }
  const majorPxWorld = majorUnits * ppu

  ctx.save()
  // Clip al polígono si se proporciona
  if (props.polygon && props.polygon.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(props.polygon[0].x, props.polygon[0].y)
    for (let i = 1; i < props.polygon.length; i++) ctx.lineTo(props.polygon[i].x, props.polygon[i].y)
    ctx.closePath()
    ctx.clip()
  }

  // Fondo opcional no se pinta aquí (ya existe en capa inferior)

  // Calcular rangos visibles para líneas verticales y horizontales (en mundo)
  const startX = Math.floor(worldX0 / stepPxWorld) * stepPxWorld
  const endX = worldX0 + viewW
  const startY = Math.floor(worldY0 / stepPxWorld) * stepPxWorld
  const endY = worldY0 + viewH

  // Estilos
  const minorColor = '#e5e7eb' // slate-200
  const majorColor = '#cbd5e1' // slate-300

  // Dibujar líneas verticales
  ctx.beginPath()
  for (let xw = startX; xw <= endX; xw += stepPxWorld) {
    const isMajor = (Math.round((xw) / majorPxWorld) === (xw) / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = isMajor ? 1.2 : 0.6
    ctx.moveTo(xw, worldY0)
    ctx.lineTo(xw, endY)
  }
  ctx.stroke()

  // Dibujar líneas horizontales
  ctx.beginPath()
  for (let yw = startY; yw <= endY; yw += stepPxWorld) {
    const isMajor = (Math.round((yw) / majorPxWorld) === (yw) / majorPxWorld)
    ctx.strokeStyle = isMajor ? majorColor : minorColor
    ctx.lineWidth = isMajor ? 1.2 : 0.6
    ctx.moveTo(worldX0, yw)
    ctx.lineTo(endX, yw)
  }
  ctx.stroke()

  ctx.restore()
}
</script>

