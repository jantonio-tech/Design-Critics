# 📘 Design Critics Tracker - Project Context

## 🚀 Descripción del Proyecto
Herramienta web para gestionar y agendar "Design Critics" (revisiones de diseño) en Prestamype. Permite ver un calendario semanal, reservar slots (máx 3 por día) y mantener un historial.

## 🛠️ Stack Tecnológico
- **Frontend**: Single Page Application (SPA) contenida en `index.html`.
- **Framework**: React 16 + ReactDOM (via CDN) + Babel Standalone.
- **Estilos**: CSS Vanilla incrustado.
- **Backend (BaaS)**: Google Firebase
  - **Auth**: Google Sign-In (Restringido a dominio `@prestamype.com`).
  - **Database**: Cloud Firestore.
- **Deploy**: Vercel.

## 📂 Estructura de Datos (Firestore)
**Colección:** `dc_registrations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Auto-generado por Firestore |
| `fecha_dc` | string (YYYY-MM-DD) | Fecha de la presentación |
| `presentador` | string | Nombre del usuario (Google Display Name) |
| `presentador_email`| string | Email del creador (para permisos) |
| `producto` | string | Producto asociado (e.g. Gestora, Transversal) |
| `ticket` | string | ID del ticket (e.g. UX-1234) |
| `flujo` | string | Descripción breve del flujo |
| `tipo` | string | "Normal" o "Reemplazo" |
| `estado` | string | "activo" (default) o "eliminado" (soft delete) |
| `created_at` | timestamp | Server timestamp |

## 🔑 Seguridad y Reglas
1. **Autenticación**: Obligatoria con Google.
2. **Dominio**: Solo emails `@prestamype.com` pueden acceder.
3. **Reglas Firestore**:
   - Lectura: Todo usuario autenticado del dominio.
   - Escritura (Create): Todo usuario autenticado del dominio.
   - Edición/Eliminación: **Solo el creador del registro** (`resource.data.presentador_email == request.auth.token.email`).

## 🔄 Estado Actual y Fixes Recientes (Enero 2026)

### 1. Migración a Firebase
Se migró exitosamente de Supabase a Firebase debido a problemas de estabilidad y limites.

### 2. Autenticación Robusta
- Se implementó `firebase.auth().onAuthStateChanged` para **persistencia de sesión**.
- Se corrigió el flujo de **Logout** (`firebase.auth().signOut()`) para evitar reconexiones automáticas no deseadas.

### 3. API Keys y Configuración
- Se corrigieron las Credenciales de Google Cloud (Client ID & Secret).
- Se corrigió el error `redirect_uri_mismatch` agregando los handlers de Firebase en Google Console.
- Se regeneró el API Key de Firebase con los permisos correctos.

### 4. Permisos de Edición (Bug Fix)
- **Problema**: Al editar, se sobrescribía el `createdBy` con el usuario actual, bloqueando futuras ediciones si el usuario cambiaba.
- **Solución**: Se modificó el `handleSubmit` en el Modal para preservar el `createdBy` original del objeto `editingDC`.

### 5. UI/UX - Modal de Confirmación
- **Problema**: El navegador bloqueaba `window.confirm()` asíncrono, impidiendo eliminar registros.
- **Solución**: Se implementó un componente React `ConfirmModal` personalizado (Estilo Untitled UI).
  - No bloquea el hilo principal.
  - Diseño consistente con la app.
  - Feedback visual de carga ("Eliminando...").

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
