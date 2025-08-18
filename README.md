# Gestor de Inventario 2D (Vue 3 + Vite)

Aplicación web para planificar áreas de almacenamiento en 2D: define áreas de trabajo (poligonales), añade anaqueles desde plantillas, arrástralos en un lienzo con rejilla y reglas, evita solapes y respeta límites. Incluye detalle de anaquel con edición de dimensiones, material y estantes.

## Stack
- Vue 3 (Composition API)
- Vite 5
- Pinia (estado)
- Vue Router 4
- Tailwind CSS 3
- Konva + vue-konva (render 2D)

## Requisitos
- Node.js 18+ (recomendado LTS)
- npm 9+

## Instalación y ejecución
```bash
# instalar dependencias
npm install

# entorno de desarrollo
npm run dev

# build de producción
npm run build

# previsualización del build
npm run preview
```

Por defecto Vite abre en http://localhost:5173 (puerto puede variar).

## Funcionalidades clave
- Áreas de trabajo poligonales: rectángulo, forma en “L” o personalizada editando vértices.
- Unidades y escala configurables por área (m o cm) con píxeles por unidad (ppu); la rejilla y reglas se adaptan.
- Panel de plantillas de anaqueles (built-in + personalizadas por área). Soporta tipos: rectángulo, cuadrado y barril (círculo top‑view).
- Drag & drop desde el panel al lienzo para crear anaqueles. Se bloquea si:
  - colisiona con otro anaquel,
  - queda fuera del polígono del área,
  - excede la capacidad de superficie del área (área ocupada > área del polígono).
- Zoom con la rueda del mouse anclado al puntero y desplazamiento del lienzo por arrastre.
- Rejilla y reglas (horizontal/vertical) con marcas mayores por unidad.
- Selección de material por anaquel (madera, metal, plástico) y cálculo del peso máximo por material (informativo).
- Vista de detalle de anaquel con edición de dimensiones, material y administración de estantes (para figuras rectangulares/cuadradas). Los barriles usan diámetro y altura real (barrelHeight).

## Flujo de uso
1. En “Inventario” selecciona o crea un Área de Trabajo.
2. (Opcional) Edita el área con “Editar Área”: ajusta forma (rectángulo/L/custom), vértices, unidades (m/cm) y ppu.
3. Desde “Anaqueles”, agrega una plantilla o crea una nueva. Arrastra una tarjeta al plano o pulsa “Agregar”.
4. Mueve anaqueles en el lienzo. El sistema evita solapes y respetará los límites del área.
5. Doble clic en un anaquel con estantes para abrir su detalle; también puedes pulsar “Ver”.
6. En detalle, modifica propiedades y estantes; guarda cambios.

## Controles y atajos
- Rueda del mouse: zoom (centra en el puntero).
- Arrastrar lienzo: desplaza el área visible.
- Arrastrar tarjeta de plantilla: crea un anaquel en la posición soltada.
- Arrastrar anaquel: reposiciona (con validación de colisiones y límites).
- Editor de área: modo “añadir vértice”, restricciones de arrastre (Libre/Solo X/Solo Y) y margen de seguridad.

## Estructura del proyecto (resumen)
- index.html
- vite.config.js, tailwind.config.js, postcss.config.cjs
- src/
  - main.js, App.vue
  - router/index.js
  - stores/inventory.js
  - components/
    - InventoryView.vue (vista principal con lienzo 2D, rejilla, reglas y panel de plantillas)
    - ShelfView.vue (detalle de anaquel)
    - WorkspaceEditor.vue (editor del polígono del área, unidades y escala)
    - GridLayer.vue, RulersOverlay.vue, Toolbar.vue, MaterialSelector.vue, ShelfItem.vue
  - utils/geom.js (cálculos de área, punto en polígono, insidencia de rectángulos/círculos, conversión m²)
  - data/mock.js (materiales, plantillas base y áreas iniciales)
  - assets/tailwind.css, assets/custom.css

## Rutas
- /            Inventario (InventoryView)
- /shelf/:id   Detalle de anaquel (ShelfView)
- /about       Información del demo

## Modelo de datos (simplificado)
- Workspace: { id, name, polygon: {x,y}[], shape: 'rectangle'|'l'|'custom', unit: 'm'|'cm', pixelsPerUnit: number, racks: Rack[], localTemplates: Template[] }
- Rack (rectangle|square): { id, name, type, x, y, width, height, depth, material, shelves: Shelf[] }
- Rack (barrel): { id, name, type:'barrel', x, y, width: diámetro, height: diámetro, barrelHeight: altura real, material, shelves: [] }
- Shelf: { id, y, height }
- Template: según tipo (rectangle: width/height/depth/shelves; square: side/depth/shelves; barrel: diameter/height)

Notas:
- El motor de colisiones usa solape estricto entre rectángulos/círculos.
- La “capacidad de superficie” compara suma de áreas de anaqueles vs área del polígono; se impide agregar si excede.

## Datos iniciales
- Materiales: Madera (100 kg, #deb887), Metal (200 kg, #c0c0c0), Plástico (50 kg, #93c5fd)
- Plantillas base: Anaquel Pequeño/Mediano/Grande (rectangulares)
- Áreas ejemplo: “Almacén Principal”, “Depósito Secundario”
- Lienzo base: 1200 x 700 px

## Personalización rápida
- Agregar materiales o plantillas: edita src/data/mock.js
- Lógica de negocio: Pinia store en src/stores/inventory.js
- Geometría/reglas: src/utils/geom.js y componentes GridLayer/RulersOverlay
- Estilos: Tailwind + src/assets/custom.css

## Problemas comunes
- Página en blanco o errores al iniciar: ver versión de Node (>= 18) y reinstalar dependencias.
- No se puede soltar un anaquel: verifica colisiones, límites del polígono y capacidad de superficie.
- Zoom/arrastre brusco: el zoom está limitado a [0.2, 5] y anclado al puntero.

## Licencia
Añade una licencia si corresponde para tu proyecto.

