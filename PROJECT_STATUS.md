# 📘 Design Critics Tracker - Project Context & Status

## 🚀 Descripción del Proyecto
Herramienta web profesional para gestionar, agendar y realizar seguimiento de "Design Critics" (revisiones de diseño de producto) en Prestamype. Diseñada para coordinar los flujos de trabajo entre diseñadores, integrándose directamente con **Jira Software** y **Figma**. Incluye un **sistema de votación en tiempo real** para facilitar las sesiones de crítica.

## 📅 Estado Actual (Febrero 2026)
**Versión:** 3.0.0 (Sala de Sesión Autónoma — Control por Presentador)

### ✅ Funcionalidades Principales
1.  **Dashboard Personal**: Muestra los tickets activos asignados al usuario en Jira (proyecto UX, estado "EN CURSO").
2.  **Integración Figma (Happy Paths)**: Detecta automáticamente los flujos ("Happy Paths") dentro de los archivos de Figma vinculados a los tickets.
3.  **Calendario Interactivo**: Vista semanal (Lunes a Viernes) para agendar sesiones con navegación por semanas.
4.  **Sistema de Votación en Vivo**: Sesiones de votación en tiempo real con código de acceso, sincronización instantánea. Cada presentador controla su propia votación (lock de concurrencia). El facilitador conserva poder de cancelación forzada.
5.  **Sala de Espera Automática**: A las 2:20pm (L-V), el sistema crea automáticamente la sala si hay sesiones agendadas. Acciones del presentador: iniciar votación, cancelar presentación, mover a mañana.
6.  **Sistema de Permisos**: Modelo de seguridad basado en propiedad (Owner-based) con rol de Facilitador.
7.  **Alertas Inteligentes**: Notificaciones contextuales para errores de configuración (e.g., falta de link en Figma).
8.  **Agenda del Día**: Tarjeta destacada que muestra las sesiones programadas para hoy con indicador de resultado de votación.
9.  **Validación de Formularios**: Validación robusta con React Hook Form + Zod en todos los formularios.
10. **Dark Mode**: Modo oscuro con toggle en la barra de navegación, preferencia guardada en localStorage.

---

## 🗳️ Sistema de Votación en Vivo

### Descripción General
El sistema permite realizar votaciones en tiempo real durante las sesiones de Design Critic. Un **Facilitador** (actualmente `jantonio@prestamype.com`) crea y controla las sesiones de votación.

### Flujo de Votación
1.  **Crear sesión**: La sala se crea automáticamente a las 2:20pm (cron job) o manualmente por el facilitador.
2.  **Código de acceso**: Se genera un código único con formato `DDMMMXXX` (ej: `05FEBA7X`). La sesión expira en 8 horas.
3.  **Sala de espera**: Los asistentes acceden a `/live/:sessionCode` (`LiveVotingPage`) y ven la agenda del día.
4.  **Control por presentador**: Cada presentador inicia su propia votación cuando termina de presentar (lock de concurrencia: solo una votación activa a la vez).
5.  **Votación en vivo**: Los asistentes votan en tiempo real. Votos y usuarios conectados se sincronizan vía Firestore.
6.  **Resultados**: El facilitador supervisa desde `VotingControlPanel` y puede cancelar votaciones forzadamente.
7.  **Cierre**: Al cerrar la sesión se genera un resumen (`SessionSummaryModal`).

### Decisiones de Votación
- **Aprobado**: El diseño pasa la revisión.
- **Requiere nuevo**: El diseño necesita iteración adicional.

### Sugerencia Inteligente de Fecha
Cuando una sesión de votación se cierra, el sistema sugiere automáticamente la siguiente fecha disponible:
- **Lunes a Jueves**: Sugiere el día siguiente.
- **Viernes a Domingo**: Sugiere el próximo lunes.

---

## 🧠 Lógica de Negocio y Sesiones

El núcleo de la aplicación es la gestión de sesiones de crítica. Existen reglas estrictas para mantener la integridad del proceso de diseño.

### Tipos de Sesión
Existen 3 tipos de sesiones, cada una con un comportamiento específico:

| Tipo | Propósito | Regla de Negocio |
| :--- | :--- | :--- |
| **Design Critic** | Primera revisión de un flujo nuevo o completo. | Es la entrada estándar. Consume 1 slot de "Critic" para el flujo. |
| **Iteración DS** | Revisión de correcciones menores o ajustes de Design System. | No afecta el conteo principal de críticas del flujo. |
| **Nuevo alcance** | Cambio mayor en los requerimientos que invalida revisiones previas. | **Acción Destructiva:** Al crear una sesión de este tipo, el sistema **archiva automáticamente** todas las sesiones previas ("Design Critic") asociadas al mismo ticket y flujo, reiniciando el contador de progreso. |

