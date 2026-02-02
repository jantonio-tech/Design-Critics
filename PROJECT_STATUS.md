# 📘 Design Critics Tracker - Project Context

## 🚀 Descripción del Proyecto
Herramienta web para gestionar y agendar "Design Critics" (revisiones de diseño) en Prestamype. Permite ver un calendario semanal, reservar slots (máx 3 por día) y mantener un historial.

## 📅 Estado Actual (Febrero 2026)
**Versión Actual:** 2.3.0 (Vite Migration + Architecture Upgrade)

### ✅ Últimas Implementaciones (v2.3 - Feb 2)

#### 🏗️ Arquitectura & Build System
- **Migración a Vite**: Se abandonó `Babel Standalone` en favor de un entorno de desarrollo profesional con **Vite**.
- **Estructura Modular**: El código ya no vive en un solo archivo HTML. Ahora reside en `src/` con soporte de módulos ES.
  - `src/App.jsx`: Contenedor principal (Monolith component).
  - `src/components/`: Inicio de modularización (e.g., `CreateCriticsSession.jsx`).
  - `api/`: Serverless functions para backend (Jira Proxy).

#### ⚡ Quick Add & UX Improvements
- **CreateCriticsSession Component**: Lógica de creación de sesiones extraída y refinada.
- **Mejoras Visuales**: Ajustes en UX/UI de las tarjetas de sesión y manejo de estados vacíos.

### ✅ Implementaciones Previas (v2.2)

#### 🎨 Navbar & Dashboard
- **Navbar Simplificado**: Look más limpio, sin redundancia de nombre de usuario.
- **Day/Night Toggle**: Botón secundario integrado.
- **Skeletons**: Carga progresiva en el Dashboard Personal.

#### 🔄 Backend Consolidation (Firebase)
- **Firestore Only**: Base de datos centralizada en Firebase Firestore `dc_registrations`.

#### 🔗 Jira Integration
- **Serverless Proxy**: `/api/search-jira.js` maneja la autenticación segura con Jira Cloud.
- **Búsqueda en tiempo real**: Filtrado por usuario y tickets específicos.

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 (Vite App).
  - **Core**: `react`, `react-dom`.
  - **Build Tool**: Vite.
  - **Estilos**: CSS Modules / Global CSS (`index.css`) con variables para Dark Mode.
- **Backend**:
  - **Auth**: Firebase Auth (Google Sign-In).
  - **Database**: Cloud Firestore.
  - **API**: Vercel Serverless Functions (Node.js) para integración con Jira.
- **Deploy**: Vercel.

## 📂 Estructura de Datos (Firestore)
**Colección:** `dc_registrations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID o Auto-gen |
| `fecha_dc` | string (YYYY-MM-DD) | Fecha de la sesión |
| `presentador` | string | Nombre del usuario |
| `presentador_email`| string | Email del creador |
| `producto` | string | Producto asociado |
| `ticket` | string | Key del ticket (e.g. UX-1234) |
| `ticket_title` | string | Título del ticket de Jira (Snapshot) |
| `flujo` | string | Nombre del flujo/acuerdo |
| `tipo` | string | "Normal", "Nuevo scope", etc. |
| `estado` | string | "activo" o "descartado" |
| `created_at` | timestamp | Fecha de creación |

## 🔑 Seguridad y Reglas
1. **Autenticación**: Google Sign-In obligatorio.
2. **Jira**: Tokens protegidos en backend (`JIRA_API_TOKEN` en Vercel).
3. **Reglas Firestore**: Escritura restringida a registros propios.

## ⚠️ Observaciones para Desarrolladores
- **Refactor en Progreso**: Aunque ya usamos Vite, `App.jsx` sigue siendo un componente muy grande (~24KB). Se recomienda continuar extrayendo lógica a `src/components/` y `src/hooks/`.
- **Estilos**: Se utilizan variables CSS en `index.css`. Mantener la consistencia con el sistema de diseño actual.
- **Deploy**: Al hacer push a `main`, Vercel construye automáticamente el proyecto (`npm run build`).
