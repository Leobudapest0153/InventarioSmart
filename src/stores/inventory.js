import { defineStore } from 'pinia'
import { materials as baseMaterials, shelfTemplates as builtinTemplates, workspace as baseWorkspace, initialWorkspaces } from '../data/mock'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function buildRackFromTemplate(tpl, position) {
  if (!tpl) return null
  const id = uid()
  const type = tpl.type || 'rectangle'
  const common = {
    id,
    type,
    name: tpl.name,
    x: position?.x ?? 100,
    y: position?.y ?? 100,
    material: tpl.material || 'wood',
  }
  if (type === 'barrel') {
    const diameter = tpl.diameter || tpl.width || 80
    const height = tpl.height || tpl.barrelHeight || 100
    return {
      ...common,
      width: diameter, // usado para escala 2D top-view
      height: diameter,
      depth: tpl.depth ?? 0,
      barrelHeight: height, // altura real del barril
      shelves: [],
    }
  }
  if (type === 'square') {
    const side = tpl.side || tpl.width || tpl.height || 100
    const shelves = Array.from({ length: tpl.shelves || 0 }).map((_, i) => ({
      id: uid(),
      y: ((i + 1) * (side / ((tpl.shelves || 0) + 1))),
      height: 8,
    }))
    return {
      ...common,
      width: side,
      height: side,
      depth: tpl.depth ?? 40,
      shelves,
    }
  }
  // rectangle por defecto
  const shelves = Array.from({ length: tpl.shelves || 0 }).map((_, i) => ({
    id: uid(),
    y: ((i + 1) * ((tpl.height || 120) / ((tpl.shelves || 0) + 1))),
    height: 8,
  }))
  return {
    ...common,
    width: tpl.width || 120,
    height: tpl.height || 80,
    depth: tpl.depth ?? 40,
    shelves,
  }
}