### Lógica de Happy Paths (Figma)
-   **Detección**: El sistema escanea el archivo de Figma vinculado en el campo "✅ Solución:" de la descripción del ticket en Jira.
-   **Criterio**: Busca Frames que contengan el componente "Encabezado casuística" o cuyo nombre empiece con "HP-".
-   **Caché**: Los resultados se almacenan en Firestore (`figma_cache`) con estrategia Stale-While-Revalidate para minimizar llamadas a la API de Figma.
-   **Errores Manejados**:
    -   *Link Faltante*: Alerta "Falta el link de Figma".
    -   *Link Vacío de HPs*: Alerta "Falta registrar happy paths" con botón para reintentar sin recargar.

### Reglas de Agendamiento
-   **Límite**: Máximo 2 Design Critics por flujo antes de requerir aprobación o considerarse completado (Visualizado en barra de progreso).
-   **Validación**: No se permite agendar si el ticket ya está "Done" o "Finalizado" en Jira (filtrado automático).

---

## 👥 Permisos y Seguridad (User Roles)

El sistema opera bajo un modelo de **Confianza Zero** respecto a la modificación de datos.

1.  **Autenticación**:
    -   Obligatorio correo corporativo (`@prestamype.com`).
    -   Gestionado vía Firebase Auth (Google Provider).
    -   Soporte para usuarios anónimos en modo demo.

2.  **Roles**:
    -   **Usuario estándar**: Cualquier usuario `@prestamype.com` autenticado.
    -   **Facilitador**: `jantonio@prestamype.com` — tiene permisos especiales para crear/cerrar sesiones de votación, cancelar votaciones forzadamente, y modificar `voteResult` de las sesiones.

3.  **Permisos de Acción (Sesiones de Crítica)**:
    -   **Crear**: Cualquier usuario autenticado, asociado a **sus tickets asignados** en Jira.
    -   **Editar**: Estrictamente restringido al **Creador** de la sesión.
    -   **Eliminar**: Estrictamente restringido al **Creador** de la sesión.
    -   **Modificar orden/resultado**: Solo el Facilitador.

4.  **Permisos de Acción (Sesiones de Votación)**:
    -   **Crear/Cerrar/Eliminar sesión**: Solo el Facilitador (o cron job automático).
    -   **Iniciar votación**: El presentador de su propia sesión de crítica.
    -   **Cancelar votación forzada**: Solo el Facilitador.
    -   **Cancelar/Mover presentación**: El presentador de su propia sesión.
    -   **Votar**: Cualquier usuario conectado a la sesión.
    -   **Ver**: Usuarios autorizados (conectados a la sesión activa).

5.  **Visibilidad**:
    -   **Pública**: Todos los usuarios pueden ver las sesiones de todos en el calendario (transparencia total).
    -   **Historial**: Cada usuario solo ve su propio historial de sesiones pasadas.

---

## 🗓️ Guía de Uso del Calendario

### Interacción Desktop vs Mobile
La aplicación es totalmente **Responsive**.

-   **Desktop**:
    -   Vista de grilla semanal (5 columnas, Lunes a Viernes).
    -   Tarjetas expandidas con detalles.
    -   Acciones (Editar/Eliminar) visibles dentro de la tarjeta si eres el dueño.
-   **Mobile**:
    -   Vista de lista vertical (1 columna por día).
    -   Navegación optimizada para táctil.
    -   **Importante**: Los botones de acción (Editar/Eliminar) son **siempre visibles** (no dependen de `hover`), garantizando accesibilidad en pantallas táctiles.

### Flujo de Agenda Rápida (Quick Add)
**Comportamiento Inteligente**:
1.  Desde el **Dashboard**: Click en "Agendar Hoy" en un Happy Path específico.
2.  **Caso 1: Sin Historial (0 Critics)**:
    -   ⚡ **Acción Inmediata**: El sistema crea la sesión automáticamente y muestra confirmación. **No abre ventanas modales.**
    -   Asume "Design Critic" y usa fecha inteligente.
3.  **Caso 2: Con Historial (1+ Critics)**:
    -   📋 **Abre Modal**: Muestra el formulario pre-llenado para permitir seleccionar "Nuevo alcance" o "Iteración DS".
4.  **Smart Date**: Si es Sábado/Domingo, sugiere automáticamente el Lunes. Si la sesión de votación se cerró, sugiere la siguiente fecha hábil.

---

## 🛠️ Stack Tecnológico & Arquitectura

