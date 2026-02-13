# Implementation Plan - v3.0: Sala de Sesión Autónoma

## Objetivo
Descentralizar el control del sistema de votación: la sala se crea automáticamente, cada presentador controla su propia votación, y el facilitador solo interviene en casos excepcionales.

---

## Propuesta 1: Sala de Espera Automática

### Descripción
A las **2:20pm (America/Lima), de lunes a viernes**, el sistema crea automáticamente una sesión de sala si hay sesiones de Design Critic agendadas para ese día. Si no hay sesiones agendadas, muestra un mensaje "No hay presentaciones para hoy". Si alguien agenda después de las 2:20pm, la sala se crea/actualiza en tiempo real.

### Implementación

#### 1. Vercel Cron Job
**[NEW] `api/create-daily-session.js`**
- Serverless function que se ejecuta automáticamente a las 2:20pm Lima (L-V).
- Consulta Firestore: busca `critics_sessions` con `fecha_dc` = hoy y `estado` = "activo".
- Si hay sesiones → crea un documento en `live_sessions` con estado `waiting` (nuevo estado).
- Si no hay sesiones → no crea nada (el frontend muestra "No hay presentaciones").

**[MODIFY] `vercel.json`**
- Agregar configuración de cron:
```json
{
  "crons": [{
    "path": "/api/create-daily-session",
    "schedule": "20 19 * * 1-5"
  }]
}
```
> Nota: `19:20 UTC` = `2:20pm Lima` (UTC-5). Ajustar si hay horario de verano.

#### 2. Nuevo estado de sesión: `waiting`
**[MODIFY] `live_sessions` collection**
- Agregar estado `waiting` (sala abierta, esperando que inicie la primera votación).
- Estados posibles: `waiting` → `voting` → `closed` / `cancelled`.

#### 3. Acceso desde la webapp
**[MODIFY] `src/App.jsx` o componente de Navbar**
- A partir de las 2:20pm, mostrar un botón/banner "Unirse a la sesión de hoy" que lleva a `/live/:sessionCode`.
- Si no hay sesión, mostrar "No hay presentaciones para hoy".
- Si alguien agenda después de las 2:20pm y no existe sala, crearla automáticamente al detectar la nueva sesión.

**[MODIFY] `src/hooks/useTodaySessionStatus.js`**
- Adaptar para escuchar el nuevo estado `waiting`.
- Retornar info de si la sala está abierta para unirse.

---

## Propuesta 2: Control de Votación por Presentador

### Descripción
Cada presentador inicia su propia votación cuando termina de presentar. Solo puede haber una votación activa a la vez (lock de concurrencia). Se elimina el drag & drop. El facilitador conserva poder de cancelación forzada.

### Implementación

#### 1. Agenda visible en la sala
**[MODIFY] `src/components/LiveVotingPage.jsx`**
- En la parte superior de la sala, mostrar la lista de sesiones agendadas para hoy.
- Cada sesión muestra: ticket, flujo, presentador, y estado (Pendiente / En votación / Aprobado / Requiere nuevo / Cancelada).

#### 2. Botón "Iniciar Votación" por presentador
**[MODIFY] `src/components/LiveVotingPage.jsx`**
- Cada presentador ve el botón "Iniciar Votación" **solo en su propia sesión**.
- El botón se deshabilita si ya hay otra votación en curso (lock).
- Al hacer clic, cambia el estado de esa sesión a `voting` en `live_sessions`.

**[MODIFY] `src/services/voting.js`**
- Nueva función `startVoteForSession(sessionId, criticId)`:
  - Verifica que no haya otra votación activa (lock de concurrencia).
  - Si hay una activa → rechaza con mensaje "Ya hay una votación en curso".
  - Si no → marca la sesión de crítica como "en votación".

#### 3. Lock de concurrencia
**[MODIFY] `src/services/voting.js`**
- Campo `currentVotingCriticId` en `live_sessions` para trackear qué sesión de crítica está en votación.
- Solo se puede cambiar si es `null` (ninguna votación activa) o si la anterior fue cerrada/cancelada.
- Usar Firestore transactions para evitar race conditions.

#### 4. Eliminar drag & drop
**[MODIFY] `src/components/VotingControlPanel.jsx`**
- Remover lógica de @dnd-kit para reordenar sesiones.
- La lista es informativa, el orden no importa porque cada quien inicia cuando quiere.

**[OPTIONAL] `package.json`**
- Evaluar si @dnd-kit se usa en otro lado. Si no, desinstalar la dependencia.

#### 5. Cancelación forzada por facilitador
**[MODIFY] `src/services/voting.js`**
- Nueva función `cancelVote(sessionId)`:
  - Cambia estado de la votación a `cancelled`.
  - Resetea `currentVotingCriticId` a `null`.
  - La sesión de crítica vuelve a estado "Pendiente" (puede reiniciarse).
  - Los votos parciales se descartan (no se registra resultado).

