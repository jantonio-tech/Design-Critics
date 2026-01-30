# 📘 Design Critics Tracker - Project Context

## 🚀 Descripción del Proyecto
Herramienta web para gestionar y agendar "Design Critics" (revisiones de diseño) en Prestamype. Permite ver un calendario semanal, reservar slots (máx 3 por día) y mantener un historial.

## 📅 Estado Actual (Enero 2026)
**Versión Actual:** 2.1.0 (Multi-Flow + UI Modernization)

### ✅ Últimas Implementaciones (v2.1)

#### 🔄 Multi-Flow DC Registration (Nuevo)
- **Registro múltiple**: Ahora puedes agregar varios flujos para un mismo ticket en una sola acción.
- **UI dinámica**: Botón "+ Añadir flujo" para agregar inputs adicionales, botón ✕ para eliminar.
- **Un DC por flujo**: Cada flujo crea un registro separado en el calendario.
- **Contador inteligente**: El contador de critics refleja el total de flujos registrados.

#### 🎯 Lógica de Reemplazo Corregida
- **Reset de contador**: Los DCs de tipo "Reemplazo" ahora reinician el contador. Solo se cuentan DCs desde el último Reemplazo.
- **Exclusión correcta**: Al crear un Reemplazo, los DCs anteriores se archivan pero el nuevo permanece activo.

#### 🎨 UI Modernization
- **Gradientes y glassmorphism**: Navbar con efecto glass, cards con hover effects.
- **Fondo animado**: Gradiente dinámico en el background.
- **Cards mejoradas**: Sombras, acentos de color, micro-animaciones.
- **Modales refinados**: Backdrop blur, animaciones de scale.
- **Eliminado**: Componente "Producto Detectado" (producto se detecta internamente).
- **Placeholder actualizado**: "Pega aquí el nombre de tu happy path".

#### 🔗 Jira Integration Enhancements
- **Dashboard en tiempo real**: Datos de Jira (status, título) mostrados en el Dashboard Personal.
- **Status badge**: Categorías de estado (En Progreso, Finalizado, etc.) con colores.
- **Response parsing**: Estructura de datos aplanada para mejor performance.

### ✅ Implementaciones Previas (v2.0)
1. **Integración con Jira Centralizada** via Vercel Functions (`/api/search-jira.js`).
2. **Autocompletado de Producto** basado en palabras clave del ticket.
3. **Hard Delete Workaround** para actualizaciones complejas.
4. **Auto-Archivado** de DCs anteriores al registrar un Reemplazo.

## 🛠️ Stack Tecnológico
<<<<<<< Updated upstream
- **Frontend**: Single Page Application (SPA) en `index.html` (~3100 líneas).
  - **Framework**: React 18 + ReactDOM + Babel Standalone.
  - **Estilos**: CSS Vanilla con variables CSS modernas.
- **Backend**:
  - **Auth**: Firebase Auth (Google Sign-In restringido a `@prestamype.com`).
  - **Database**: Firebase Firestore.
  - **API**: Vercel Serverless Functions (`/api`, Node.js).
- **Deploy**: Vercel (Frontend + Functions).
=======
- **Frontend**: Single Page Application (SPA) contenida en `index.html`.
- **Framework**: React 18 + ReactDOM (via CDN) + Babel Standalone.
- **Estilos**: CSS Vanilla incrustado.
- **Backend (BaaS)**: Google Firebase
  - **Auth**: Google Sign-In (Restringido a dominio `@prestamype.com`).
  - **Database**: Cloud Firestore.
- **Serverless**: Vercel Functions (Node.js) para Proxy de APIs (Jira).
- **Deploy**: Vercel.
>>>>>>> Stashed changes