export const useInventoryStore = defineStore('inventory', {
  state: () => {
    // Inicializar áreas con algunos anaqueles de ejemplo
    const workspaces = initialWorkspaces.map((w, idx) => {
      const id = uid()
      const racks = []
      const tpls = [builtinTemplates[0], builtinTemplates[1]].filter(Boolean)
      tpls.forEach((t, i) => {
        const rack = buildRackFromTemplate(t, { x: 60 + i * 200, y: 80 + idx * 40 })
        if (rack) racks.push(rack)
      })
      // Workspace geometry: por defecto, rectángulo del tamaño del lienzo base
      const polygon = w.polygon || [
        { x: 10, y: 10 },
        { x: (baseWorkspace.width - 10), y: 10 },
        { x: (baseWorkspace.width - 10), y: (baseWorkspace.height - 10) },
        { x: 10, y: (baseWorkspace.height - 10) },
      ]
      const shape = w.shape || 'custom' // 'rectangle' | 'l' | 'custom'
      return { id, name: w.name, racks, localTemplates: [], polygon, shape, metersPerPixel: w.metersPerPixel || 0.01 }
    })
    const currentWorkspaceId = workspaces[0]?.id || null

    return {
      materials: baseMaterials,
      workspace: baseWorkspace, // tamaño del lienzo
      workspaces,
      currentWorkspaceId,
      // detalle del anaquel seleccionado
      currentRackId: null,
    }
  },
  getters: {
    currentWorkspace(state) {
      return state.workspaces.find(w => w.id === state.currentWorkspaceId) || null
    },
    racks(state) {
      return (this.currentWorkspace?.racks) || []
    },
    currentRack(state) {
      return this.racks.find(r => r.id === this.currentRackId) || null
    },
    customTemplates() {
      return this.currentWorkspace?.localTemplates || []
    },
    templates() {
      // Combinar built-in y locales. Marcamos la fuente para DnD
      const builtins = builtinTemplates.map(t => ({ ...t, __source: 'builtin' }))
      const locals = (this.customTemplates || []).map(t => ({ ...t, __source: 'custom' }))
      return [...builtins, ...locals]
    },
    workspacePolygon() {
      return this.currentWorkspace?.polygon || []
    },
    workspaceMetersPerPixel() {
      return this.currentWorkspace?.metersPerPixel || 0.01
    }
  },
  actions: {
    // Gestión de áreas
    addWorkspace(name, opts = {}) {
      const id = uid()
      const polygon = opts.polygon || [
        { x: 10, y: 10 },
        { x: (this.workspace.width - 10), y: 10 },
        { x: (this.workspace.width - 10), y: (this.workspace.height - 10) },
        { x: 10, y: (this.workspace.height - 10) },
      ]
      const ws = { id, name: name?.trim() || `Área ${id.slice(-3)}`, racks: [], localTemplates: [], polygon, shape: opts.shape || 'custom', metersPerPixel: opts.metersPerPixel || 0.01 }
      this.workspaces.push(ws)
      this.currentWorkspaceId = id
      this.currentRackId = null
    },
    setCurrentWorkspace(id) {
      if (this.workspaces.some(w => w.id === id)) {
        this.currentWorkspaceId = id
        this.currentRackId = null
      }
    },
    updateWorkspace(id, payload) {
      const idx = this.workspaces.findIndex(w => w.id === id)
      if (idx === -1) return
      this.workspaces[idx] = { ...this.workspaces[idx], ...payload }
    },

    clearRacks() {
      const ws = this.currentWorkspace
      if (ws) ws.racks = []
      this.currentRackId = null
    },

    // Plantillas personalizadas por área
    addCustomTemplate(payload) {
      const ws = this.currentWorkspace
      if (!ws) return null
      const id = `tpl-${uid()}`
      const type = payload.type || 'rectangle'
      const base = { id, name: payload.name?.trim() || `Anaquel ${id.slice(-3)}`, type, material: payload.material || 'wood' }
      let tpl
      if (type === 'barrel') {
        tpl = { ...base, diameter: Number(payload.diameter) || 80, height: Number(payload.height) || 100, depth: 0 }
      } else if (type === 'square') {
        tpl = { ...base, side: Number(payload.side) || 100, depth: Number(payload.depth) || 40, shelves: Number(payload.shelves) || 0 }
      } else {
        tpl = { ...base, width: Number(payload.width) || 120, height: Number(payload.height) || 80, depth: Number(payload.depth) || 40, shelves: Number(payload.shelves) || 0 }
      }
      ws.localTemplates.push(tpl)
      return tpl
    },
    removeCustomTemplate(tplId) {
      const ws = this.currentWorkspace
      if (!ws) return
      ws.localTemplates = ws.localTemplates.filter(t => t.id !== tplId)
    },

    // Crear un anaquel basado en una plantilla (global o local) en el área actual
    addRackFromTemplate(templateKeyOrId, position = { x: 100, y: 100 }) {
      const ws = this.currentWorkspace
      if (!ws) return
      let source = 'auto'
      let id = templateKeyOrId
      if (typeof templateKeyOrId === 'string' && templateKeyOrId.includes(':')) {
        const [s, rest] = templateKeyOrId.split(':')
        source = s
        id = rest
      }
      let tpl = null
      if (source === 'builtin') tpl = builtinTemplates.find(t => t.id === id)
      else if (source === 'custom') tpl = ws.localTemplates.find(t => t.id === id)
      else tpl = builtinTemplates.find(t => t.id === id) || ws.localTemplates.find(t => t.id === id)

      const rack = buildRackFromTemplate(tpl, position)
      if (rack) ws.racks.push(rack)
    },
    setCurrentRack(id) {
      this.currentRackId = id
    },
    updateRackPosition(id, x, y) {
      const r = this.racks.find(r => r.id === id)
      if (r) { r.x = x; r.y = y }
    },
    updateRack(id, payload) {
      const ws = this.currentWorkspace
      if (!ws) return
      const idx = ws.racks.findIndex(r => r.id === id)
      if (idx !== -1) ws.racks[idx] = { ...ws.racks[idx], ...payload }
    },
    removeRack(id) {
      const ws = this.currentWorkspace
      if (!ws) return
      ws.racks = ws.racks.filter(r => r.id !== id)
      if (this.currentRackId === id) this.currentRackId = null
    },
    // Estantes internos (solo para rect/square)
    addShelf(rackId, y) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r || r.type === 'barrel') return
      if (!Array.isArray(r.shelves)) r.shelves = []
      r.shelves.push({ id: uid(), y: y ?? r.height / 2, height: 8 })
    },
    removeShelf(rackId, shelfId) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r || r.type === 'barrel') return
      r.shelves = (r.shelves || []).filter(s => s.id !== shelfId)
    },
    moveShelf(rackId, shelfId, newY) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r || r.type === 'barrel') return
      const s = (r.shelves || []).find(s => s.id === shelfId)
      if (s) s.y = Math.max(4, Math.min(newY, r.height - 4))
    },
  }
})

