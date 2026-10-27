# Plan de Implementación: Limpieza Total de Producción (Completado)

Este plan definió y completó las modificaciones para que el reinicio y vaciado de eventos deje la aplicación en un estado completamente limpio de producción, eliminando datos de muestra tanto en Firebase Firestore como en la interfaz de usuario.

---

## 1. Conclusiones y Decisiones de Producción

Para un entorno de **producción real**, la aplicación no debe presentar datos ficticios ("Alex", "Bea", "Desayuno de Viernes...") que confundan al organizador ni a los compañeros que escanean el código QR.

### Mejoras completadas:
1. **Títulos y descripciones en blanco en Firestore:** Al ejecutar "Vaciar Todo a Modo Producción", `resetEventToEmptyInFirestore` vacía `title: ''`, `description: ''`, `items: []`, `tickets: []`, `prizeTitle: ''`, `prizeDescription: ''`, y `status: 'draft'`.
2. **Eliminación total de jugadores simulados:** La barra superior no precarga nombres ficticios; queda en `simulatedUsers: []` y se limpia `localStorage`. La barra muestra el distintivo: `★ MODO PRODUCCIÓN: CADA PERSONA INGRESA SU NOMBRE AL ESCANEAR EL QR ★`.
3. **Flujo de Participante Real (Móvil):** Los participantes que escanean el QR ingresan su propio nombre real directamente en su teléfono, guardándose en su sesión móvil y en las transacciones de Firestore.
4. **Reserva de Modo Demo opcional:** Si el usuario desea hacer una demostración o prueba en el futuro, la opción "Restaurar Datos Demo Originales" sigue disponible en el panel de reinicio.

---

## 2. Estado de Pruebas y Compilación
- Pruebas unitarias: 7 de 7 tests pasando (`officeDropLogic.test.ts`).
- Validación TypeScript y Linter: 0 errores (`tsc --noEmit`).
- Compilación Vite de producción: Exitosa (`npm run build`).
