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
- **Frontend**: Single Page Application (SPA) en `index.html` (~3100 líneas).
  - **Framework**: React 18 + ReactDOM + Babel Standalone.
  - **Estilos**: CSS Vanilla con variables CSS modernas.
- **Backend**:
  - **Auth**: Firebase Auth (Google Sign-In restringido a `@prestamype.com`).
  - **Database**: Firebase Firestore.
  - **API**: Vercel Serverless Functions (`/api`, Node.js).
- **Deploy**: Vercel (Frontend + Functions).

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

## 🧪 Cómo Correr Localmente
```bash
npm i -g vercel
vercel dev
```
Abrir `http://localhost:3000`.
*Nota: Requiere `.env` con `JIRA_EMAIL` y `JIRA_API_TOKEN`.*
