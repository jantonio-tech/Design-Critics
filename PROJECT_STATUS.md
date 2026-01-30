# 📘 Design Critics Tracker - Project Context

## 🚀 Descripción del Proyecto
Herramienta web para gestionar y agendar "Design Critics" (revisiones de diseño) en Prestamype. Permite ver un calendario semanal, reservar slots (máx 3 por día) y mantener un historial.

## � Estado Actual (Enero 2026)
**Versión Actual:** 2.0.1 (Jira Integration + Serviceless)

### ✅ Últimas Implementaciones (v2)
1. **Integración con Jira Centralizada (Vercel Functions)**:
   - **Backend Layer**: Se implementó una API Layer en `/api/search-jira.js` que actúa como proxy seguro.
   - **Seguridad**: Las credenciales de Jira (`JIRA_EMAIL`, `JIRA_API_TOKEN`) ahora viven en las variables de entorno del servidor (Vercel), eliminando la necesidad de que cada usuario configure sus tokens localmente.
   - **Filtrado Inteligente**: La API busca tickets asignados al usuario solicitante (`userEmail`) que estén en sprints activos y no estén cerrados/resueltos.
   - **Performance**: Se implementó caché en `localStorage` (5 min) para evitar llamadas excesivas a la API de Jira.

2. **Mejoras en UX/Formularios**:
   - **Autocompletado de Producto**: Al seleccionar un ticket de Jira, el sistema detecta automáticamente el producto (e.g. "Gestora", "Cambio Seguro") basándose en palabras clave del resumen del ticket.
   - **Validación Backend**: Se centralizó la lógica de validación de conexión con Jira.
   - **Hard Delete**: Se implementó un flujo de "Eliminar y Crear" para actualizaciones complejas, esquivando problemas de permisos de edición granular en Firestore.

3. **Infraestructura**:
   - **Vercel Functions**: Se añadieron `api/search-jira.js` y `api/test-jira.js` para manejar la lógica de negocio sensible.
   - **Vercel Rewrites**: Configuración en `vercel.json` para enrutar `/api/*` correctamente.

## 🛠️ Stack Tecnológico
- **Frontend**: Single Page Application (SPA) en `index.html` (2600+ líneas).
  - **Framework**: React 18 + ReactDOM + Babel Standalone.
  - **Estilos**: CSS Vanilla incrustado.
- **Backend**:
  - **Auth**: Firebase Auth (Google Sign-In restringido a `@prestamype.com`).
  - **Database**: Firebase Firestore.
  - **API**: Vercel Serverless Functions (`/api`, Node.js) para integraciones externas (Jira).
- **Deploy**: Vercel (Frontend + Functions).

## 📂 Estructura de Datos (Firestore)
**Colección:** `dc_registrations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Auto-generado por Firestore |
| `fecha_dc` | string (YYYY-MM-DD) | Fecha de la presentación |
| `presentador` | string | Nombre del usuario (Google Display Name) |
| `presentador_email`| string | Email del creador (para permisos) |
| `producto` | string | Producto asociado (e.g. Gestora, Transversal) - **Auto-detectado** |
| `ticket` | string | ID del ticket (e.g. UX-1234) |
| `flujo` | string | Descripción breve del flujo |
| `tipo` | string | "Normal" o "Reemplazo" |
| `estado` | string | "activo" |
| `created_at` | timestamp | Server timestamp |

## 🔑 Seguridad y Reglas
1. **Autenticación**: Obligatoria con Google (@prestamype.com).
2. **Jira**: El acceso a Jira está centralizado mediante Server-to-Server auth (API Token). El frontend solo envía el email del usuario para contexto de búsqueda.
3. **Reglas Firestore**:
   - Lectura: Todo usuario autenticado del dominio.
   - Escritura (Create): Todo usuario autenticado del dominio.
   - Edición/Eliminación: **Solo el creador del registro** (`resource.data.presentador_email == request.auth.token.email`).

## ⚠️ Observaciones y Deuda Técnica
- **Single File Complexity**: `index.html` ha crecido excesivamente (~2650 líneas). Se recomienda urgentemente refactorizar a módulos separados (Vite App) en fases posteriores.
- **Legacy Jira Config UI**: Existen componentes obsoletos en el frontend (`SettingsPage`, `JiraStatusBadge`) que referencian la antigua configuración manual de tokens de Jira. Estos deben ser limpiados ya que ahora la autenticación es centralizada.
- **Hard Delete Workaround**: La lógica de actualización actual realiza un borrado y recreación del registro para evitar problemas de permisos granulares. Esto es funcional pero subóptimo para la integridad referencial.

## 🧪 Cómo Correr Localmente
1. Instalar `vercel cli`: `npm i -g vercel`
2. Correr `vercel dev` para levantar frontend y funciones serverless.
3. Abrir `http://localhost:3000`.
*Nota: Para probar la integración con Jira, necesitas un archivo `.env` local con `JIRA_EMAIL` y `JIRA_API_TOKEN`.*