## 📂 Estructura de Datos (Firestore)
**Colección:** `dc_registrations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Auto-generado por Firestore |
| `fecha_dc` | string (YYYY-MM-DD) | Fecha de la presentación |
| `presentador` | string | Nombre del usuario |
| `presentador_email`| string | Email del creador (para permisos) |
| `producto` | string | Producto (Auto-detectado) |
| `ticket` | string | ID del ticket (e.g. UX-1234) |
| `flujo` | string | Nombre del happy path |
| `tipo` | string | "Normal" o "Reemplazo" |
| `estado` | string | "activo" o "descartado" |
| `created_at` | timestamp | Server timestamp |

## 🔑 Seguridad y Reglas
1. **Autenticación**: Obligatoria con Google (@prestamype.com).
2. **Jira**: Server-to-Server auth via API Token en Vercel env vars.
3. **Reglas Firestore**:
   - Lectura: Usuario autenticado (activos + propios históricos).
   - Escritura: Usuario del dominio, solo sus propios registros.

## ⚠️ Observaciones y Deuda Técnica
- **Single File Complexity**: `index.html` (~3100 líneas). Considerar refactorización a módulos.
- **Legacy Jira Config UI**: Componentes `SettingsPage`, `JiraStatusBadge` pueden limpiarse.
- **Hard Delete Workaround**: Update via delete+create por permisos de Firestore.

<<<<<<< Updated upstream
## 🧪 Cómo Correr Localmente
```bash
npm i -g vercel
vercel dev
```
Abrir `http://localhost:3000`.
*Nota: Requiere `.env` con `JIRA_EMAIL` y `JIRA_API_TOKEN`.*
=======


### 1. Integración Jira v2.0 (Serverless Proxy)
- **Cambio Arquitectónico**: Se movió la lógica de consulta a Jira de frontend a backend (`api/search-jira.js`) usando Vercel Serverless Functions.
- **Seguridad**: El Token de Jira y Email ahora viven en variables de entorno del servidor (`JIRA_API_TOKEN`, `JIRA_EMAIL`), invisibles al cliente.
- **CORS**: Se eliminaron los problemas de CORS al hacer proxy de las peticiones.
- **API v3**: Actualizado para usar la API v3 de Jira (`/rest/api/3/search/jql`).

### 2. Autenticación Robusta y Cross-Platform
- **Estrategia Híbrida**: 
  - **Desktop/iOS/Safari**: Usa `signInWithPopup` para evitar bloqueos de ITP y problemas de redirección en PWAs.
  - **Android**: Usa `signInWithRedirect` para mejor experiencia en móviles.
- **Persistencia**: Implementación de `AuthStorage` para manejar sesiones y consentimientos en `localStorage`.

### 3. UX Features & Mejoras
- **Caché de Tickets**: Los tickets de Jira se guardan en `localStorage` por 5 minutos para minimizar llamadas a la API y acelerar la carga del modal.
- **Auto-detección de Producto**: Al seleccionar un ticket de Jira, el sistema analiza el `summary` para auto-seleccionar el Producto (e.g. detecta "PGH", "Gestora", "Cambio Seguro").
- **Loading States**: Feedback visual mejorado durante la carga de tickets y autenticación.

### 4. Migración a Firebase (Consolidado)
- El sistema opera 100% en Firebase (Auth + Firestore), habiendo abandonado Supabase por completo.
- Reglas de seguridad configuradas para permitir lectura global (auth domain) y edición solo al creador.

## ⚠️ Notas para Futuros Desarrolladores
- **Single File**: Todo el código vive en `index.html`. Al hacer cambios grandes, ten cuidado de no romper el bloque `<script type="text/babel">`.
- **Babel**: Se usa Babel en el navegador. Para producción real se recomienda pre-compilar, pero para este uso interno funciona bien.
- **Vercel**: El deploy es automático al pushear a `main`.
- **Índices Firestore**: Si agregas filtros complejos (ej. order by date + filter by status), revisa la consola del navegador; Firebase te dará un link para crear el índice necesario automáticamente.

## 🧪 Cómo Probar Localmente
1. Instalar `serve` o similar: `npm install -g serve`
2. Correr: `serve .`
3. Abrir `http://localhost:3000` (o el puerto que asigne).
*Nota: Asegúrate de que `localhost` esté autorizado en Firebase Auth Domains.*
>>>>>>> Stashed changes
