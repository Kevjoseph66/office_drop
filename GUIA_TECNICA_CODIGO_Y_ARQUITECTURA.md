# 📘 Guía Técnica a Nivel de Código: OfficeDrop (Arcade Edition)
### *Aprende Desarrollo Full-Stack, TypeScript, Firestore e Inteligencia Artificial desde Cero*

> **Para quién es este documento:** Si estás aprendiendo a programar, estás dando tus primeros pasos con React o quieres entender cómo conectar una aplicación web real con Inteligencia Artificial (Google Gemini) y bases de datos en la nube (Firebase Firestore), este documento es tu mapa de ruta detallado línea por línea.

---

## 🧭 Mapa de Contenidos

1. [La Gran Foto: ¿Cómo se comunica una aplicación web moderna?](#1-la-gran-foto-cómo-se-comunica-una-aplicación-web-moderna)
2. [TypeScript: El Contrato de Datos (`src/types/index.ts`)](#2-typescript-el-contrato-de-datos-srctypesindexts)
3. [Base de Datos y Sincronización en Tiempo Real (`src/services/`)](#3-base-de-datos-y-sincronización-en-tiempo-real-srcservices)
   - [3.1 Conexión con Firebase (`firebase.ts`)](#31-conexión-con-firebase-firebasets)
   - [3.2 Transacciones Atómicas y Anti-Trampa (`eventService.ts`)](#32-transacciones-atómicas-y-anti-trampa-eventservicets)
   - [3.3 Criptografía y Seguridad con Web Crypto (`adminAuthService.ts`)](#33-criptografía-y-seguridad-con-web-crypto-adminauthservicets)
4. [La Capa de Inteligencia Artificial (Backend & Serverless)](#4-la-capa-de-inteligencia-artificial-backend--serverless)
   - [4.1 Cómo "habla" el servidor con Gemini (`@google/genai`)](#41-cómo-habla-el-servidor-con-gemini-googlegenai)
   - [4.2 Salidas Estructuradas (`responseSchema`): Evitando que la IA delire](#42-salidas-estructuradas-responseschema-evitando-que-la-ia-delire)
   - [4.3 Resiliencia: El Motor Smart Fallback de Respaldo](#43-resiliencia-el-motor-smart-fallback-de-respaldo)
   - [4.4 Diferencia Vital: Express Local (`server.ts`) vs. Serverless Vercel (`api/`)](#44-diferencia-vital-express-local-serverts-vs-serverless-vercel-api)
5. [React 19: Componentes, Hooks y Estado (`src/App.tsx`)](#5-react-19-componentes-hooks-y-estado-srcapptsx)
   - [5.1 `useState`: La Memoria del Componente](#51-usestate-la-memoria-del-componente)
   - [5.2 `useEffect`: El Ciclo de Vida y los Listeners](#52-useeffect-el-ciclo-de-vida-y-los-listeners)
   - [5.3 Enrutamiento sin Librerías Pesadas (Query Params)](#53-enrutamiento-sin-librerías-pesadas-query-params)
6. [Componentes Especiales: Experiencia Móvil y Canvas (`ParticipantMobileView.tsx`)](#6-componentes-especiales-experiencia-móvil-y-canvas-participantmobileviewtsx)
   - [6.1 La Ruleta de la Suerte: Animación en Bucle](#61-la-ruleta-de-la-suerte-animación-en-bucle)
   - [6.2 Generación de Imágenes al Vuelo con HTML5 Canvas](#62-generación-de-imágenes-al-vuelo-con-html5-canvas)
   - [6.3 Integración Nativa con WhatsApp y Portapapeles](#63-integración-nativa-con-whatsapp-y-portapapeles)
7. [Glosario de Términos para Futuros Ingenieros de Software](#7-glosario-de-términos-para-futuros-ingenieros-de-software)

---

## 1. La Gran Foto: ¿Cómo se comunica una aplicación web moderna?

Antes de ver una sola línea de código, visualicemos el flujo completo de OfficeDrop:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                   USUARIO EN EL NAVEGADOR               │
                  │   (Computadora / Proyector TV  o  Teléfono Móvil)       │
                  └───────────────┬─────────────────────────┬───────────────┘
                                  │                         │
               1. Escucha cambios │                         │ 2. Pide generar lista
                  en tiempo real  │                         │    con Inteligencia Artificial
                                  ▼                         ▼
                  ┌──────────────────────┐        ┌──────────────────────────────┐
                  │  Firebase Firestore  │        │   Backend / Serverless API   │
                  │  (Base de Datos      │        │   (/api/generate-potluck...) │
                  │   en la Nube)        │        └──────────────┬───────────────┘
                  └──────────────────────┘                       │
                                                                 │ 3. Consulta el LLM
                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │       Google Gemini API      │
                                                  │      ('gemini-2.5-flash')    │
                                                  └──────────────────────────────┘
```

1. **El Frontend (React):** Es la interfaz visual que el usuario ve, toca y escucha. Se ejecuta directamente en el navegador del usuario (Chrome, Safari, Edge).
2. **La Base de Datos (Firestore):** Es el punto de encuentro. Si un participante en su teléfono móvil reclama "Café", la base de datos se entera y en menos de 100 milisegundos actualiza la pantalla del proyector en la TV sin necesidad de recargar la página.
3. **El Backend / Serverless:** Es una función segura en la nube que custodia tu clave secreta de Gemini (`GEMINI_API_KEY`) y le pide a la IA que cree una lista justa de comida.

---

## 2. TypeScript: El Contrato de Datos (`src/types/index.ts`)

En JavaScript tradicional, una variable puede ser un número hoy, un texto mañana y `undefined` después, lo que suele causar la temida pantalla blanca con el error `Cannot read properties of undefined`.

**TypeScript** soluciona esto obligándonos a definir **tipos e interfaces**. Piensa en una `interface` como el **molde o contrato** que un objeto debe cumplir estrictamente.

Veamos el archivo `src/types/index.ts` desglosado:

### 2.1 Union Type: `EventType`
```typescript
export type EventType = 'potluck' | 'raffle';
```
- **¿Qué significa?** La variable solo puede tener uno de dos valores exactos: la palabra `'potluck'` (compartir de comida) o `'raffle'` (rifa/sorteo). Si un programador escribe por error `'sorteo'` o `'fiesta'`, el editor marcará un error de compilación en rojo de inmediato.

---

### 2.2 La Entidad Principal: `PotluckItem`
Representa cada plato o alimento que alguien llevará al evento:

```typescript
export interface PotluckItem {
  id: string;                         // Identificador único (ej: 'item-1')
  nombre: string;                     // Nombre del producto o combo (ej: 'Combo Tacos y Salsa')
  cantidadEspecifica: string;         // Cantidad exacta a comprar (ej: '2 paquetes')
  categoria: string;                  // 'Bebidas' | 'Salado' | 'Postre' | 'Snacks' | 'Desechables'
  costoEstimado: string;              // Rango monetario (ej: '$5 - $8')
  assignedTo?: string | null;         // Nombre del participante que lo tomó
  assignedPhoneOrEmail?: string | null; // Teléfono o correo para validación única anti-trampa
  assignedAt?: string | null;         // Timestamp ISO de la asignación
  assignedDeviceId?: string | null;   // ID único del dispositivo móvil (anti-trampa)
  subItems?: PotluckSubItem[];        // Productos agrupados en un solo ticket (soporte combo)
  purchased?: boolean;                // Booleano indicando si ya compró los productos
  purchasedAt?: string | null;        // Timestamp ISO de la confirmación de compra
}
```

#### Conceptos clave para principiantes:
- `string`: Indica que el valor debe ser una cadena de texto.
- `boolean`: Valor de verdad verdadero/falso (`true` o `false`).
- El signo de interrogación `?` (como en `assignedTo?`): Significa que ese campo es **opcional**. Cuando el evento recién se crea, nadie ha tomado el plato todavía, por lo que el campo puede no existir o ser `null`.
- `string | null`: Se llama **Union Type**. Significa que el valor puede ser texto (ej: `"Carlos"`) o `null` (vacío).
- `subItems?: PotluckSubItem[]`: Permite que un solo ticket contenga múltiples productos y cantidades (por ejemplo, cuando son pocas personas y muchos productos).

---

### 2.3 El Evento Completo: `OfficeEvent`
Es el contenedor maestro de toda la información del evento:

```typescript
export interface OfficeEvent {
  id: string;                    // ID del documento en Firestore (ej: 'event-potluck-1')
  type: EventType;               // 'potluck' o 'raffle'
  title: string;                 // Título (ej: 'Desayuno de Oficina')
  description: string;           // Temática o instrucciones
  createdAt: string;             // Fecha de creación en formato ISO 8601
  status: 'draft' | 'published'; // Estado del evento
  targetParticipants: number;    // Meta de personas (ej: 10)

  // Campos específicos de Potluck
  items: PotluckItem[];          // Un array (lista) de ítems de comida

  // Campos específicos de Sorteos (Raffles)
  prizeTitle?: string;           // Título del premio (ej: 'Cafetera Espresso')
  prizeDescription?: string;     // Detalles del premio
  prizeIcon?: string;            // Nombre del ícono lucide (ej: 'Coffee')
  tickets: RaffleTicket[];       // Lista de tickets emitidos
  winnerTicket?: RaffleTicket | null; // Ticket ganador tras el sorteo
  winnerSelectedAt?: string | null;   // Momento en que ganó
}
```
- **`PotluckItem[]`**: Los corchetes `[]` indican que no es un solo ítem, sino una **lista o arreglo** de objetos que cumplen la interfaz `PotluckItem`.

---

## 3. Base de Datos y Sincronización en Tiempo Real (`src/services/`)

### 3.1 Conexión con Firebase (`src/services/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "officedrop-b64da.firebaseapp.com",
  projectId: "officedrop-b64da",
  storageBucket: "officedrop-b64da.firebasestorage.app",
  messagingSenderId: "1040285392582",
  appId: "1:1040285392582:web:9f84171ef1fccde3d581c7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

#### 💡 Pregunta clásica de principiante:
> *"¿No es peligroso dejar el `apiKey` de Firebase visible en el código del frontend?"*  
**Respuesta:** En Firebase para Web, la configuración **no es un secreto**, sino un identificador de proyecto. La seguridad real no depende de ocultar esa clave, sino de las **Reglas de Seguridad de Firestore (`firestore.rules`)**, que controlan quién puede leer o escribir qué documentos.

---

### 3.2 Transacciones Atómicas y Anti-Trampa (`src/services/eventService.ts`)

Este es uno de los archivos más importantes del proyecto. Analicemos sus funciones clave:

#### 1. Limpieza de datos: `cleanForFirestore(data)`
```typescript
function cleanForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map((item) => cleanForFirestore(item));
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }
  return data;
}
```
- **¿Por qué existe?** Firestore lanza un error grave si intentas guardar un campo cuyo valor sea `undefined`. Esta función recursiva recorre todo el objeto y elimina cualquier propiedad `undefined`, convirtiéndolas en seguras.

---

#### 2. Escuchar cambios en vivo: `subscribeToFirestoreEvent()`
```typescript
export function subscribeToFirestoreEvent(
  eventId: string,
  onUpdate: (event: OfficeEvent | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, 'events', eventId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as OfficeEvent;
        onUpdate({ ...data, id: docSnap.id });
      } else {
        onUpdate(null);
      }
    },
    onError
  );
}
```
- **¿Qué es `onSnapshot`?** En lugar de hacer una petición `fetch` cada 3 segundos (lo que gastaría mucha red y batería), `onSnapshot` abre un canal WebSocket bidireccional con Google. En cuanto alguien cambia un dato en la base de datos, Google le "empuja" el cambio a nuestra función `onUpdate`.
- **¿Por qué retorna `Unsubscribe`?** Cuando el usuario cambia de pantalla o cierra el componente, debemos llamar a esa función para cerrar la conexión y no dejar fugas de memoria (*Memory Leaks*).

---

#### 3. El Algoritmo de Asignación Atómica: `assignPotluckItemWithTransaction()`
¿Qué pasa si dos personas en sus teléfonos presionan "Girar Ruleta" exactamente en el mismo milisegundo cuando solo queda 1 botella de jugo disponible?
En un sistema mal diseñado, ambos recibirían el jugo (**Condición de Carrera**).

Para solucionar esto, usamos `runTransaction`:

```typescript
export async function assignPotluckItemWithTransaction(
  eventId: string,
  userName: string,
  deviceId?: string
): Promise<{ item: PotluckItem | null; isExisting: boolean; error?: string }> {
  const cleanName = userName.trim();
  const docRef = doc(db, 'events', eventId);

  return await runTransaction(db, async (transaction) => {
    // PASO 1: Leemos el estado más fresco del evento dentro de la transacción
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error('El evento no existe');

    const eventData = docSnap.data() as OfficeEvent;
    const items: PotluckItem[] = eventData.items || [];

    // PASO 2: ANTI-TRAMPA Y VERIFICACIÓN DE IDENTIDAD ÚNICA
    // Comprobamos si el nombre, el teléfono/correo O el dispositivo ya tienen un ítem asignado
    const cleanContact = phoneOrEmail ? phoneOrEmail.trim().toLowerCase() : '';
    const existing = items.find(
      (it) =>
        (it.assignedTo && it.assignedTo.toLowerCase() === cleanName.toLowerCase()) ||
        (cleanContact && it.assignedPhoneOrEmail && it.assignedPhoneOrEmail.toLowerCase() === cleanContact) ||
        (deviceId && it.assignedDeviceId && it.assignedDeviceId === deviceId)
    );

    if (existing) {
      // Si ya tenía plato, le devolvemos su ticket original sin permitirle duplicar
      return { item: existing, isExisting: true };
    }

    // PASO 3: Buscamos únicamente los ítems libres
    const availableItems = items.filter((it) => !it.assignedTo);
    if (availableItems.length === 0) {
      return { item: null, isExisting: false, error: '¡Todos los ítems ya fueron tomados!' };
    }

    // PASO 4: Elegimos uno al azar matemáticamente
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const chosenItem = availableItems[randomIndex];
    const now = new Date().toISOString();

    // PASO 5: Marcamos el ítem como tomado con nombre, contacto y dispositivo
    const updatedItems = items.map((it) => {
      if (it.id === chosenItem.id) {
        return {
          ...it,
          assignedTo: cleanName,
          assignedPhoneOrEmail: phoneOrEmail?.trim() || null,
          assignedDeviceId: deviceId || null,
          assignedAt: now,
        };
      }
      return it;
    });

    // PASO 6: Guardamos atómicamente
    transaction.update(docRef, { items: cleanForFirestore(updatedItems) });

    return {
      item: {
        ...chosenItem,
        assignedTo: cleanName,
        assignedPhoneOrEmail: phoneOrEmail?.trim() || null,
        assignedDeviceId: deviceId || null,
        assignedAt: now,
      },
      isExisting: false,
    };
  });
}
```

#### ¿Por qué es genial `runTransaction`?
Si otra persona intenta guardar datos entre el Paso 1 y el Paso 6, Firestore detecta el choque, cancela la operación y la reintenta automáticamente desde el Paso 1 con los datos nuevos. **Ningún ítem se asigna dos veces jamás.**

---

### 3.3 Criptografía y Seguridad con Web Crypto (`src/services/adminAuthService.ts`)

El panel maestro está protegido por un PIN (por defecto `1234`). Pero **nunca debemos guardar contraseñas en texto plano**, porque cualquier persona con acceso a la base de datos podría verlas.

Usamos la función criptográfica nativa del navegador:

```typescript
export async function hashPin(pin: string): Promise<string> {
  const clean = pin.trim();
  const subtleCrypto = window.crypto?.subtle;

  if (subtleCrypto) {
    // 1. Convertimos el texto del PIN en una secuencia de bytes (Uint8Array)
    const msgBuffer = new TextEncoder().encode(clean);

    // 2. Aplicamos el algoritmo matemático irreversible SHA-256
    const hashBuffer = await subtleCrypto.digest('SHA-256', msgBuffer);

    // 3. Convertimos el resultado binario en un string hexadecimal (ej: '03ac6742...')
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // ...
}
```
- **¿Qué es un Hash?** Es una función matemática de una sola vía. De `"1234"` siempre obtienes `"03ac6742..."`, pero a partir de `"03ac6742..."` es matemáticamente imposible deducir que venía de `"1234"`. Cuando el usuario escribe su PIN, lo convertimos en hash y comparamos los dos hashes.

---

## 4. La Capa de Inteligencia Artificial (Backend & Serverless)

Tanto en el desarrollo local (`server.ts`) como en Vercel (`api/generate-potluck-items.ts`), la lógica que se comunica con Gemini sigue las mejores prácticas de la industria.

### 4.1 Cómo "habla" el servidor con Gemini (`@google/genai`)

```typescript
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const aiClient = new GoogleGenAI({ apiKey });
```
- Creamos una instancia del cliente de Google pasándole la clave de API leída desde las variables de entorno del servidor. De este modo, la clave **nunca llega al navegador web del usuario**.

---

### 4.2 Salidas Estructuradas (`responseSchema`): Evitando que la IA delire

Si le pides a una IA ordinaria: *"Dame 10 cosas para un desayuno de oficina"*, puede responderte:
> *"¡Hola! Con mucho gusto, aquí tienes una lista deliciosa: 1. Jugo de naranja..."*

Esto es pésimo para un programa de computadora, porque tendrías que escribir código complejo para limpiar los saludos y extraer los datos.

Por eso, usamos **Structured Outputs (`responseSchema`)**:

```typescript
const response = await aiClient.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
  config: {
    systemInstruction:
      'Eres OfficeDrop AI. Generas listas de comida para dinámicas de oficina donde cada participante aporta algo justo, realista y delicioso.',
    responseMimeType: 'application/json', // Le ordena responder ÚNICAMENTE en JSON
    responseSchema: {
      type: Type.ARRAY,                  // Queremos una lista
      items: {
        type: Type.OBJECT,               // Cada elemento de la lista es un objeto
        properties: {
          id: { type: Type.STRING },
          nombre: { type: Type.STRING },
          cantidadEspecifica: { type: Type.STRING },
          categoria: { type: Type.STRING },
          costoEstimado: { type: Type.STRING },
        },
        // Obliga a que todos estos campos estén presentes sin falta
        required: ['id', 'nombre', 'cantidadEspecifica', 'categoria', 'costoEstimado'],
      },
    },
  },
});
```
- Gracias a `responseMimeType: 'application/json'` y `responseSchema`, Gemini garantiza que la salida es un JSON 100% válido que podemos convertir directamente con `JSON.parse(response.text)`.

---

### 4.3 Resiliencia: El Motor Smart Fallback de Respaldo

Un buen programador siempre se pregunta: **"¿Qué pasa si la API externa falla?"**
En lugar de mostrar un cartel rojo de error, creamos la función `generateSmartFallbackItems`:

```typescript
if (apiKey) {
  try {
    // 1. Intentamos llamar a Gemini
    const response = await aiClient.models.generateContent(...);
    return res.json({ success: true, source: 'gemini-2.5-flash', items: sanitized });
  } catch (geminiError) {
    console.warn('Fallo en Gemini, activando respaldo inteligente...', geminiError);
  }
}

// 2. Si no hay API key o si Gemini falló, entra el motor de respaldo
const fallbackItems = generateSmartFallbackItems(safeTitle, count, safeDesc, safeBudget);
return res.json({ success: true, source: 'smart-template-engine', items: fallbackItems });
```
- La función de respaldo analiza el título del evento con `.toLowerCase().includes('taco')` o `'desayun'` y selecciona platos de un catálogo interno curado. **El usuario final nunca se queda varado.**

---

### 4.4 Diferencia Vital: Express Local (`server.ts`) vs. Serverless Vercel (`api/`)

- **En local (`server.ts`):** Usamos Node.js con Express tradicional. Es un programa que corre de manera indefinida en un puerto (`app.listen(3000)`).
- **En Vercel (`api/generate-potluck-items.ts`):** En Vercel no hay un servidor encendido todo el tiempo. En su lugar, Vercel ejecuta **Serverless Functions**:
  ```typescript
  export default async function handler(req, res) {
    // Se ejecuta sólo cuando llega la petición POST, responde y se apaga de inmediato.
  }
  ```
  Esto reduce los costos a cero cuando nadie está usando la web y escala a millones de usuarios automáticamente.

---

## 5. React 19: Componentes, Hooks y Estado (`src/App.tsx`)

### 5.1 `useState`: La Memoria del Componente
```typescript
const [potluckEvent, setPotluckEvent] = useState<OfficeEvent>(INITIAL_POTLUCK_EVENT);
```
- `potluckEvent`: Es la variable que contiene el estado actual.
- `setPotluckEvent`: Es la única función autorizada para modificar esa variable. Cada vez que llamas a `setPotluckEvent(nuevoEvento)`, React vuelve a renderizar la pantalla con los datos nuevos en pantalla.

---

### 5.2 `useEffect`: El Ciclo de Vida y los Listeners
¿Cómo hacemos para que la aplicación empiece a escuchar a Firebase al abrirse?

```typescript
useEffect(() => {
  // 1. Iniciamos la suscripción
  const unsubscribe = subscribeToFirestoreEvent(
    'event-potluck-1',
    (updatedEvent) => {
      if (updatedEvent) {
        setPotluckEvent(updatedEvent);
      }
    }
  );

  // 2. Función de limpieza (Cleanup Function)
  return () => {
    unsubscribe();
  };
}, []); // El array vacío [] significa: "Ejecútate solo una vez, cuando la app se monta"
```

---

### 5.3 Enrutamiento sin Librerías Pesadas (Query Params)
Para saber si un usuario escaneó el QR en su teléfono móvil o si está en la pantalla grande de la TV, leemos la barra de direcciones del navegador:

```typescript
const params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'participant') {
  setCurrentView('participant');
}
```
Si la URL es `https://miapp.com/?mode=participant&eventId=event-potluck-1`, la app sabe automáticamente que debe mostrar la interfaz móvil del jugador en lugar del panel del organizador.

---

## 6. Componentes Especiales: Experiencia Móvil y Canvas (`ParticipantMobileView.tsx`)

### 6.1 La Ruleta de la Suerte: Animación en Bucle
En `ParticipantMobileView.tsx`, cuando el usuario presiona "Girar Ruleta", simulamos la tensión de un juego de arcade antes de revelar el ítem:

```typescript
setIsSpinning(true);
let ticks = 0;
const interval = setInterval(() => {
  // Cambiamos el ítem visual en pantalla cada 80 milisegundos
  const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
  setTempDisplayItem(randomItem);
  ticks++;

  // Tras 25 ciclos (~2 segundos), detenemos la ruleta y llamamos a la base de datos
  if (ticks > 25) {
    clearInterval(interval);
    realizarAsignacionFinalEnFirestore();
  }
}, 80);
```

---

### 6.2 Generación de Imágenes al Vuelo con HTML5 Canvas
El ticket descargable que obtiene el usuario no es una imagen prediseñada; **se dibuja píxel por píxel en tiempo real** usando la etiqueta `<canvas>`:

```typescript
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 550;
const ctx = canvas.getContext('2d');

// 1. Fondo negro estilo arcade
ctx.fillStyle = '#111827';
ctx.fillRect(0, 0, 400, 550);

// 2. Borde troquelado con efecto retro
ctx.strokeStyle = '#10b981'; // Verde Neón
ctx.lineWidth = 4;
ctx.strokeRect(10, 10, 380, 530);

// 3. Escribimos los textos con tipografía pixel-art
ctx.fillStyle = '#ffffff';
ctx.font = '16px monospace';
ctx.fillText(`AGENTE: ${userName}`, 30, 80);
ctx.fillText(`LLEVAR: ${item.nombre}`, 30, 130);
ctx.fillText(`CANTIDAD: ${item.cantidadEspecifica}`, 30, 170);

// 4. Convertimos el canvas a un archivo PNG y forzamos la descarga
const dataUrl = canvas.toDataURL('image/png');
const downloadLink = document.createElement('a');
downloadLink.href = dataUrl;
downloadLink.download = `ticket-officedrop-${userName}.png`;
downloadLink.click();
```
- **Ventaja:** Funciona completamente en el cliente sin requerir servidores de renderizado de imágenes ni consumir ancho de banda.

---

### 6.3 Integración Nativa con WhatsApp
Para que el usuario comparta su compromiso con el grupo de la empresa:

```typescript
const texto = `🕹️ *MISIÓN DE COMIDA ASIGNADA* (OfficeDrop)\n` +
              `👤 Agente: ${userName}\n` +
              `🎯 Lo que llevo: ${item.nombre}\n` +
              `📦 Cantidad: ${item.cantidadEspecifica}\n` +
              `💵 Costo est.: ${item.costoEstimado}`;

const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
window.open(url, '_blank');
```
- `encodeURIComponent()` convierte espacios, saltos de línea y emojis en caracteres seguros para URLs (como `%20` o `%0A`).

---

### 6.4 Compatibilidad Multi-Navegador: El Desafío de Safari y WebKit
Los navegadores basados en WebKit (Safari en macOS y todo navegador en iOS) imponen restricciones muy estrictas:
1. **Autoplay Policy de Web Audio:**
   - Si se invoca `audioCtx.resume()` sin manejar el rechazo de la promesa, Safari aborta la ejecución del script.
   - Si se usa `exponentialRampToValueAtTime` con valores cercanos a 0 o en contextos suspendidos, Safari lanza un error de tipo `DOMException`.
   - **Solución implementada:** Se utilizan rampas lineales (`linearRampToValueAtTime`) y se capturan todas las promesas y llamadas de audio en bloques `try/catch`.
2. **Carrera contra Transacciones Colgadas (`Promise.race`):**
   - Si la red móvil o IndexedDB en Safari experimenta lentitud o bloqueos en la transacción de Firestore, la pantalla del participante podría quedarse eternamente mostrando la animación de cofre temblando (`isOpeningBox`).
   - **Solución implementada:** Se utiliza una carrera de promesas:
   ```typescript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error('TIMEOUT_SAFARI')), 3000)
   );
   const result = await Promise.race([transactionPromise, timeoutPromise]);
   ```
   - Si el timeout se dispara primero, se activa inmediatamente el respaldo local con `assignRandomPotluckItem` y se llama a `onUpdateEvent`, garantizando en el bloque `finally` que `setIsOpeningBox(false)` se ejecute sin demoras.

---

### 6.5 Arquitectura de Confirmación de Compras (`purchased: boolean`)
Para saber si los participantes ya adquirieron sus productos:
1. **Modelo de Datos:**
   ```typescript
   export interface PotluckItem {
     // ...
     purchased?: boolean;        // ¿Ya fue comprado o preparado?
     purchasedAt?: string | null; // Fecha y hora ISO de la confirmación
   }
   ```
2. **Servicio Atómico en Firestore (`eventService.ts`):**
   - Función `togglePotluckItemPurchasedInFirestore(eventId, itemId, purchased)`: Ejecuta una transacción atómica que actualiza únicamente la propiedad `purchased` y `purchasedAt` del ítem específico.
3. **Persistencia en Caché de Dispositivo (`localStorage`):**
   - Guarda la clave `officedrop_purchased_{eventId}_{itemId}` para reflejar de inmediato el estado incluso en caso de desconexión.
4. **Actualización Optimista:**
   - La interfaz actualiza el estado React inmediatamente con `toggleItemPurchased`, reproduce una fanfarria arcade y lanza confeti si se marca como comprado.
5. **Visibilidad Dual:**
   - **Participante:** Tarjeta de estado interactiva con botón para abrir modal de confirmación detallado y opción de desmarcar.
   - **Organizador:** Conteo en vivo en el encabezado de estadísticas (`{purchased}/{assigned}` comprados), filtro rápido `COMPRADOS` y botón de conmutación directa en cada fila.

---

### 6.6 Ingeniería de Concurrencia y Resolución de Conflictos (Optimistic Concurrency Control)
En eventos con decenas de personas en la misma sala, los participantes suelen escanear el QR y presionar "Abrir Regalo" en la misma fracción de segundo.

#### 1. ¿Cómo funciona `runTransaction` ante accesos concurrentes?
Firestore no bloquea tablas completas (lo que causaría cuellos de botella); en su lugar utiliza **Control de Concurrencia Optimista (OCC)**:

```typescript
await runTransaction(db, async (transaction) => {
  // 1. Lectura del snapshot actual con su token de versión (v1)
  const docSnap = await transaction.get(docRef);
  const items = docSnap.data().items;

  // 2. Lógica de negocio (filtrar libres, verificar anti-trampas, elegir al azar)
  const available = items.filter(it => !it.assignedTo);
  if (available.length === 0) throw new Error('Agotado');
  const chosen = available[Math.floor(Math.random() * available.length)];

  // 3. Escritura en buffer de transacción
  transaction.update(docRef, { items: updatedItems });
});
```

#### 2. Ciclo de Vida del Conflicto de Versión:
1. **Cliente 1** y **Cliente 2** leen la versión `v1` simultáneamente. Ambos ven el ítem *"Arepas"* disponible.
2. **Cliente 1** completa su cálculo primero y envía el commit. Firestore verifica que el documento en el servidor sigue en `v1`, aplica el cambio y lo promueve a `v2`.
3. **Cliente 2** intenta enviar su commit esperando `v1`. El servidor detecta `v2 !== v1` (**conflicto de versión**).
4. El SDK de Firestore **aborta automáticamente** el intento de Cliente 2, espera un tiempo aleatorio (*jittered backoff* de microsegundos) y **vuelve a ejecutar toda la función de transacción** desde el principio.
5. En el segundo intento, Cliente 2 lee el documento fresco en `v2`, donde *"Arepas"* ya está tomado por Cliente 1. Cliente 2 selecciona aleatoriamente entre los ítems restantes y hace commit a `v3`.
6. **Resultado:** Cero colisiones, cero sobrescrituras y cero duplicados.

#### 3. Validación Automatizada en Suite de Pruebas (`concurrency.test.ts`):
Se diseñó un simulador de concurrencia in-memory que prueba:
- **20 participantes simultáneos:** Se lanzan en paralelo mediante `Promise.all` contra el mismo documento; se verifica que el `Set` de IDs resultantes tenga tamaño 20 (cero duplicados).
- **Sobredemanda (30 personas para 10 ítems):** Exactamente 10 obtienen ítem y 20 reciben el mensaje de agotado.
- **Rifas simultáneas:** 25 boletos emitidos al mismo instante obtienen números estrictamente secuenciales del 1 al 25.
- **Idempotencia:** 5 clics rápidos del mismo usuario devuelven exactamente el mismo ítem.

---

## 7. Glosario de Términos para Futuros Ingenieros de Software

| Término | Explicación Sencilla |
| :--- | :--- |
| **Race Condition (Condición de Carrera)** | Error que ocurre cuando dos procesos intentan modificar el mismo dato a la vez. Se soluciona con **Transacciones Atómicas**. |
| **Atomic Transaction** | Operación de base de datos que se ejecuta como un bloque único: o se completa todo con éxito, o se revierte por completo sin dejar datos corruptos. |
| **Observer Pattern (`onSnapshot`)** | Patrón de diseño donde el cliente no pregunta repetidamente "¿hay datos nuevos?", sino que se queda escuchando hasta que el servidor le avisa. |
| **Structured Output** | Técnica de ingeniería de IA para obligar a un modelo de lenguaje a responder en un esquema JSON estricto en lugar de texto libre. |
| **Serverless Function** | Fragmento de código de backend que solo existe mientras procesa una solicitud. No requiere administrar un servidor físico ni pagar por tiempo inactivo. |
| **Hash Criptográfico** | Algoritmo matemático irreversible que transforma cualquier texto en una huella digital única (utilizado para almacenar contraseñas de forma segura). |
| **Canvas API** | Herramienta de JavaScript en el navegador que permite dibujar gráficos 2D, líneas y textos directamente en mapas de bits descargables. |
| **Fallback** | Red de seguridad o plan B que entra en acción cuando un servicio principal (como la API de IA o la red) no está disponible. |

---

*¡Felicidades! Ahora conoces la arquitectura interna y el código que hace funcionar a OfficeDrop. Guarda y analiza este archivo para inspirarte en tus próximos proyectos de software.*
