# 🕹️ OfficeDrop (Arcade Edition) — Resumen Técnico y Documentación Completa del Proyecto

> **Versión:** 1.0.0 Production Ready  
> **Estilo Visual:** Retro Arcade 8-Bit Pixel Art / CRT Aesthetic  
> **Arquitectura:** Híbrida (React 19 SPA + Firebase Firestore + Vercel Serverless + Node/Express Dev Server)  
> **Fecha de Compilación del Reporte:** 2026-10-27

---

## 📑 Tabla de Contenidos
1. [Visión General y Propósito del Proyecto](#1-visión-general-y-propósito-del-proyecto)
2. [Arquitectura y Stack Tecnológico](#2-arquitectura-y-stack-tecnológico)
3. [Ciclo de Vida y Creación de Productos / Ítems](#3-ciclo-de-vida-y-creación-de-productos--ítems)
   - [3.1 ¿Existe un catálogo por defecto (Default)?](#31-existe-un-catálogo-por-defecto-default)
   - [3.2 Generación con Inteligencia Artificial (Gemini 2.5 Flash)](#32-generación-con-inteligencia-artificial-gemini-25-flash)
   - [3.3 Motor de Respaldo Inteligente (Smart Fallback Engine)](#33-motor-de-respaldo-inteligente-smart-fallback-engine)
   - [3.4 Creación y Edición Manual (Panel de Administración)](#34-creación-y-edición-manual-panel-de-administración)
4. [Mecanismo de Asignación: Ruleta y Sistema Anti-Trampa](#4-mecanismo-de-asignación-ruleta-y-sistema-anti-trampa)
5. [Pase Digital del Participante (Mission Pass)](#5-pase-digital-del-participante-mission-pass)
6. [Módulo de Sorteos y Rifas (Raffle)](#6-módulo-de-sorteos-y-rifas-raffle)
7. [Seguridad y Control de Acceso (PIN Maestro)](#7-seguridad-y-control-de-acceso-pin-maestro)
8. [Persistencia y Sincronización en Tiempo Real (Firebase Firestore)](#8-persistencia-y-sincronización-en-tiempo-real-firebase-firestore)
9. [Estrategia de Despliegue (Local Dev vs. Producción Vercel)](#9-estrategia-de-despliegue-local-dev-vs-producción-vercel)
10. [Estructura de Archivos del Repositorio](#10-estructura-de-archivos-del-repositorio)

---

## 1. Visión General y Propósito del Proyecto

**OfficeDrop** es una aplicación web interactiva diseñada para resolver uno de los problemas más comunes y frustrantes en ambientes de trabajo o grupos de amigos: **la organización de almuerzos o desayunos compartidos (*Potlucks*) y sorteos de oficina (*Raffles*)**.

### El Problema que Resuelve
En las reuniones tradicionales de oficina:
- Todos terminan llevando lo mismo (ej. 5 personas llevan gaseosa y nadie lleva comida fuerte o servilletas).
- Hay desigualdad de costos: unos gastan $30 USD y otros $2 USD.
- Algunos participantes cambian de plato arbitrariamente o devuelven ítems difíciles, generando desorden.

### La Solución de OfficeDrop
OfficeDrop convierte la organización en un **videojuego cooperativo retro de 8 bits**:
- **Vista del Organizador (Pantalla Principal):** Diseñada para proyectarse en la televisión de la sala o usarse en el escritorio. Muestra la lista de ítems disponibles, barras de progreso de recaudación, un código QR gigante para que los compañeros escaneen con su teléfono móvil y controles administrativos protegidos con PIN.
- **Vista Móvil del Participante:** Diseñada como un arcade de bolsillo. El participante escanea el código QR, ingresa su nombre, acciona una **palanca de ruleta arcade** y el sistema le asigna aleatoriamente un ítem justo y equilibrado.
- **Pase de Misión Digital:** Una vez asignado el ítem, el usuario obtiene un ticket digital con la misión exacta (producto, cantidad a comprar y rango de precio estimado) que puede compartir a WhatsApp o descargar como imagen PNG retro.

---

## 2. Arquitectura y Stack Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8 | Renderizado ultrarrápido y reactivo basado en componentes funcionales. |
| **Estilos & Diseño** | Tailwind CSS v4, Lucide Icons, Canvas Confetti | Estética Arcade de los 80s/90s (scanlines CRT, paleta de colores Game Boy / Famicom, tipografía retro). |
| **Base de Datos** | Firebase Firestore (Web SDK v13) | Sincronización en tiempo real (`onSnapshot`) y transacciones concurrentes libres de colisiones (`runTransaction`). |
| **Inteligencia Artificial** | Google Gen AI SDK (`@google/genai`), Modelo: `gemini-2.5-flash` | Generación contextual de listas equilibradas basadas en temática, personas y presupuesto. |
| **Backend (Dev)** | Node.js, Express, TSX (`server.ts`) | Dev server unificado en el puerto 3000 con Vite Middleware para desarrollo local. |
| **Backend (Producción)** | Vercel Serverless Functions (`/api/generate-potluck-items.ts`) | Función sin servidor (`handler(req, res)`) para ejecutar la lógica de IA en la nube sin requerir un servidor Node persistente. |

---

## 3. Ciclo de Vida y Creación de Productos / Ítems

El corazón de OfficeDrop es su modelo de datos `PotluckItem`:

```typescript
export interface PotluckItem {
  id: string;                    // Identificador único (ej: 'item-1')
  nombre: string;                // Nombre del producto (ej: 'Café de Especialidad')
  cantidadEspecifica: string;    // Cantidad exacta a comprar (ej: '1 bolsa de 500g')
  categoria: string;             // 'Bebidas' | 'Salado' | 'Postre' | 'Snacks' | 'Desechables'
  costoEstimado: string;         // Rango monetario (ej: '$5 - $8')
  assignedTo?: string | null;    // Nombre del participante que lo tomó
  assignedAt?: string | null;    // Timestamp ISO de la asignación
  assignedDeviceId?: string | null; // ID único del dispositivo móvil (anti-trampa)
}
```

Existen **tres vías distintas** por las cuales se crean y administran estos productos en el sistema:

---

### 3.1 ¿Existe un catálogo por defecto (Default)?

**SÍ, existe un catálogo predeterminado.**  
Se encuentra definido en el archivo `src/data/initialEvents.ts` bajo la constante `INITIAL_POTLUCK_EVENT`.

#### ¿Cuándo se utiliza?
1. **Primer inicio de la aplicación:** Cuando se despliega la app en un entorno limpio y Firebase aún no tiene registros en la colección `events`, el servicio `eventService.ts` detecta la ausencia y persiste automáticamente este evento base.
2. **Reinicio de Fábrica (Factory Reset):** Si el administrador presiona el botón "Resetear Evento" desde el panel maestro, la app puede restaurar esta plantilla inicial.

#### Contenido del Catálogo por Defecto (10 Participantes):
1. **Jugo de Naranja 100% Natural** | Cantidad: *2 botellas de 1.5L bien frías* | Categoría: *Bebidas* | Costo: *$6 - $8*
2. **Medialunas / Croissants Rellenos** | Cantidad: *1 docena recién horneadas* | Categoría: *Panadería* | Costo: *$7 - $9*
3. **Café de Especialidad en Grano / Molido** | Cantidad: *1 paquete de 500g tueste medio* | Categoría: *Bebidas* | Costo: *$7 - $9*
4. **Bowl de Frutas Frescas de Temporada** | Cantidad: *1.5 kg surtido (fresas, uvas, melón)* | Categoría: *Saludable* | Costo: *$6 - $8*
5. **Yogur Griego Natural & Granola Crunch** | Cantidad: *2 potes de 500g yogur + 1 bolsa granola* | Categoría: *Lácteos / Cereal* | Costo: *$6 - $8*
6. **Sándwiches de Miga / Jamón y Queso** | Cantidad: *1 bandeja de 12 unidades triangulares* | Categoría: *Salado* | Costo: *$8 - $10*
7. **Queque / Bizcocho Casero de Vainilla y Limón** | Cantidad: *1 queque entero mediano en rodajas* | Categoría: *Repostería* | Costo: *$5 - $7*
8. **Leche Entera y Bebida Vegetal (Almendras/Avena)** | Cantidad: *2 cartones de 1L (1 de vaca y 1 vegetal)* | Categoría: *Bebidas* | Costo: *$5 - $7*
9. **Galletas Artesanales con Chips de Chocolate** | Cantidad: *2 paquetes grandes (~20 galletas)* | Categoría: *Dulce* | Costo: *$5 - $7*
10. **Kit de Desechables Biodegradables** | Cantidad: *Paquete de 20 platos, servilletas y vasos* | Categoría: *Desechables* | Costo: *$4 - $6*

---

### 3.2 Generación con Inteligencia Artificial (Gemini 2.5 Flash)

Cuando el organizador decide crear un compartir personalizado desde el botón **"Generar con IA (Gemini)"**, se ejecuta un flujo de generación avanzada:

1. **Entrada de Parámetros:**
   - **Título del Evento:** (ej. *"Tarde de Tacos Viernes", "Pizza Party Fin de Mes", "Desayuno Aniversario"*).
   - **Cantidad de Participantes:** Número exacto de personas esperadas (de 2 a 50).
   - **Descripción o Temática:** Indicaciones sobre gustos especiales o restricciones.
   - **Presupuesto / Directriz de Equidad:** (ej. *"Todos gastan entre $6 y $8"*).

2. **Llamada a la API:**
   - En local: Petición `POST /api/generate-potluck-items` atendida por `server.ts`.
   - En Vercel: Petición `POST /api/generate-potluck-items` atendida por la Serverless Function nativa en `api/generate-potluck-items.ts`.

3. **Invocación al SDK de Gemini:**
   - Cliente oficial: `new GoogleGenAI({ apiKey })`.
   - Modelo: `'gemini-2.5-flash'`.
   - **Esquema Estricto JSON (`responseSchema`):**
     La IA no responde texto libre, sino que se fuerza a retornar un array estructurado tipado con campos obligatorios: `id`, `nombre`, `cantidadEspecifica`, `categoria` y `costoEstimado`.
   - **Reglas del Prompt:**
     - Generar exactamente `N` ítems (1 ítem por persona).
     - Equidad estricta de costos entre participantes.
     - Cantidades exactas orientadas a compras reales en el supermercado.
     - Variedad armónica (salado, dulce, bebidas y desechables).

---

### 3.3 Motor de Respaldo Inteligente (Smart Fallback Engine)

Si ocurre cualquiera de las siguientes situaciones:
- No se configuró `GEMINI_API_KEY` en el archivo `.env` o en Vercel.
- La clave de API tiene problemas de cuota, autenticación o restricciones.
- Falla la conexión a internet con los servidores de Google.

El sistema activa automáticamente su **Smart Fallback Engine** (`generateSmartFallbackItems`).

#### ¿Cómo opera este motor?
1. Analiza el título y la descripción del evento mediante heurísticas léxicas avanzadas:
   - Detecta si contiene términos como: `crioll`, `arepa`, `venezol`, `colomb`, `empanad`, `pabell` -> Activa el **Pool Gastronomía Criolla / Latina** (arepas asadas, queso blanco llanero, carne mechada, huevos pericos, caraotas, tequeños, papelón con limón, etc.).
   - Detecta si contiene términos como: `desayun`, `mañana`, `cafe`, `café` -> Activa el **Pool Desayuno Continental** (café, croissants, jugo de naranja, fruta fresca, etc.).
   - Detecta si contiene términos como: `taco`, `mexic`, `burrito`, `guacamole` -> Activa el **Pool Comida Mexicana**.
   - Para cualquier otra temática -> Activa el **Pool Almuerzo / Compartir General** (empanadas, pizzas, tablas de picoteo, bebidas, postres).
2. Cada pool cuenta con ítems individuales y **combos con sub-productos (`subItems`)** balanceados con cantidades y costos realistas.
3. El motor selecciona una muestra distribuida para satisfacer exactamente el número de personas solicitadas (`count`).
4. La interfaz de usuario recibe los ítems inmediatamente sin que el organizador sufra caídas de servicio.

---

### 3.4 Soporte de Múltiples Productos por Ticket (`subItems`)

Cuando hay pocas personas pero se necesitan muchas cosas (ej: 4 compañeros y 12 provisiones), o cuando se requiere que una persona traiga un paquete combinado:
- Cada ticket `PotluckItem` puede contener un arreglo `subItems: PotluckSubItem[]`.
- Ejemplo de Ticket Combo:
  - **Título:** `Arepas de Maíz Calientes & Mantequilla`
  - **Sub-ítem 1:** `Arepas de maíz recién asadas (10 unidades)`
  - **Sub-ítem 2:** `Mantequilla o Nata criolla (1 pote de 250g)`
- **En el Panel del Organizador:** Se visualiza la insignia púrpura `[🎒 COMBO: N PRODUCTOS]` con el desglose de cada ítem.
- **En la Vista Móvil del Participante:** Se presenta una lista de verificación interactiva de compras para que el usuario marque los productos conforme los compra.
- **En WhatsApp y Ticket PNG:** Se detallan todos los productos que componen el combo.

---

### 3.5 Creación y Edición Manual (Panel de Administración)

El organizador cuenta con control total sobre los productos:
- **Botón `+ CREAR EVENTO`:** Permite desplegar el panel de configuración y el generador de IA de Gemini.
- **Agregar Ítem Manual (`+ Agregar Ítem`):** Permite añadir contribuciones específicas que no hayan sido contempladas por la IA (ej. *"1 Tarta sin gluten para Juan"*).
- **Edición en Línea:** Modificación directa de nombre, cantidad sugerida, categoría y rango de costo de cualquier ítem existente.
- **Eliminación Individual:** Borrado de ítems con recálculo automático de la meta de participantes.
- **Liberación Forzada de Ítems:** Si un compañero que tomó un plato avisa que no podrá asistir, el administrador puede liberar el plato con un clic para que vuelva a estar disponible en la ruleta para otro participante.

---

## 4. Mecanismo de Asignación Móvil: Flujo en 3 Pasos y Anti-Trampa

Cuando un participante escanea el código QR o abre el enlace en su teléfono móvil:

1. **PASO 1 — Identificación del Jugador (Primero el Nombre):**
   - El participante encuentra una pantalla retro arcade que le solicita: *¿Cómo te llamas?*
   - Ingresa su nombre o apodo único (ej: *"Laura"*, *"Carlos"*).
   - El sistema almacena su nombre localmente para ese evento.
   - **Solución al problema multi-dispositivo:** Los nuevos dispositivos nunca reciben por defecto el nombre `"Tú"`, evitando que varios teléfonos colisionen con la misma asignación.

2. **PASO 2 — Caja Sorpresa Cerrada (Listo para Jugar):**
   - Una vez confirmado el nombre, la pantalla saluda al participante: *¡Hola [Nombre]! Toca el cofre para descubrir qué comida llevarás.*
   - Se muestra un cofre o regalo pixel-art animado palpitando con partículas de 8 bits.
   - Botón interactivo de gran tamaño: `[ 🎁 ABRIR REGALO Y DESCUBRIR ]`.

3. **PASO 3 — Apertura y Transacción Atómica en Firestore (`runTransaction`):**
   - Al pulsar el botón, se reproduce un sonido arcade y se ejecuta la transacción ACID en Firestore.
   - Se valida en tiempo real que ningún otro participante haya tomado ese ítem durante el milisegundo de animación.
   - Se asigna el ítem o combo al participante con su nombre y `deviceId` único.
   - Se dispara una celebración con confeti en pantalla y se muestra el pase oficial con los productos a traer.

4. **Sistema Anti-Trampa (Anti-Cheat Hardened):**
   - Cada dispositivo móvil genera y almacena un `deviceId` único en su `localStorage`.
   - Si un participante intenta volver a girar la ruleta para cambiar su plato por uno más fácil, el sistema lo bloquea y le devuelve su misión original.
   - Solo el Administrador con PIN maestro puede reasignar un plato desde el panel de control.

---

## 5. Pase Digital del Participante (Mission Pass)

Una vez confirmada la asignación, la vista móvil se transforma en un **Pase de Misión Arcade** que incluye 3 herramientas nativas para compartir:

1. **Compartir en WhatsApp (`📲 Compartir WhatsApp`):**
   - Genera un enlace directo con formato prellenado para enviar al chat grupal de la oficina:
   ```text
   🕹️ ¡MISIÓN DE COMIDA ASIGNADA! (OfficeDrop)
   👤 Agente: Carlos
   🎯 Lo que llevo: Jugo de Naranja 100% Natural
   📦 Cantidad: 2 botellas de 1.5L bien frías
   🏷️ Categoría: Bebidas
   💵 Presupuesto est.: $6 - $8
   🚀 ¡Nos vemos en el compartir!
   ```
2. **Descargar Ticket PNG en 8-Bit (`🎟️ Descargar Ticket PNG`):**
   - Utiliza la API nativa de `<canvas>` de HTML5 para renderizar en el cliente un recibo físico de arcade con:
     - Encabezado con tipografía pixelada `Press Start 2P`.
     - Borde troquelado con patrón en zigzag.
     - Código de verificación criptográfico único para validar autenticidad.
     - Descarga automática como archivo de imagen (`ticket-officedrop-[id].png`).
3. **Copiar Resumen (`📋 Copiar Resumen`):**
   - Copia al portapapeles del teléfono todos los detalles para pegarlo en Slack, Microsoft Teams o notas personales.

---

## 6. Módulo de Sorteos y Rifas (Raffle)

Además del compartir de comida, OfficeDrop cuenta con un modo de **Rifa de Oficina**:
- **Creación del Premio:** El administrador define el título del premio (ej. *"Cafetera Espresso Retro"*), descripción e ícono arcade.
- **Emisión de Tickets:** Los participantes reclaman números de ticket secuenciales (`#001`, `#002`, etc.) desde su móvil.
- **Sorteo en Vivo en Pantalla Gigante:**
  - El organizador presiona **"INICIAR SORTEO DE RULETA"**.
  - La pantalla maestra ejecuta una animación sonora de ruleta de números estilo casino retro.
  - Al detenerse, revela al ganador con una explosión de confeti en pantalla (`canvas-confetti`) y guarda el ganador de forma permanente en Firestore.

---

## 7. Seguridad y Control de Acceso (PIN Maestro)

Para evitar que cualquier persona modifique la configuración del evento en la pantalla proyectada:
- **PIN de 4 dígitos:** Protege el acceso al Modo Organizador, cambios de ítems y reinicios de eventos.
- **Criptografía:** El PIN se guarda en la colección `system_settings/admin_auth` de Firestore utilizando hashing seguro **SHA-256**. Nunca se almacena en texto plano.
- **PIN por Defecto:** En instalaciones nuevas o antes del primer cambio, el PIN de fábrica es `1234`.
- **Modal de Cambio de PIN:** El administrador puede cambiar su clave en cualquier momento introduciendo el PIN actual y el nuevo PIN deseado.

---

## 8. Persistencia y Sincronización en Tiempo Real (Firebase Firestore)

La aplicación utiliza dos colecciones principales:

### Colección `events`
Documento: `events/{eventId}` (ej: `event-potluck-1`)
```json
{
  "id": "event-potluck-1",
  "type": "potluck",
  "title": "Desayuno de Oficina",
  "description": "Desayuno variado y saludable para el equipo...",
  "status": "published",
  "targetParticipants": 10,
  "createdAt": "2026-10-27T10:00:00.000Z",
  "items": [
    {
      "id": "item-1",
      "nombre": "Jugo de Naranja 100% Natural",
      "cantidadEspecifica": "2 botellas de 1.5L bien frías",
      "categoria": "Bebidas",
      "costoEstimado": "$6 - $8",
      "assignedTo": "Kevin B.",
      "assignedAt": "2026-10-27T10:15:30.000Z",
      "assignedDeviceId": "dev_9f84171e"
    }
  ]
}
```

### Colección `system_settings`
Documento: `system_settings/admin_auth`
```json
{
  "pinHash": "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
  "updatedAt": "2026-10-27T10:00:00.000Z"
}
```

---

## 9. Estrategia de Despliegue (Local Dev vs. Producción Vercel)

El proyecto está diseñado bajo una arquitectura de **despliegue dual**:

```
                 ┌──────────────────────────────────────────────────────────┐
                 │                       OfficeDrop                         │
                 └────────────────────────────┬─────────────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
          [ Entorno de Desarrollo ]                       [ Despliegue en Vercel ]
           (Local / AI Studio Preview)                           (Producción)
                     │                                                 │
          Ejecuta `server.ts`                             Frontend estático Vite (`dist`)
          (Express + Vite Middlewares)                                 │
          API: POST /api/generate-potluck-items           Serverless Function Vercel
          Puerto 3000                                     Ruta: `api/generate-potluck-items.ts`
```

### Configuración en Vercel:
1. **Conexión a Git:** Conectar el repositorio de GitHub al proyecto en Vercel.
2. **Variables de Entorno (`Environment Variables`):**
   - Clave: `GEMINI_API_KEY`
   - Valor: Tu clave de Google AI Studio (admite formatos `AQ...` y `AIzaSy...`).
   - Ámbitos: Seleccionar **Production**, **Preview** y **Development**.
3. **Despliegue Automático:**
   Vercel detecta automáticamente la carpeta `/api` y compila la Serverless Function sin necesidad de configurar servidores de fondo ni Docker.

---

## 10. Estructura de Archivos del Repositorio

```text
├── api/
│   └── generate-potluck-items.ts    # Serverless Function nativa para Vercel
├── public/                          # Favicon, assets y gráficos
├── src/
│   ├── components/
│   │   ├── AdminPinModal.tsx        # Modal de autenticación por PIN
│   │   ├── ChangePinModal.tsx      # Modal para actualizar clave de acceso
│   │   ├── OrganizerView.tsx       # Tablero maestro para proyector / TV
│   │   ├── ParticipantMobileView.tsx # Interfaz móvil para escanear y ruleta
│   │   ├── QRCodeModal.tsx          # Generador de QR dinámico para proyectar
│   │   ├── ResetModal.tsx           # Diálogo de confirmación para reiniciar
│   │   ├── RouletteModal.tsx        # Animación visual de ruleta en pantalla
│   │   └── SimulationBar.tsx        # Barra para alternar roles de prueba
│   ├── data/
│   │   └── initialEvents.ts         # Plantillas predeterminadas de fábrica
│   ├── services/
│   │   ├── adminAuthService.ts      # Verificación y hashing de PIN en Firestore
│   │   ├── eventService.ts          # Transacciones atómicas de asignación
│   │   └── firebase.ts              # Inicialización del SDK de Firebase
│   ├── types/
│   │   └── index.ts                 # Definiciones e interfaces de TypeScript
│   ├── utils/
│   │   └── *.test.ts                # Suites de pruebas unitarias
│   ├── App.tsx                      # Orquestador principal y enrutador de vistas
│   ├── index.css                    # Estilos arcade 8-bit e importación de Tailwind
│   └── main.tsx                     # Punto de entrada de React 19
├── server.ts                        # Servidor Express para desarrollo local
├── package.json                     # Dependencias y scripts de compilación
├── vercel.json                      # Configuración de rutas y funciones Vercel
└── README.md                        # Guía de inicio rápido para desarrolladores
```

---

*Documento generado para auditoría técnica, despliegue en Vercel y análisis de arquitectura de OfficeDrop.*