-   **Frontend**: React 18.2.0 + Vite 5.0.8.
    -   *UI Components*: Shadcn UI (15 componentes: Accordion, Alert Dialog, Avatar, Badge, Button, Card, Dialog, Dropdown Menu, Input, Label, Select, Skeleton, Sonner, Tabs, Textarea).
    -   *Form Validation*: React Hook Form 7.54.2 + Zod 3.24.1.
    -   *Estilos*: Tailwind CSS v4.1.18 (con @tailwindcss/vite plugin).
    -   *Icons*: Lucide React 0.563.0.
    -   *Nota*: @dnd-kit fue removido en v3.0 (ya no se reordena sesiones manualmente).
    -   *Notifications*: Sonner 2.0.7 (toast notifications).
    -   *State*: React Hooks + Context Pattern local.
-   **Backend**:
    -   *Database*: Firebase Firestore (4 colecciones: `critics_sessions`, `live_sessions`, `user_settings`, `figma_cache`).
    -   *Auth*: Firebase Authentication (Google Provider).
    -   *API Proxy*: Vercel Serverless Functions (Node.js) para comunicación segura con Jira y Figma API.
-   **Infraestructura**:
    -   Deploy automático en **Vercel** desde rama `main`.
    -   Zona horaria: America/Lima para todas las operaciones de fecha.

---

## 🗄️ Base de Datos (Firestore Collections)

### `critics_sessions`
Sesiones de Design Critic agendadas.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `presentador` | string | Nombre del presentador |
| `presentador_email` | string | Email del presentador |
| `fecha_dc` | string | Fecha de la sesión (YYYY-MM-DD) |
| `producto` | string | Nombre del producto |
| `ticket` | string | Jira ticket key (ej: UX-123) |
| `flujo` | string | Happy Path / flujo de diseño |
| `tipo` | string | "Design Critic" / "Iteración DS" / "Nuevo alcance" |
| `notas` | string | Notas opcionales |
| `estado` | string | "activo" / "archivado" |
| `voteResult` | string | Resultado de votación ("Aprobado" / "Requiere nuevo") |
| `votingStatus` | string | Estado dentro de la sesión en vivo: `pending` / `voting` / `voted` / `cancelled` |
| `presentationOrder` | number | *(Deprecado en v3.0)* Orden de presentación en sesión de votación |
| `created_at` | timestamp | Fecha de creación |

**Índice compuesto**: `presentador_email` (ASC) + `fecha_dc` (DESC)

### `live_sessions`
Sesiones de votación en tiempo real.
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `code` | string | Código de sesión (formato DDMMMXXX) |
| `date` | string | Fecha de la sesión |
| `createdAt` | timestamp | Fecha de creación |
| `expiresAt` | timestamp | Expiración (8 horas después de creación) |
| `status` | string | `waiting` / `active` / `voting` / `closed` / `cancelled` |
| `facilitator` | string | Email del facilitador |
| `connectedUsers` | array | Lista de usuarios conectados |
| `votes` | array | Votos emitidos |
| `currentVotingCriticId` | string\|null | ID de la sesión de crítica en votación (lock de concurrencia) |
| `autoCreated` | boolean | `true` si fue creada por el cron job |
| `summary` | object | Resumen de la sesión al cerrar |

### `user_settings`
Preferencias de usuario (ID del documento = email del usuario).

### `figma_cache`
Caché de Happy Paths obtenidos de Figma (ID del documento = fileKey del archivo Figma).

---

## 🌐 API Routes (Vercel Serverless Functions)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| POST | `/api/search-jira` | Busca tickets Jira asignados al usuario (proyecto UX, estado "EN CURSO") |
| POST | `/api/batch-jira-fields` | Obtiene links de Figma de hasta 20 tickets en lote (busca sección "✅ Solución:" en la descripción) |
| GET | `/api/get-jira-field` | Obtiene un campo específico de un ticket Jira individual |
| GET | `/api/figma-proxy` | Proxy seguro para llamadas a Figma API (oculta token del cliente) |
| POST | `/api/test-jira` | Endpoint de prueba para validar conexión con Jira |

---

## 📂 Directorio de Archivos Clave

### Componentes Principales
-   `src/App.jsx`: Orquestador principal (~718 líneas) — routing por Tabs, Navbar, auth state, dark mode, Dashboard y Calendar.
-   `src/components/CreateCriticsSession.jsx`: Formulario complejo (~780 líneas) con validaciones React Hook Form + Zod.
-   `src/components/TicketAccordion.jsx`: Visualización de tickets con Happy Paths y botón de agenda rápida.
-   `src/components/AgendaCard.jsx`: Tarjeta de sesiones del día con resultado de votación.

