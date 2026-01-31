# 📘 Design Critics Tracker - Project Context

## 🚀 Descripción del Proyecto
Herramienta web para gestionar y agendar "Design Critics" (revisiones de diseño) en Prestamype. Permite ver un calendario semanal, reservar slots (máx 3 por día) y mantener un historial.

## 📅 Estado Actual (Enero 2026)
**Versión Actual:** 2.2.0 (Firebase Integrated + UI Polish)

### ✅ Últimas Implementaciones (v2.2 - Jan 30/31)

#### 🎨 Navbar & UI Refinements
- **Navbar Simplificado**: Se eliminó la visualización redundante del nombre del usuario para un look más limpio.
- **Day/Night Toggle**: Rediseñado como botón secundario con bordes para mejor integración visual.
- **Dashboard Loaders**: Implementación de Skeleton Loaders completos en el Dashboard Personal para evitar saltos de contenido (CLS) durante la carga de datos.

#### 🔄 Backend Consolidation (Firebase)
- **Confirmación de Arquitectura**: El sistema utiliza **Firebase Firestore** como fuente de verdad única para los registros de DCs.
- **Sheets Integration**: Se descartó la integración con Google Sheets en favor de la robustez de Firestore.

### ✅ Implementaciones Previas (v2.1)

#### 🎯 Multi-Flow DC Registration
- **Registro múltiple**: Ahora puedes agregar varios flujos para un mismo ticket en una sola acción.
- **UI dinámica**: Botón "+ Añadir flujo" para agregar inputs adicionales, botón ✕ para eliminar.
- **Contador inteligente**: El contador de critics refleja el total de flujos registrados.

#### 🔗 Jira Integration Enhancements
- **Proxy Serverless**: Server-to-Server auth via API Token en Vercel Functions (`/api/search-jira.js`).
- **Dashboard en tiempo real**: Datos de Jira (status, título) mostrados en el Dashboard Personal.

## 🛠️ Stack Tecnológico

- **Frontend**: Single Page Application (SPA) contenida en `index.html`.
  - **Framework**: React 18 + ReactDOM + Babel Standalone.
  - **Estilos**: CSS Vanilla con variables CSS modernas (Glassmorphism, Dark Mode).
- **Backend**:
  - **Auth**: Firebase Auth (Google Sign-In, soporte híbrido Popup/Redirect).
  - **Database**: Cloud Firestore (Colección `dc_registrations`).
  - **API**: Vercel Serverless Functions (`/api`, Node.js) para integración segura con Jira.
- **Deploy**: Vercel.

## 📂 Estructura de Datos (Firestore)
**Colección:** `dc_registrations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Auto-generado (o preservado en update) |
| `fecha_dc` | string (YYYY-MM-DD) | Fecha de la presentación |
| `presentador` | string | Nombre del usuario |
| `presentador_email`| string | Email del creador |
| `producto` | string | Producto (Auto-detectado) |
| `ticket` | string | ID del ticket (e.g. UX-1234) |
| `flujo` | string | Nombre del happy path |
| `tipo` | string | "Normal", "Nuevo scope", etc. |
| `estado` | string | "activo" o "descartado" (archived) |
| `created_at` | timestamp | Server timestamp |

## 🔑 Seguridad y Reglas
1. **Autenticación**: Obligatoria con Google.
2. **Jira**: Tokens seguros en variables de entorno de Vercel.
3. **Reglas Firestore**:
   - Lectura: Todo usuario autenticado.
   - Escritura: Solo registros propios.

## ⚠️ Observaciones
- **Single File**: El código reside principalmente en `index.html`. Precaución al editar el script de Babel.
- **Workarounds**: La actualización de DCs utiliza una estrategia de "Delete + Create" para simplificar permisos de inmutabilidad en ciertos campos.
- **Índices**: Firestore puede requerir índices compuestos para ordenamientos complejos en el futuro.
