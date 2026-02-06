# 📘 Design Critics Tracker - Project Context & Status

## 🚀 Descripción del Proyecto
Herramienta web profesional para gestionar, agendar y realizar seguimiento de "Design Critics" (revisiones de diseño de producto) en Prestamype. Diseñada para coordinar los flujos de trabajo entre diseñadores, integrándose directamente con **Jira Software** y **Figma**.

## 📅 Estado Actual (Febrero 2026)
**Versión:** 2.5.0 (Migración Shadcn UI & Validaciones)

### ✅ Funcionalidades Principales
1.  **Dashboard Personal**: Muestra los tickets activos asignados al usuario en Jira.
2.  **Integración Figma (Happy Paths)**: Detecta automáticamente los flujos ("Happy Paths") dentro de los archivos de Figma vinculados a los tickets.
3.  **Calendario Interactivo**: Vista semanal/mensual para agendar sesiones.
4.  **Sistema de Permisos**: Modelo de seguridad basado en propiedad (Owner-based).
5.  **Alertas Inteligentes**: Notificaciones contextuales para errores de configuración (e.g., falta de link en Figma).
6.  **Agenda del Día**: Tarjeta destacada que muestra las sesiones programadas para hoy con indicador de estado "En curso".
7.  **Validación de Formularios**: Validación robusta con React Hook Form + Zod en todos los formularios.

---

## 🧠 Lógica de Negocio y Sesiones

El núcleo de la aplicación es la gestión de sesiones de crítica. Existen reglas estrictas para mantener la integridad del proceso de diseño.

### Tipos de Sesión
Existen 3 tipos de sesiones, cada una con un comportamiento específico:

| Tipo | Propósito | Regla de Negocio |
| :--- | :--- | :--- |
| **Design Critic** | Primera revisión de un flujo nuevo o completo. | Es la entrada estándar. Consume 1 slot de "Critic" para el flujo. |
| **Iteración DS** | Revisión de correcciones menores o ajustes de Design System. | No afecta el conteo principal de criticas del flujo (generalmente). |
| **Nuevo alcance** | Cambio mayor en los requerimientos que invalida revisiones previas. | **Acción Destructiva:** Al crear una sesión de este tipo, el sistema **archiva automáticamente** todas las sesiones previas ("Design Critic") asociadas al mismo ticket y flujo, reiniciando el contador de progreso. |

### Lógica de Happy Paths (Figma)
-   **Detección**: El sistema escanea el archivo de Figma vinculado en el campo "Solución" de Jira.
-   **Criterio**: Busca Frames que contengan el componente "Encabezado casuística" o cuyo nombre empiece con "HP-".
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

2.  **Permisos de Acción**:
    -   **Crear**: Cualquier usuario puede crear sesiones, PERO solo asociado a **sus tickets asignados** en Jira.
    -   **Editar**: Estrictamente restringido al **Creador** de la sesión.
    -   **Eliminar**: Estrictamente restringido al **Creador** de la sesión.
    -   *Nota*: No existe un "Super Admin" en la interfaz; la moderación se basa en la responsabilidad individual.

3.  **Visibilidad**:
    -   **Pública**: Todos los usuarios pueden ver las sesiones de todos en el calendario (transparencia total).

---

## 🗓️ Guía de Uso del Calendario

### Interacción Desktop vs Mobile
La aplicación es totalmente **Responsive**.

-   **Desktop**:
    -   Vista de grilla semanal (5 columnas).
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
4.  **Smart Date**: Si es Sábado/Domingo, sugiere automáticamente el Lunes.

---

## 🛠️ Stack Tecnológico & Arquitectura

-   **Frontend**: React 18 + Vite.
    -   *UI Components*: Shadcn UI (15 componentes: Accordion, Alert Dialog, Avatar, Badge, Button, Card, Dialog, Dropdown Menu, Input, Label, Select, Skeleton, Sonner, Tabs, Textarea).
    -   *Form Validation*: React Hook Form + Zod para validaciones.
    -   *Estilos*: Tailwind CSS v4.
    -   *State*: React Hooks + Context Pattern local.
-   **Backend**:
    -   *Database*: Firebase Firestore (`dc_registrations`).
    -   *API Proxy*: Vercel Serverless Functions (Node.js) para comunicación segura con Jira API.
-   **Infraestructura**:
    -   Deploy automático en **Vercel** desde rama `main`.

## 📂 Directorio de Archivos Clave
-   `src/App.jsx`: Orquestador principal (718 líneas) con enrutamiento por Tabs, Navbar, DashboardPage y CalendarPage.
-   `src/components/TicketAccordion.jsx`: Lógica de visualización de tickets y integración Figma.
-   `src/components/CreateCriticsSession.jsx`: Formulario complejo (~780 líneas) con validaciones React Hook Form + Zod.
-   `src/components/AgendaCard.jsx`: Tarjeta que muestra sesiones programadas para hoy con estado "En curso".
-   `src/components/ui/`: 15 componentes Shadcn UI reutilizables (accordion, alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, input, label, select, skeleton, sonner, tabs, textarea).
-   `src/hooks/useHappyPaths.js`: Hook personalizado con estrategia Stale-While-Revalidate para caching y fetch de Figma.
-   `src/services/data.js`: Capa de abstracción para Firestore (CRUD + Lógica de Archivo + Suscripciones Realtime).
-   `api/`: Serverless Functions (Figma proxy, Jira search, Jira field getter).