### Componentes del Sistema de Votación
-   `src/components/LiveVotingPage.jsx`: Interfaz de votación para asistentes (ruta `/live/:sessionCode`).
-   `src/components/LiveVoteResults.jsx`: Visualización de resultados de votación.
-   `src/components/VotingControlPanel.jsx`: Panel de control del facilitador para gestionar la sesión.
-   `src/components/StartVotingSessionModal.jsx`: Modal para crear nueva sesión de votación.
-   `src/components/SessionSummaryModal.jsx`: Modal con resumen al cerrar la sesión de votación.

### UI Components
-   `src/components/ui/`: 15 componentes Shadcn UI reutilizables (accordion, alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, input, label, select, skeleton, sonner, tabs, textarea).
-   `src/components/skeletons/TicketSkeleton.jsx`: Skeleton de carga para tickets.

### Hooks
-   `src/hooks/useHappyPaths.js`: Fetch de Happy Paths desde Figma con estrategia Stale-While-Revalidate.
-   `src/hooks/useTodaySessionStatus.js`: Listener en tiempo real del estado de la sesión de votación del día.

### Servicios
-   `src/services/data.js`: Capa de abstracción para Firestore (CRUD + Lógica de Archivo + Suscripciones Realtime).
-   `src/services/voting.js`: Servicio de votación (crear sesión, suscribirse, conectar usuario, emitir voto, cerrar sesión).

### Utilidades
-   `src/utils/firebase.js`: Inicialización de Firebase.
-   `src/utils/figma.js`: Integración con Figma API (detección de Happy Paths).
-   `src/utils/votingHelpers.js`: Generación de códigos de sesión, helpers de fecha, efectos de sonido.
-   `src/lib/utils.js`: Utilidades comunes (cn, clsx).

### API Serverless
-   `api/search-jira.js`: Búsqueda de tickets Jira.
-   `api/batch-jira-fields.js`: Obtención en lote de links Figma desde tickets.
-   `api/get-jira-field.js`: Obtención de campo individual de ticket.
-   `api/figma-proxy.js`: Proxy seguro para Figma API.
-   `api/test-jira.js`: Endpoint de testing.

### Configuración
-   `firestore.rules`: Reglas de seguridad de Firestore.
-   `firestore.indexes.json`: Índices compuestos de Firestore.
-   `vercel.json`: Configuración de deploy (SPA rewrite).
-   `vite.config.js`: Configuración de build (alias @/, chunk size 1600KB).
-   `components.json`: Configuración de Shadcn UI.

---

## ✅ Versión 3.0 - Sala de Sesión Autónoma (Implementada)

> Documentación detallada en [implementation_plan.md](implementation_plan.md)

### Sala de Espera Automática
- A las **2:20pm (L-V)**, el sistema crea automáticamente la sala si hay sesiones agendadas para hoy.
- Si no hay sesiones, muestra "No hay presentaciones para hoy".
- Si alguien agenda después de las 2:20pm, la sala se crea/actualiza en tiempo real.
- Implementado con **Vercel Cron Job** (`api/create-daily-session.js`).
- Acceso desde la webapp con banner/botón "Unirse a la sesión de hoy".

### Control de Votación por Presentador
- Cada presentador inicia su propia votación al terminar de presentar.
- **Lock de concurrencia**: Solo una votación activa a la vez.
- **Se eliminó drag & drop** — la lista de sesiones es informativa.
- **Facilitador** conserva poder de **cancelación forzada** (estado `cancelled`): la sesión vuelve a "Pendiente" y el presentador puede reiniciar.
- **Acciones del presentador** en la sala:
  - "Cancelar presentación" — archiva la sesión.
  - "Mover a mañana" — cambia fecha al siguiente día hábil (L-J → día siguiente, V → lunes).
- Confirmaciones con AlertDialog para todas las acciones destructivas.
- Estados de sesión en la sala: Pendiente → En votación → Aprobado/Requiere nuevo/Cancelada.

### Estados de `live_sessions`
`waiting` → `voting` → `closed` / `cancelled`

---

## 🔗 Puntos de Integración Críticos

1.  **Jira API**: Fetch tickets → Extraer campo "✅ Solución:" → Parsear URL de Figma.
2.  **Figma API**: Obtener metadata del archivo + detectar Happy Paths → Cachear en Firestore.
3.  **Firebase Auth**: Google OAuth con validación de dominio `@prestamype.com`.
4.  **Firebase Firestore**: Sincronización en tiempo real de sesiones y votaciones.
5.  **Vercel Functions**: Proxy seguro para llamadas a APIs externas (Jira/Figma) que oculta tokens.
