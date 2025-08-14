// Datos mock iniciales de materiales y anaqueles
export const materials = [
  { id: 'wood', name: 'Madera', maxWeight: 100 },
  { id: 'metal', name: 'Metal', maxWeight: 200 },
  { id: 'plastic', name: 'Plástico', maxWeight: 50 },
]

export const shelfTemplates = [
  { id: 's-1', name: 'Anaquel Pequeño', width: 120, height: 60, depth: 40, material: 'wood', shelves: 2 },
  { id: 's-2', name: 'Anaquel Mediano', width: 180, height: 120, depth: 45, material: 'metal', shelves: 3 },
  { id: 's-3', name: 'Anaquel Grande', width: 240, height: 180, depth: 60, material: 'plastic', shelves: 4 },
]

// Áreas de trabajo iniciales de ejemplo
export const initialWorkspaces = [
  { name: 'Almacén Principal' },
  { name: 'Depósito Secundario' },
]

// Zona de trabajo (metros transformados a px arbitrariamente)
export const workspace = {
  width: 1200,
  height: 700,
}
