# 🕹️ OfficeDrop - 8-Bit Arcade Potluck & Raffle Platform

> Plataforma web retro arcade (estilo 8-bit) para organizar dinámicas de oficina: listas de comida para compartir equilibradas en costo con IA (Gemini 2.5 Flash), sorteos de rifas con ruleta interactiva y participación móvil multiusuario en tiempo real mediante Firebase Firestore y códigos QR.

---

## 🚀 Características Principales

### 🍕 Stage 1: Compartir de Comida (Potluck Quest)
- **Generación Inteligente con IA (Gemini 2.5 Flash):** Crea listas de alimentos equilibradas en presupuesto y variedad nutricional (bebidas, platos principales, snacks, postres, vajilla descartable) asegurando que nadie gaste de más.
- **Cofres Misteriosos Anti-Trampa:** Los participantes escanean el código QR en sus teléfonos y abren un cofre arcade que les asigna un ítem libre al azar mediante transacciones atómicas de Firestore (`runTransaction`), evitando duplicados simultáneos.
- **Bloqueo y Persistencia de Asignación:** El dispositivo móvil guarda su asignación en `localStorage` y en Firestore. Al recargar la página o volver a entrar, su ítem sigue asignado y no puede ser manipulado ni cambiado para hacer trampa.
- **Herramientas de Auto-Compartir y Descarga:**
  - 📲 **Enviar por WhatsApp:** Envía el resumen formateado a su propio chat de WhatsApp o al grupo de la oficina.
  - 🎟️ **Descargar Pase Arcade (PNG):** Genera en tiempo real un boleto digital 8-bit con código de barras y sello oficial en un `<canvas>` para guardar en la galería.
  - 📋 **Copiar al Portapapeles:** Copia los datos con confirmación visual arcade.

### 🎟️ Stage 2: Rifa de Oficina (Golden Raffle)
- **Boletos Dorados Arcade:** Cada participante se registra en la tómbola y recibe un boleto numerado (#001, #002...).
- **Ruleta de la Fortuna Interactiva:** El organizador gira la ruleta física en pantalla completa con efectos de sonido arcade y confeti para elegir al ganador oficial en vivo.

### 🔒 Seguridad y Control de Administrador
- **Consola Protegida con PIN en Firestore:** Los participantes que escanean el QR solo pueden participar. Para crear eventos, editar inventario o vaciar la base de datos se requiere el PIN de organizador, encriptado con SHA-256 en Firestore (`system_settings/admin_auth`).
- **Cambio Dinámico de PIN:** El anfitrión puede actualizar el PIN directamente desde la consola web sin necesidad de hacer redeploy.
- **Panel de Reinicio Seguro ("REINICIAR"):** Solo accesible para el admin autenticado (`Ronda Limpia`, `Restaurar Demo`, `Vaciar en Blanco`).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Base de Datos en Tiempo Real:** Firebase Firestore (SDK modular v13 con `onSnapshot` y `runTransaction`).
- **Inteligencia Artificial:** `@google/genai` (SDK oficial de Google) con modelo `gemini-2.5-flash` y Structured Outputs (`responseSchema`).
- **Backend & Serverless:** 
  - Express + Vite middleware para desarrollo local en AI Studio.
  - Vercel Serverless Function nativa en `api/generate-potluck-items.ts` para producción.

---

## 📦 Instalación y Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd officedrop
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env` basado en `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Agrega tu clave de Gemini API:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. Ejecuta las pruebas unitarias:
   ```bash
   npm test
   ```

---

## ☁️ Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. En la sección **Environment Variables**, agrega:
   - **`GEMINI_API_KEY`**: Tu clave de Google AI Studio (debe comenzar con `AIzaSy...`, obtenida en [Google AI Studio](https://aistudio.google.com/app/apikey)).
6. ¡Listo! Vercel desplegará automáticamente tanto la aplicación web estática como la Serverless Function en `/api/generate-potluck-items`.

---

## 📄 Licencia

Este proyecto está bajo la licencia Apache-2.0.
