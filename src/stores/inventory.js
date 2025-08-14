import { defineStore } from 'pinia'
import { materials as baseMaterials, shelfTemplates, workspace as baseWorkspace, initialWorkspaces } from '../data/mock'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function createRackFromTemplate(tplId, position) {
  const tpl = shelfTemplates.find(t => t.id === tplId)
  if (!tpl) return null
  const id = uid()
  const shelves = Array.from({ length: tpl.shelves }).map((_, i) => ({
    id: uid(),
    y: ((i + 1) * (tpl.height / (tpl.shelves + 1))),
    height: 8,
  }))
  return {
    id,
    name: tpl.name,
    x: position?.x ?? 100,
    y: position?.y ?? 100,
    width: tpl.width,
    height: tpl.height,
    depth: tpl.depth,
    material: tpl.material,
    shelves,
  }
}

export const useInventoryStore = defineStore('inventory', {
  state: () => {
    // Inicializar áreas con algunos anaqueles de ejemplo
    const workspaces = initialWorkspaces.map((w, idx) => {
      const id = uid()
      const racks = []
      const tpls = [shelfTemplates[0], shelfTemplates[1]].filter(Boolean)
      tpls.forEach((t, i) => {
        const rack = createRackFromTemplate(t.id, { x: 60 + i * 200, y: 80 + idx * 40 })
        if (rack) racks.push(rack)
      })
      return { id, name: w.name, racks }
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
      return this.racks.find(r => r.id === state.currentRackId) || null
    },
  },
  actions: {
    // Gestión de áreas
    addWorkspace(name) {
      const id = uid()
      const ws = { id, name: name?.trim() || `Área ${id.slice(-3)}`, racks: [] }
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

    clearRacks() {
      const ws = this.currentWorkspace
      if (ws) ws.racks = []
      this.currentRackId = null
    },

    // Crear un anaquel basado en una plantilla en el área actual
    addRackFromTemplate(templateId, position = { x: 100, y: 100 }) {
      const ws = this.currentWorkspace
      if (!ws) return
      const rack = createRackFromTemplate(templateId, position)
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
    // Estantes internos
    addShelf(rackId, y) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r) return
      r.shelves.push({ id: uid(), y: y ?? r.height / 2, height: 8 })
    },
    removeShelf(rackId, shelfId) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r) return
      r.shelves = r.shelves.filter(s => s.id !== shelfId)
    },
    moveShelf(rackId, shelfId, newY) {
      const r = this.racks.find(r => r.id === rackId)
      if (!r) return
      const s = r.shelves.find(s => s.id === shelfId)
      if (s) s.y = Math.max(4, Math.min(newY, r.height - 4))
    },
  }
})