**[MODIFY] `src/components/VotingControlPanel.jsx` o `LiveVotingPage.jsx`**
- Botón "Cancelar votación" visible solo para el facilitador cuando hay una votación activa.

#### 6. Acciones del presentador en la sala
**[MODIFY] `src/components/LiveVotingPage.jsx`**
- Cada presentador ve en su propia sesión:
  - **"Cancelar presentación"**: Archiva/elimina la sesión del día.
  - **"Mover a mañana"**: Cambia `fecha_dc` al siguiente día hábil (L-J → día siguiente, V → lunes).
- Solo visible para el dueño de la sesión.

**[MODIFY] `src/services/data.js`**
- Nueva función `rescheduleSession(sessionId, newDate)` para mover sesión.
- Reutilizar lógica de Smart Date existente en `votingHelpers.js`.

---

## Cambios en Firestore

### `live_sessions` (campos nuevos/modificados)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `status` | string | `waiting` / `voting` / `closed` / `cancelled` (antes: `active` / `closed`) |
| `currentVotingCriticId` | string\|null | ID de la sesión de crítica actualmente en votación (lock) |
| `autoCreated` | boolean | `true` si fue creada por el cron job |

### `critics_sessions` (campo nuevo)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `votingStatus` | string | `pending` / `voting` / `voted` / `cancelled` (estado dentro de la sesión en vivo) |

### Firestore Rules
**[MODIFY] `firestore.rules`**
- Permitir que cualquier usuario `@prestamype.com` pueda iniciar votación en su propia sesión de crítica.
- Mantener que solo el facilitador pueda cancelar votaciones forzadamente.
- Permitir que el presentador pueda cancelar/mover su propia sesión desde la sala.

---

## Orden de Implementación Sugerido

### Fase 1: Backend & Data
1. Agregar nuevos campos a Firestore (`votingStatus`, `currentVotingCriticId`, etc.).
2. Actualizar `firestore.rules` con nuevos permisos.
3. Crear `api/create-daily-session.js` (cron job).
4. Actualizar `vercel.json` con cron config.
5. Agregar funciones en `voting.js`: `startVoteForSession`, `cancelVote`.
6. Agregar `rescheduleSession` en `data.js`.

### Fase 2: Frontend - Sala de Espera
7. Modificar `useTodaySessionStatus.js` para estado `waiting`.
8. Agregar banner/botón de acceso a la sala en la webapp.
9. Modificar `LiveVotingPage.jsx`: agenda del día en la parte superior.

### Fase 3: Frontend - Control del Presentador (Completado)
10. Botón "Iniciar Votación" por presentador con lock visual.
11. Acciones "Cancelar" y "Mover a mañana" por presentador.
12. Botón "Cancelar votación" para facilitador.
13. Eliminar drag & drop del `VotingControlPanel`.

### Fase 4: Cleanup (Completado)
14. Evaluar desinstalar @dnd-kit si ya no se usa.
15. Actualizar `PROJECT_STATUS.md` con los cambios finales.

---

## Verificación

### Casos de prueba manuales
- [ ] A las 2:20pm con sesiones agendadas → se crea la sala automáticamente.
- [ ] A las 2:20pm sin sesiones → muestra "No hay presentaciones".
- [ ] Agendar después de las 2:20pm → la sala se crea/actualiza en tiempo real.
- [ ] Presentador inicia votación → se activa correctamente.
- [ ] Segundo presentador intenta iniciar mientras hay votación activa → botón deshabilitado.
- [ ] Facilitador cancela votación → sesión vuelve a "Pendiente", presentador puede reiniciar.
- [ ] Presentador cancela su sesión desde la sala → se archiva/elimina.
- [ ] Presentador mueve sesión a mañana (L-J) → fecha cambia al día siguiente.
- [ ] Presentador mueve sesión a mañana (Viernes) → fecha cambia al lunes.
- [ ] Votación se cierra con resultado → estado "Aprobado" o "Requiere nuevo" registrado.

---

## Plan anterior (v2.5 - Completado)

<details>
<summary>Ver plan de Refactoring UI & Forms (v2.5)</summary>

### Objetivo
Modernizar la UI con Shadcn components, enforcing type safety y validación con Zod/React Hook Form.

### Cambios realizados
1. Instalación de `react-hook-form`, `zod`, `@hookform/resolvers`.
2. Refactor `TicketAccordion.jsx` → Shadcn Accordion.
3. Refactor `CreateCriticsSession.jsx` → React Hook Form + Zod.
4. Optimización de CSS & Tailwind.

**Estado: Completado**
</details>
