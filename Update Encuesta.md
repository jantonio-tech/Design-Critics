# Update Encuesta - Sistema de Votación de Design Critics

**Versión:** 3.0.0
**Fecha:** 5 de Febrero 2026
**Autor:** Design Critics Team
**Proyecto:** Design Critics Tracker - Prestamype

---

## 📋 RESUMEN EJECUTIVO

### Objetivo
Implementar un sistema de votación en vivo que permita a los asistentes de sesiones de Design Critics evaluar cada Happy Path presentado mediante votación democrática, determinando si el diseño está listo para desarrollo o requiere una nueva iteración de Critics.

### Alcance
- Sistema de votación en tiempo real durante sesiones de Google Meet
- Gestión dinámica de presentaciones con reordenamiento
- Panel de control para facilitador (jantonio@prestamype.com)
- Interfaz de votación para asistentes
- Registro completo de resultados para reportes futuros
- Lógica de agendamiento post-sesión

### Impacto
- **Usuarios afectados:** 8 personas del área de UX
- **Nuevas colecciones:** `live_sessions`
- **Colecciones modificadas:** `critics_sessions`
- **Nuevos componentes:** ~6-8 componentes React
- **Tiempo de desarrollo estimado:** 2-3 semanas

---

## 🏗️ ARQUITECTURA GENERAL

### Flujo de Alto Nivel

```
1. Facilitador inicia sesión de votaciones del día
   ↓
2. Sistema genera código único (05FEBA7X) y link
   ↓
3. Asistentes abren link y se conectan
   ↓
4. Por cada presentación:
   a. Presentador expone Happy Path
   b. Facilitador lanza votación
   c. Asistentes votan (Aprobado/Requiere nuevo)
   d. Sistema muestra resultado
   e. Se guarda resultado en Firestore
   ↓
5. Facilitador cierra sesión → Resumen final
   ↓
6. Sistema bloquea agendas para "hoy"
```

### Tecnologías Nuevas
- `@dnd-kit/core` v6.1.0 - Drag & drop
- `@dnd-kit/sortable` v8.0.0 - Listas reordenables
- `date-fns` v3.0.0 - Manejo de fechas (ya instalado)

---

## 🔧 CAMBIOS DETALLADOS POR MÓDULO

---

## 1. FIRESTORE SCHEMA

### 1.1. Nueva Colección: `live_sessions`

**Propósito:** Gestionar sesiones de votación en vivo

```javascript
// Collection: live_sessions
{
  // Identificación
  code: "05FEBA7X",                    // Código único de sesión
  date: "2026-02-05",                  // Fecha YYYY-MM-DD
  createdAt: Timestamp,
  expiresAt: Timestamp,                // createdAt + 8 horas
  status: "active",                    // active | closed | expired
  facilitator: "jantonio@prestamype.com",

  // Usuarios conectados (actualizado en tiempo real)
  connectedUsers: [
    {
      email: "juan.perez@prestamype.com",
      name: "Juan Pérez",
      connectedAt: Timestamp,
      lastSeenAt: Timestamp,           // Heartbeat cada 30 seg
      online: true,                    // false si cerró el link
      disconnectedAt: Timestamp | null
    }
  ],

  // Votaciones de la sesión
  votes: [
    {
      voteId: "vote-1",
      sessionId: "session-abc123",     // ref a critics_sessions
      ticket: "UX-1234",
      happyPath: "Login exitoso",
      presenter: "jeremy@prestamype.com",
      presenterName: "Jeremy",
      presentationOrder: 1,            // Orden actual (puede cambiar)

      status: "completed",             // pending | active | completed | skipped
      launchedAt: Timestamp | null,
      completedAt: Timestamp | null,

      // Votantes elegibles (snapshot al lanzar)
      eligibleVoters: [
        "juan.perez@prestamype.com",
        "maria.garcia@prestamype.com"
      ],
      expectedVotes: 6,                // Dinámico según quién está online

      // Votos recibidos (data completa para reportes)
      votes: [
        {
          email: "juan.perez@prestamype.com",
          name: "Juan Pérez",
          decision: "approved",        // approved | needs_critic
          comment: "Me parece bien el flujo",
          votedAt: Timestamp
        }
      ],

      // Resultado final
      result: {
        decision: "approved",          // approved | needs_critic
        approvedCount: 5,
        needsCriticCount: 1,
        totalVotes: 6,
        completedAt: Timestamp,

        // Para reportes (no mostrar en UI)
        approvedBy: [
          "juan.perez@prestamype.com",
          "maria.garcia@prestamype.com"
        ],
        needsCriticBy: [
          "carlos.diaz@prestamype.com"
        ]
      }
    }
  ],

  // Resumen de la sesión (generado al cerrar)
  summary: {
    totalPresentations: 4,
    totalApproved: 3,
    totalNeedsCritic: 1,
    duration: 4500,                    // segundos
    closedAt: Timestamp,
    closedBy: "jantonio@prestamype.com"
  }
}
```

### 1.2. Actualización de Colección: `critics_sessions`

**Campos nuevos:**

```javascript
{
  // ... campos existentes ...

  // NUEVO: Orden de presentación
  presentationOrder: 1,                // Orden en el día (drag & drop)

  // NUEVO: Trazabilidad de movimientos
  movidaDesde: "2026-02-05" | null,    // Fecha original si fue movida
  movidaAt: Timestamp | null,

  // NUEVO: Resultado de votación
  voteResult: {
    voted: true,
    votedAt: Timestamp,
    liveSessionCode: "05FEBA7X",       // ref a live_sessions

    // Resultado simple (para UI)
    result: "approved",                // approved | needs_critic
    totalVotes: 6,

    // Data completa (para reportes futuros)
    details: {
      approvedCount: 5,
      needsCriticCount: 1,
      votes: [
        {
          voter: "juan.perez@prestamype.com",
          voterName: "Juan Pérez",
          decision: "approved",
          comment: "",
          votedAt: Timestamp
        }
      ]
    },

    // Si requiere nuevo critics
    requiresNewCritic: true,
    newCriticScheduled: false,         // true cuando se agenda
    newCriticSessionId: "session-xyz789" | null
  }
}
```

---

## 2. FIRESTORE SECURITY RULES

### 2.1. Actualización Completa de `firestore.rules`

**Archivo:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ========== FUNCIONES HELPER ==========

    function isAuthenticated() {
      return request.auth != null;
    }

    function isPrestamypeUser() {
      return isAuthenticated() &&
             request.auth.token.email != null &&
             request.auth.token.email.matches('.*@prestamype.com$');
    }

    function isAnonymousUser() {
      return isAuthenticated() &&
             request.auth.token.firebase.sign_in_provider == 'anonymous';
    }

    function isAuthorizedUser() {
      return isPrestamypeUser() || isAnonymousUser();
    }

    function isOwner(resource) {
      return isPrestamypeUser() &&
             resource.data.presentador_email == request.auth.token.email;
    }

    // NUEVA: Verificar si es el facilitador
    function isFacilitator() {
      return isPrestamypeUser() &&
             request.auth.token.email == 'jantonio@prestamype.com';
    }

    // ========== CRITICS_SESSIONS ==========

    match /critics_sessions/{docId} {
      allow read: if isAuthorizedUser() &&
                     (resource.data.estado == 'activo' || isOwner(resource));

      // Cualquier usuario Prestamype puede crear (incluyendo jantonio)
      allow create: if isPrestamypeUser() &&
                       request.resource.data.presentador_email == request.auth.token.email;

      // Puede actualizar si:
      // 1. Es el dueño (jantonio puede editar sus propias sesiones)
      // 2. Es facilitador Y solo modifica presentationOrder
      allow update: if isOwner(resource) ||
                       (isFacilitator() && onlyReordering());

      // Dueño puede eliminar sus propias sesiones (jantonio incluido)
      allow delete: if isOwner(resource);

      function onlyReordering() {
        let changedKeys = request.resource.data.diff(resource.data)
                           .affectedKeys();
        return changedKeys.hasOnly(['presentationOrder', 'updatedAt']);
      }
    }

    // ========== LIVE_SESSIONS (NUEVA) ==========

    match /live_sessions/{sessionCode} {
      // Cualquier usuario autorizado puede leer sesiones activas
      allow read: if isAuthorizedUser() &&
                     resource.data.status == 'active';

      // Solo facilitador puede crear sesiones de votación
      allow create: if isFacilitator();

      // Facilitador puede actualizar completamente
      // Usuarios pueden actualizar solo su conexión y votos
      allow update: if isFacilitator() ||
                       (isPrestamypeUser() && isValidUserUpdate());

      // Solo facilitador puede cerrar/eliminar sesiones
      allow delete: if isFacilitator();

      function isValidUserUpdate() {
        let affectedKeys = request.resource.data.diff(resource.data)
                            .affectedKeys();
        return affectedKeys.hasOnly(['connectedUsers', 'votes']);
      }
    }

    // ========== USER_SETTINGS ==========

    match /user_settings/{email} {
      allow read: if isPrestamypeUser() && email == request.auth.token.email ||
                     isAnonymousUser();
      allow write: if isPrestamypeUser() && email == request.auth.token.email;
    }

    // ========== FIGMA_CACHE ==========

    match /figma_cache/{fileKey} {
      allow read, write: if isAuthorizedUser();
    }
  }
}
```

**Cambios principales:**
1. ✅ Nueva función `isFacilitator()` para jantonio@prestamype.com
2. ✅ Nueva colección `live_sessions` con reglas específicas
3. ✅ Facilitador puede reordenar presentaciones (campo `presentationOrder`)
4. ✅ Usuarios pueden actualizar su conexión y votos en `live_sessions`
5. ✅ jantonio mantiene permisos de usuario normal para sus propias sesiones

---

## 3. NUEVOS COMPONENTES REACT

### 3.1. Panel de Control del Facilitador

**Archivo nuevo:** `src/components/VotingControlPanel.jsx`

**Responsabilidades:**
- Mostrar usuarios conectados en tiempo real
- Listar presentaciones pendientes del día
- Implementar drag & drop para reordenar
- Lanzar votaciones individuales
- Mostrar resultados en tiempo real
- Cerrar sesión con resumen

**Props:**
```javascript
{
  sessionCode: string,        // "05FEBA7X"
  date: string,               // "2026-02-05"
  onClose: () => void
}
```

**Estado principal:**
```javascript
const [connectedUsers, setConnectedUsers] = useState([]);
const [presentations, setPresentations] = useState([]);
const [activeVote, setActiveVote] = useState(null);
const [completedVotes, setCompletedVotes] = useState([]);
```

**Librerías:**
- `@dnd-kit/core` para drag & drop
- `@dnd-kit/sortable` para lista reordenable
- Firestore `onSnapshot` para realtime updates

---

### 3.2. Página de Votación (Asistentes)

**Archivo nuevo:** `src/components/LiveVotingPage.jsx`

**Ruta:** `/live/:sessionCode`

**Responsabilidades:**
- Formulario de conexión (email)
- Mostrar estado "esperando votación"
- Mostrar formulario de votación cuando se lanza
- Guardar voto inmediatamente
- Mostrar resultado cuando todos votan
- Historial de votaciones del día

**Params:**
```javascript
const { sessionCode } = useParams(); // "05FEBA7X"
```

**Estado principal:**
```javascript
const [userEmail, setUserEmail] = useState(null);
const [connected, setConnected] = useState(false);
const [activeVote, setActiveVote] = useState(null);
const [hasVoted, setHasVoted] = useState(false);
const [voteHistory, setVoteHistory] = useState([]);
```

---

### 3.3. Modal de Inicio de Sesión

**Archivo nuevo:** `src/components/StartVotingSessionModal.jsx`

**Responsabilidades:**
- Detectar presentaciones del día
- Generar código único
- Crear documento en `live_sessions`
- Mostrar QR code y link para compartir
- Mostrar contador de usuarios conectados

**Props:**
```javascript
{
  date: string,              // "2026-02-05"
  open: boolean,
  onClose: () => void,
  onSessionCreated: (sessionCode: string) => void
}
```

---

### 3.4. Modal de Resumen Final

**Archivo nuevo:** `src/components/SessionSummaryModal.jsx`

**Responsabilidades:**
- Mostrar estadísticas de la sesión
- Listar resultados sin porcentajes
- Advertencia sobre agendamiento futuro
- Botón descargar PDF (opcional)
- Cerrar sesión y actualizar Firestore

**Props:**
```javascript
{
  sessionCode: string,
  summary: object,
  votes: array,
  open: boolean,
  onClose: () => void
}
```

---

### 3.5. Card de Presentación (Drag & Drop)

**Archivo nuevo:** `src/components/SortablePresentation.jsx`

**Responsabilidades:**
- Mostrar info de presentación
- Handle de arrastre (☰)
- Botón "Lanzar votación"
- Visual feedback al arrastrar

**Props:**
```javascript
{
  presentation: object,
  onLaunchVote: (sessionId: string) => void
}
```

---

### 3.6. Widget de Resultado en Tiempo Real

**Archivo nuevo:** `src/components/LiveVoteResults.jsx`

**Responsabilidades:**
- Mostrar progreso "X/Y votos"
- Listar quién votó (sin mostrar qué votaron)
- Listar quién falta votar
- Mostrar resultado final cuando completa

**Props:**
```javascript
{
  vote: object,              // Objeto vote de live_sessions
  showDetails: boolean       // true solo para facilitador
}
```

---

## 4. MODIFICACIONES A COMPONENTES EXISTENTES

### 4.1. `App.jsx`

**Cambios:**
- Añadir ruta `/live/:sessionCode` para página de votación
- Mantener rutas existentes

```jsx
// Añadir import
import LiveVotingPage from './components/LiveVotingPage';

// En el router
<Route path="/live/:sessionCode" element={<LiveVotingPage />} />
```

---

### 4.2. `TicketAccordion.jsx`

**Cambios:**
- Implementar hook `useTodaySessionStatus()`
- Cambiar botón "Agendar hoy" dinámicamente
- Usar función `getNextAvailableDate()`

**Antes:**
```jsx
<button onClick={() => handleSchedule('hoy')}>
  📅 Agendar hoy
</button>
```

**Después:**
```jsx
function TicketAccordion({ ticket, happyPaths }) {
  const sessionStatus = useTodaySessionStatus();
  const nextDate = getNextAvailableDate(sessionStatus.closed);

  return (
    <div className="ticket-accordion">
      {happyPaths.map(hp => (
        <div key={hp.name} className="happy-path">
          <span>{hp.name}</span>
          <button onClick={() => scheduleForDate(ticket, hp, nextDate.date)}>
            📅 {nextDate.labelShort}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 4.3. `CreateCriticsSession.jsx`

**Cambios:**
- Añadir validación de fecha mínima
- Bloquear fecha actual si sesión está cerrada
- Mostrar mensaje de advertencia

```jsx
function CreateCriticsSession() {
  const sessionStatus = useTodaySessionStatus();
  const nextDate = getNextAvailableDate(sessionStatus.closed);

  const validateScheduleDate = (selectedDate) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const selected = format(selectedDate, 'yyyy-MM-dd');

    if (sessionStatus.closed && selected === today) {
      return {
        valid: false,
        message: `La sesión de hoy ya finalizó. Por favor agenda para ${nextDate.labelShort.toLowerCase()}.`
      };
    }

    return { valid: true };
  };

  return (
    <form>
      {/* ... otros campos ... */}

      <div>
        <label>Fecha de presentación</label>
        <input
          type="date"
          min={format(nextDate.date, 'yyyy-MM-dd')}
          {...register('scheduledDate')}
        />

        {sessionStatus.closed && (
          <p className="text-amber-600 text-sm mt-1">
            ℹ️ La sesión de hoy ya finalizó. Fecha mínima: {nextDate.labelShort}
          </p>
        )}
      </div>
    </form>
  );
}
```

---

### 4.4. Dashboard/Calendario

**Cambios:**
- Añadir botón "Iniciar votaciones" (solo para facilitador)
- Mostrar resultados de votación en cards de tickets
- Badge de estado: "✅ Aprobado" o "🔄 Requiere nuevo"

```jsx
// En el Dashboard (tab de Calendar o similar)
{isFacilitator(currentUser.email) && (
  <button onClick={openStartVotingModal}>
    🚀 Iniciar votaciones del día
  </button>
)}

// En cards de tickets (después de votación)
{session.voteResult?.voted && (
  <div className="vote-result">
    <span className={session.voteResult.result === 'approved' ? 'badge-success' : 'badge-warning'}>
      {session.voteResult.result === 'approved' ? '✅ Aprobado' : '🔄 Requiere nuevo Critics'}
    </span>
    <p className="text-sm text-gray-600">
      Evaluado: {format(session.voteResult.votedAt.toDate(), 'dd MMM HH:mm')}
    </p>
  </div>
)}
```

---

## 5. UTILIDADES Y HOOKS

### 5.1. Hook: `useTodaySessionStatus`

**Archivo nuevo:** `src/hooks/useTodaySessionStatus.js`

```javascript
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { format } from 'date-fns';

export function useTodaySessionStatus() {
  const [status, setStatus] = useState({
    exists: false,
    closed: false,
    closedAt: null
  });

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    const q = query(
      collection(db, 'live_sessions'),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setStatus({ exists: false, closed: false, closedAt: null });
      } else {
        const session = snapshot.docs[0].data();
        setStatus({
          exists: true,
          closed: session.status === 'closed',
          closedAt: session.summary?.closedAt || null
        });
      }
    });

    return unsubscribe;
  }, []);

  return status;
}
```

---

### 5.2. Utilidad: `getNextAvailableDate`

**Archivo nuevo:** `src/utils/votingHelpers.js`

```javascript
import { addDays, nextMonday, getDay, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function getNextAvailableDate(sessionClosed) {
  const now = new Date();
  const dayOfWeek = getDay(now); // 0=Domingo, 1=Lunes, ..., 5=Viernes

  // Si la sesión NO está cerrada, puede agendar para hoy
  if (!sessionClosed) {
    return {
      date: now,
      label: 'Agendar hoy',
      labelShort: 'Hoy'
    };
  }

  // Si la sesión está cerrada, siguiente día hábil
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Lunes a Jueves → mañana
    const tomorrow = addDays(now, 1);
    return {
      date: tomorrow,
      label: 'Agendar mañana',
      labelShort: 'Mañana'
    };
  } else if (dayOfWeek === 5) {
    // Viernes → el lunes
    const monday = nextMonday(now);
    return {
      date: monday,
      label: 'Agendar el lunes',
      labelShort: 'Lunes'
    };
  } else {
    // Sábado/Domingo → el lunes
    const monday = nextMonday(now);
    return {
      date: monday,
      label: 'Agendar el lunes',
      labelShort: 'Lunes'
    };
  }
}
```

---

### 5.3. Utilidad: Generación de Códigos

**Archivo:** `src/utils/votingHelpers.js` (añadir)

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export function generateSessionCode(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('es', { month: 'short' }).toUpperCase().substring(0, 3);
  const random = generateShortHash(3);

  return `${day}${month}${random}`;
  // Ejemplos: 05FEBA7X, 06FEBK2M, 12MARP3L
}

function generateShortHash(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0, O, I, 1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function createUniqueSessionCode(date) {
  let code = generateSessionCode(date);
  let attempts = 0;

  while (attempts < 5) {
    const docRef = doc(db, 'live_sessions', code);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return code; // Código único encontrado
    }

    code = generateSessionCode(date);
    attempts++;
  }

  // Fallback: añadir timestamp
  return `${code}${Date.now().toString().slice(-2)}`;
}
```

---

### 5.4. Utilidad: Heartbeat (Keep Alive)

**Archivo:** `src/utils/votingHelpers.js` (añadir)

```javascript
import { doc, updateDoc, serverTimestamp, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export function startHeartbeat(sessionCode, userEmail) {
  const interval = setInterval(async () => {
    try {
      const sessionRef = doc(db, 'live_sessions', sessionCode);

      // Actualizar lastSeenAt del usuario
      const sessionDoc = await getDoc(sessionRef);
      if (sessionDoc.exists()) {
        const users = sessionDoc.data().connectedUsers || [];
        const updatedUsers = users.map(u =>
          u.email === userEmail
            ? { ...u, lastSeenAt: serverTimestamp(), online: true }
            : u
        );

        await updateDoc(sessionRef, {
          connectedUsers: updatedUsers
        });
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }, 30000); // Cada 30 segundos

  return interval;
}

export function stopHeartbeat(intervalId) {
  clearInterval(intervalId);
}
```

---

### 5.5. Servicio: Voting Service

**Archivo nuevo:** `src/services/voting.js`

```javascript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { createUniqueSessionCode } from '../utils/votingHelpers';

export class VotingService {

  // Crear sesión de votación
  static async createLiveSession(date, facilitatorEmail) {
    const code = await createUniqueSessionCode(new Date(date));
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 8 * 60 * 60 * 1000) // +8 horas
    );

    const sessionData = {
      code,
      date,
      createdAt: serverTimestamp(),
      expiresAt,
      status: 'active',
      facilitator: facilitatorEmail,
      connectedUsers: [],
      votes: [],
      summary: null
    };

    await setDoc(doc(db, 'live_sessions', code), sessionData);

    return code;
  }

  // Conectar usuario a sesión
  static async connectUser(sessionCode, userEmail, userName) {
    const sessionRef = doc(db, 'live_sessions', sessionCode);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error('Sesión no encontrada');
    }

    const users = sessionDoc.data().connectedUsers || [];
    const existingUser = users.find(u => u.email === userEmail);

    if (existingUser) {
      // Reconexión
      const updatedUsers = users.map(u =>
        u.email === userEmail
          ? { ...u, online: true, lastSeenAt: serverTimestamp(), disconnectedAt: null }
          : u
      );

      await updateDoc(sessionRef, { connectedUsers: updatedUsers });
    } else {
      // Nueva conexión
      const newUser = {
        email: userEmail,
        name: userName,
        connectedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        online: true,
        disconnectedAt: null
      };

      await updateDoc(sessionRef, {
        connectedUsers: arrayUnion(newUser)
      });
    }
  }

  // Lanzar votación
  static async launchVote(sessionCode, sessionId, presentation) {
    const sessionRef = doc(db, 'live_sessions', sessionCode);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error('Sesión no encontrada');
    }

    const session = sessionDoc.data();
    const eligibleVoters = session.connectedUsers
      .filter(u => u.online === true)
      .map(u => u.email);

    const newVote = {
      voteId: `vote-${Date.now()}`,
      sessionId,
      ticket: presentation.ticket,
      happyPath: presentation.happy_path,
      presenter: presentation.presentador_email,
      presenterName: presentation.presentador_nombre,
      presentationOrder: presentation.presentationOrder,
      status: 'active',
      launchedAt: serverTimestamp(),
      completedAt: null,
      eligibleVoters,
      expectedVotes: eligibleVoters.length,
      votes: [],
      result: null
    };

    const votes = session.votes || [];
    votes.push(newVote);

    await updateDoc(sessionRef, { votes });

    return newVote.voteId;
  }

  // Registrar voto
  static async submitVote(sessionCode, voteId, userEmail, userName, decision, comment = '') {
    const sessionRef = doc(db, 'live_sessions', sessionCode);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error('Sesión no encontrada');
    }

    const session = sessionDoc.data();
    const votes = session.votes || [];
    const voteIndex = votes.findIndex(v => v.voteId === voteId);

    if (voteIndex === -1) {
      throw new Error('Votación no encontrada');
    }

    const vote = votes[voteIndex];

    // Validar elegibilidad
    if (!vote.eligibleVoters.includes(userEmail)) {
      throw new Error('No estás habilitado para votar en esta presentación');
    }

    // Validar voto duplicado
    if (vote.votes.some(v => v.email === userEmail)) {
      throw new Error('Ya votaste en esta presentación');
    }

    // Añadir voto
    const newVote = {
      email: userEmail,
      name: userName,
      decision,
      comment,
      votedAt: serverTimestamp()
    };

    vote.votes.push(newVote);

    // Verificar si completó
    if (vote.votes.length === vote.expectedVotes) {
      const approvedCount = vote.votes.filter(v => v.decision === 'approved').length;
      const needsCriticCount = vote.votes.filter(v => v.decision === 'needs_critic').length;

      vote.status = 'completed';
      vote.completedAt = serverTimestamp();
      vote.result = {
        decision: approvedCount > needsCriticCount ? 'approved' : 'needs_critic',
        approvedCount,
        needsCriticCount,
        totalVotes: vote.votes.length,
        completedAt: serverTimestamp(),
        approvedBy: vote.votes.filter(v => v.decision === 'approved').map(v => v.email),
        needsCriticBy: vote.votes.filter(v => v.decision === 'needs_critic').map(v => v.email)
      };
    }

    votes[voteIndex] = vote;
    await updateDoc(sessionRef, { votes });
  }

  // Cerrar sesión
  static async closeLiveSession(sessionCode, facilitatorEmail) {
    const sessionRef = doc(db, 'live_sessions', sessionCode);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
      throw new Error('Sesión no encontrada');
    }

    const session = sessionDoc.data();
    const votes = session.votes || [];

    // Calcular estadísticas
    const totalPresentations = votes.length;
    const totalApproved = votes.filter(v => v.result?.decision === 'approved').length;
    const totalNeedsCritic = votes.filter(v => v.result?.decision === 'needs_critic').length;

    const startTime = session.createdAt.toDate();
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    // Actualizar sesión
    await updateDoc(sessionRef, {
      status: 'closed',
      summary: {
        totalPresentations,
        totalApproved,
        totalNeedsCritic,
        duration,
        closedAt: serverTimestamp(),
        closedBy: facilitatorEmail
      }
    });

    // Actualizar cada critics_session con resultado
    const batch = writeBatch(db);

    for (const vote of votes) {
      if (vote.sessionId && vote.result) {
        const criticRef = doc(db, 'critics_sessions', vote.sessionId);
        batch.update(criticRef, {
          'voteResult.voted': true,
          'voteResult.votedAt': vote.result.completedAt,
          'voteResult.liveSessionCode': sessionCode,
          'voteResult.result': vote.result.decision,
          'voteResult.totalVotes': vote.result.totalVotes,
          'voteResult.details': {
            approvedCount: vote.result.approvedCount,
            needsCriticCount: vote.result.needsCriticCount,
            votes: vote.votes
          },
          'voteResult.requiresNewCritic': vote.result.decision === 'needs_critic',
          'voteResult.newCriticScheduled': false,
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();

    return session.summary;
  }

  // Reordenar presentaciones
  static async reorderPresentations(presentations) {
    const batch = writeBatch(db);

    presentations.forEach((presentation, index) => {
      const ref = doc(db, 'critics_sessions', presentation.id);
      batch.update(ref, {
        presentationOrder: index + 1,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
  }
}
```

---

## 6. INSTALACIÓN DE DEPENDENCIAS

```bash
npm install @dnd-kit/core@6.1.0 @dnd-kit/sortable@8.0.0
```

**Verificar que ya estén instaladas:**
- `date-fns` ✓ (ya instalado)
- `sonner` ✓ (ya instalado)
- `react-hook-form` ✓ (ya instalado)
- `zod` ✓ (ya instalado)

---

## 7. FLUJOS DE USUARIO DETALLADOS

### 7.1. Flujo: Facilitador Inicia Sesión de Votaciones

```
1. jantonio abre la app → Dashboard/Calendario
2. Click en "🚀 Iniciar votaciones del día"
3. Sistema:
   - Query a critics_sessions con date=hoy y estado=activo
   - Genera código único (05FEBA7X)
   - Crea documento en live_sessions
4. Modal muestra:
   - Link: dc-tracker.app/live/05FEBA7X
   - QR code
   - Botón "Copiar mensaje para Meet"
   - Contador: 0/8 conectados
5. jantonio comparte link en chat de Google Meet
6. Asistentes empiezan a conectar → contador actualiza: 1/8, 2/8, ...
7. jantonio click "Continuar al panel de control" →
8. VotingControlPanel se abre
```

---

### 7.2. Flujo: Asistente Se Conecta y Vota

```
1. Juan abre link dc-tracker.app/live/05FEBA7X
2. Página muestra:
   - Input de email (autocompletado con @prestamype.com)
   - Botón "Conectar"
3. Juan ingresa juan.perez@ → autocompleta a juan.perez@prestamype.com
4. Click "Conectar"
5. Sistema:
   - Guarda email en localStorage
   - Añade a connectedUsers en Firestore
   - Inicia heartbeat cada 30 seg
6. Página actualiza a:
   "✅ Conectado - Esperando votación..."
7. [Jeremy termina presentación HP1]
8. jantonio lanza votación desde panel
9. Página de Juan actualiza automáticamente (Firestore onSnapshot):
   - 🔔 Sonido "ding"
   - Vibración (si móvil)
   - Formulario de votación aparece
10. Juan vota "✅ Aprobado" + comentario opcional
11. Click "Enviar voto"
12. Sistema guarda voto inmediatamente
13. Confirmación: "✅ Voto guardado"
14. Página muestra: "Esperando resultado... (5/6 votos)"
15. Cuando todos votan:
    - Resultado aparece: "✅ APROBADO"
16. Página vuelve a "Esperando siguiente votación..."
17. [Proceso se repite para cada presentación]
```

---

### 7.3. Flujo: Usuario Llega Tarde

```
1. Carlos se conecta a las 10:30
2. Ya votaron: Jeremy HP1 (10:20) y Jeremy HP2 (10:25)
3. Página muestra:

   📊 Votaciones finalizadas
   1. UX-1234 Login exitoso → ✅ Aprobado
   2. UX-1234 Error creds → 🔄 Requiere nuevo

   🔴 Votación en curso
   3. UX-1235 Dashboard (Luis)
      [No puedes votar - llegaste tarde]
      Votaron: 5/5

   ⏳ Próximas votaciones
   4. UX-1236 Onboarding (Cris)
      Podrás votar cuando inicie

4. Cuando Lance votación 4 → Carlos SÍ puede votar
```

---

### 7.4. Flujo: Reordenar Presentaciones (Urgente)

```
1. Panel muestra:
   1. Jeremy HP1
   2. Jeremy HP2
   3. Luis (urgente)
   4. Cris

2. jantonio arrastra "Luis" hacia arriba

3. Nuevo orden:
   1. Luis ⬆️
   2. Jeremy HP1
   3. Jeremy HP2
   4. Cris

4. Sistema guarda en Firestore (batch update de presentationOrder)

5. Próxima votación será de Luis
```

---

### 7.5. Flujo: Cerrar Sesión y Bloquear Agendas

```
1. Todas las votaciones completadas
2. jantonio click "Cerrar sesión"
3. Modal de resumen aparece:
   - Duración: 1h 15min
   - 4 presentaciones
   - 3 aprobadas, 1 requiere nuevo
4. jantonio click "Cerrar sesión ✓"
5. Sistema:
   - Actualiza live_sessions: status='closed', summary={...}
   - Actualiza cada critics_session con voteResult
6. En tiempo real:
   - Botones "Agendar hoy" → "Agendar mañana"
   - Modal CreateCriticsSession bloquea fecha actual
7. Asistentes ven mensaje en su pantalla:
   "Sesión finalizada - Gracias por participar"
```

---

## 8. CASOS EDGE Y VALIDACIONES

### 8.1. Usuario Cierra Link Accidentalmente

**Problema:** Juan cierra el navegador a las 10:15

**Solución:**
1. Heartbeat detecta inactividad (>1 minuto sin update)
2. Sistema marca `online: false`
3. Si hay votación activa a las 10:20:
   - Juan NO está en `eligibleVoters` (porque online=false)
4. Juan reabre link a las 10:22:
   - LocalStorage tiene su email guardado
   - Reconecta automáticamente
   - `online: true` nuevamente
5. Próxima votación (10:25) SÍ puede votar

---

### 8.2. Presentador Cancela Última Hora

**Problema:** Jeremy se enferma, no presentará

**Solución:**
1. Jeremy elimina su sesión desde calendario
2. Sistema actualiza `estado='eliminada'`
3. Panel de control (realtime query):
   - Filtra automáticamente sesiones eliminadas
   - Jeremy desaparece de lista
4. No se genera votación para esa presentación

---

### 8.3. Nueva Sesión Durante Meet

**Problema:** A las 10:30 añaden a Pedro con 1 HP

**Solución:**
1. Pedro crea sesión para hoy desde CreateCriticsSession
2. Panel de control (Firestore onSnapshot):
   - Detecta nueva sesión con date=hoy
   - Añade automáticamente a lista
   - Badge "🆕 añadido hace 1min"
3. jantonio puede reordenar posición si es necesario

---

### 8.4. Viernes → No Agendar para Lunes

**Problema:** Es viernes 17:00, sesión cerrada

**Solución:**
```javascript
getNextAvailableDate(true) // sessionClosed = true
// Día: Viernes (5)
// Retorna: { date: nextMonday, label: 'Agendar el lunes', labelShort: 'Lunes' }
```
Botones muestran: "📅 Lunes"

---

## 9. TESTING

### 9.1. Tests Unitarios

**Archivo:** `src/utils/__tests__/votingHelpers.test.js`

```javascript
import { getNextAvailableDate, generateSessionCode } from '../votingHelpers';

describe('getNextAvailableDate', () => {
  test('retorna hoy si sesión no está cerrada', () => {
    const result = getNextAvailableDate(false);
    expect(result.labelShort).toBe('Hoy');
  });

  test('retorna mañana si es lunes y sesión cerrada', () => {
    // Mock Date to Monday
    const result = getNextAvailableDate(true);
    // Assert based on mocked date
  });

  test('retorna el lunes si es viernes y sesión cerrada', () => {
    // Mock Date to Friday
    const result = getNextAvailableDate(true);
    expect(result.labelShort).toBe('Lunes');
  });
});

describe('generateSessionCode', () => {
  test('genera código con formato correcto', () => {
    const date = new Date('2026-02-05');
    const code = generateSessionCode(date);
    expect(code).toMatch(/05FEB[A-Z0-9]{3}/);
  });
});
```

---

### 9.2. Tests de Integración

**Escenarios críticos:**
1. ✅ Crear sesión → Conectar 6 usuarios → Lanzar votación → Todos votan → Verificar resultado
2. ✅ Reordenar presentaciones → Verificar orden en Firestore
3. ✅ Cerrar sesión → Verificar que critics_sessions se actualicen
4. ✅ Usuario llega tarde → Verificar que no puede votar en anteriores
5. ✅ Usuario se desconecta → Verificar que online=false

---

## 10. DEPLOYMENT

### 10.1. Pre-deployment Checklist

- [ ] Actualizar `firestore.rules` en Firebase Console
- [ ] Crear índices necesarios en Firestore
- [ ] Verificar que `VITE_FIREBASE_*` estén en Vercel
- [ ] Testing en ambiente local
- [ ] Testing con usuarios reales (equipo UX)

### 10.2. Índices de Firestore Necesarios

**Crear en Firebase Console → Firestore → Indexes:**

```
Collection: live_sessions
Fields: date (Ascending), status (Ascending)
```

```
Collection: critics_sessions
Fields: scheduledDate (Ascending), estado (Ascending), presentationOrder (Ascending)
```

---

## 11. MONITOREO Y MÉTRICAS

### 11.1. Métricas a Trackear

- Tiempo promedio de votación por HP
- Tasa de participación (% de votantes vs conectados)
- Número de sesiones de votación por día
- Tasa de aprobación vs requiere nuevo
- Errores de conexión/reconexión

### 11.2. Logs Importantes

```javascript
// En VotingService
console.log('[VotingService] Sesión creada:', sessionCode);
console.log('[VotingService] Usuario conectado:', userEmail);
console.log('[VotingService] Votación lanzada:', voteId);
console.log('[VotingService] Voto registrado:', userEmail, decision);
console.log('[VotingService] Sesión cerrada:', sessionCode);
```

---

## 12. DOCUMENTACIÓN ADICIONAL

### 12.1. Guía para Usuarios

**Crear:** `docs/VOTING_USER_GUIDE.md`

Contenido:
- Cómo conectarse a una sesión
- Cómo votar
- Qué hacer si pierdes conexión
- FAQs

### 12.2. Guía para Facilitador

**Crear:** `docs/VOTING_FACILITATOR_GUIDE.md`

Contenido:
- Cómo iniciar sesión de votaciones
- Cómo lanzar votaciones
- Cómo reordenar presentaciones
- Cómo cerrar sesión
- Troubleshooting

---

## 13. ROLLBACK PLAN

### En caso de problemas críticos:

1. **Desactivar feature flag** (si se implementa)
2. **Revertir deployment** en Vercel
3. **Restaurar Firestore rules** anteriores
4. **Comunicar al equipo** vía Slack

### Backup de Firestore Rules

```bash
# Antes del deployment
firebase firestore:rules:get > firestore.rules.backup
```

---

# ✅ CHECKLIST FINAL - SISTEMA DE VOTACIÓN DE DESIGN CRITICS

---

## **🎯 FUNCIONALIDADES CORE**

### **Sesión de Votación en Vivo**
- [ ] Generación de código único por sesión (formato: `05FEBA7X`)
- [ ] Link directo para votación (`dc-tracker.app/live/05FEBA7X`)
- [ ] Validación de unicidad de código en Firestore
- [ ] Expiración automática de sesión (8 horas)
- [ ] QR code alternativo para acceso móvil
- [ ] Una sesión por día (reutilizable para múltiples votaciones)

### **Panel de Control del Facilitador**
- [ ] Vista de usuarios conectados en tiempo real
- [ ] Lista de presentaciones pendientes del día
- [ ] **Drag & Drop** para reordenar presentaciones (librería: `@dnd-kit/core`)
- [ ] Botón "Lanzar votación" por cada presentación
- [ ] Vista de resultados en tiempo real durante votación
- [ ] Historial de votaciones completadas
- [ ] Botón "Cerrar sesión" con resumen final

### **Experiencia del Asistente**
- [ ] Abrir link una sola vez al inicio de la sesión
- [ ] Auto-reconexión con localStorage si cierra link
- [ ] Actualización automática cuando se lanza nueva votación
- [ ] Notificación sonora (ding) al lanzar votación
- [ ] Vibración en dispositivos móviles
- [ ] Interfaz mobile-friendly (responsive)
- [ ] Vista de historial de votaciones del día
- [ ] Confirmación visual inmediata al votar

---

## **🔐 AUTENTICACIÓN Y PERMISOS**

### **Sistema de Roles**
- [ ] Autenticación obligatoria con Firebase Auth (@prestamype.com)
- [ ] Usuario normal: crear/editar/eliminar sus propias sesiones
- [ ] **Facilitador (jantonio@prestamype.com):**
  - [ ] Crear sesiones de votación (`live_sessions`)
  - [ ] Reordenar presentaciones de cualquier usuario
  - [ ] Ver detalle completo de votaciones
  - [ ] Cerrar sesiones de votación
  - [ ] **También** puede crear/editar/eliminar sus propias sesiones (doble rol)
- [ ] Soporte para usuarios anónimos (demo/testing)

### **Firestore Security Rules**
- [ ] Función `isAuthenticated()`
- [ ] Función `isPrestamypeUser()`
- [ ] Función `isAnonymousUser()`
- [ ] Función `isOwner(resource)`
- [ ] Función `isFacilitator()`
- [ ] Reglas para `critics_sessions`
- [ ] Reglas para `live_sessions`
- [ ] Reglas para `user_settings`
- [ ] Reglas para `figma_cache`

---

## **🗳️ LÓGICA DE VOTACIÓN**

### **Elegibilidad de Votantes**
- [ ] Sistema registra timestamp de conexión de cada usuario
- [ ] Al lanzar votación, captura quién está conectado en ese momento
- [ ] Solo pueden votar quienes estaban conectados **antes** del lanzamiento
- [ ] Si usuario cierra link antes de votar → NO cuenta en votación
- [ ] Si usuario llega tarde → NO puede votar en votaciones anteriores
- [ ] Si usuario se reconecta → puede votar en votaciones futuras
- [ ] Campo `online: true/false` para rastrear conexión activa
- [ ] Heartbeat cada 30 segundos para actualizar `lastSeenAt`

### **Proceso de Votación**
- [ ] Votación por Happy Path individual (no agrupada)
- [ ] Inmediatamente después de cada presentación
- [ ] 2 opciones: ✅ Aprobado | 🔄 Requiere nuevo Critics
- [ ] Campo opcional de comentarios
- [ ] Guardado inmediato en Firestore (no batch)
- [ ] Actualización en tiempo real del contador "X/Y votos"
- [ ] Mostrar quién votó (sin mostrar QUÉ votaron) durante votación
- [ ] Resultado visible solo cuando todos hayan votado
- [ ] Facilitador puede cerrar votación anticipadamente

### **Privacidad y Resultados**
- [ ] Durante votación: solo mostrar nombres de quienes votaron
- [ ] Después de completar: mostrar resultado final (Aprobado/Requiere nuevo)
- [ ] **NO** mostrar porcentajes ni detalles de votos a usuarios normales
- [ ] Facilitador SÍ ve detalle completo (quién votó qué)
- [ ] Guardar data completa para reportes futuros
- [ ] Resultado almacenado en `critics_sessions.voteResult`

---

## **📊 GESTIÓN DE PRESENTACIONES**

### **Ordenamiento Dinámico**
- [ ] Campo `presentationOrder` en `critics_sessions`
- [ ] Drag & Drop con `@dnd-kit/core` y `@dnd-kit/sortable`
- [ ] Actualización inmediata en Firestore al reordenar
- [ ] Actualización visual en tiempo real para todos
- [ ] Función `updatePresentationOrder()` con batch write
- [ ] Soporte touch para móviles
- [ ] Visual feedback al arrastrar (opacity 0.5)

### **Cancelación/Eliminación**
- [ ] Reutilizar funcionalidad existente de eliminación
- [ ] Actualizar `estado='eliminada'` en Firestore
- [ ] Filtrar sesiones eliminadas automáticamente del panel
- [ ] Notificación visual "1 presentación cancelada hoy"

### **Mover a Siguiente Día**
- [ ] Opción "Mover a otra fecha" desde calendario
- [ ] Sesión movida se posiciona **primera** en el día destino
- [ ] Incrementar `presentationOrder` de sesiones existentes
- [ ] Actualizar `movidaDesde` y `movidaAt` en documento
- [ ] Desaparecer automáticamente de lista del día actual

### **Nueva Sesión Durante Sesión Activa**
- [ ] Firestore realtime query detecta nuevas sesiones del día
- [ ] Añadir automáticamente a cola de presentaciones
- [ ] Badge "🆕 añadido hace Xmin"
- [ ] Facilitador puede reordenar posición

---

## **🕐 LÓGICA DE CIERRE DE SESIÓN**

### **Detección de Sesión Cerrada**
- [ ] Hook `useTodaySessionStatus()`
- [ ] Query a `live_sessions` por fecha actual
- [ ] Detectar `status === 'closed'`
- [ ] Suscripción en tiempo real a cambios

### **Botones Dinámicos**
- [ ] **Antes del cierre:** "Agendar hoy"
- [ ] **Después del cierre (Lun-Jue):** "Agendar mañana"
- [ ] **Después del cierre (Viernes):** "Agendar el lunes"
- [ ] Función `getNextAvailableDate(sessionClosed)`
- [ ] Usar `date-fns` para cálculo de fechas
- [ ] Actualización automática de botones al cerrar sesión

### **Validación en Modal**
- [ ] Función `validateScheduleDate()`
- [ ] Bloquear fecha actual si sesión está cerrada
- [ ] Input `min={nextDate}` en selector de fecha
- [ ] Mensaje de advertencia si intenta agendar para hoy
- [ ] Toast error si ignora validación

### **Resumen Final**
- [ ] Modal con estadísticas de la sesión
- [ ] Lista de resultados (sin porcentajes)
- [ ] Duración, presentadores, asistentes
- [ ] Conteo: Aprobados vs Requiere nuevo
- [ ] Advertencia: "A partir de ahora se agenda para mañana"
- [ ] Botón "Descargar PDF" (opcional)
- [ ] Actualizar `live_sessions` con summary
- [ ] Actualizar cada `critics_session` con `voteResult`

---

## **💾 SCHEMA DE FIRESTORE**

### **Collection: live_sessions**
- [ ] `code` (string): "05FEBA7X"
- [ ] `date` (string): "2026-02-05"
- [ ] `createdAt` (Timestamp)
- [ ] `expiresAt` (Timestamp)
- [ ] `status` (string): active | closed | expired
- [ ] `facilitator` (string): email del facilitador
- [ ] `connectedUsers` (array):
  - [ ] `email` (string)
  - [ ] `name` (string)
  - [ ] `connectedAt` (Timestamp)
  - [ ] `lastSeenAt` (Timestamp)
  - [ ] `online` (boolean)
  - [ ] `disconnectedAt` (Timestamp | null)
- [ ] `votes` (array):
  - [ ] `voteId` (string)
  - [ ] `sessionId` (string): ref a critics_sessions
  - [ ] `ticket` (string)
  - [ ] `happyPath` (string)
  - [ ] `presenter` (string): email
  - [ ] `presenterName` (string)
  - [ ] `presentationOrder` (number)
  - [ ] `status` (string): pending | active | completed | skipped
  - [ ] `launchedAt` (Timestamp | null)
  - [ ] `completedAt` (Timestamp | null)
  - [ ] `eligibleVoters` (array): emails
  - [ ] `expectedVotes` (number)
  - [ ] `votes` (array):
    - [ ] `email` (string)
    - [ ] `name` (string)
    - [ ] `decision` (string): approved | needs_critic
    - [ ] `comment` (string)
    - [ ] `votedAt` (Timestamp)
  - [ ] `result` (object):
    - [ ] `decision` (string): approved | needs_critic
    - [ ] `approvedCount` (number)
    - [ ] `needsCriticCount` (number)
    - [ ] `totalVotes` (number)
    - [ ] `completedAt` (Timestamp)
    - [ ] `approvedBy` (array): emails
    - [ ] `needsCriticBy` (array): emails
- [ ] `summary` (object):
  - [ ] `totalPresentations` (number)
  - [ ] `totalApproved` (number)
  - [ ] `totalNeedsCritic` (number)
  - [ ] `duration` (number): segundos
  - [ ] `closedAt` (Timestamp)
  - [ ] `closedBy` (string): email

### **Collection: critics_sessions (actualizado)**
- [ ] `presentationOrder` (number): orden en el día
- [ ] `movidaDesde` (string | null): fecha original
- [ ] `movidaAt` (Timestamp | null)
- [ ] `voteResult` (object):
  - [ ] `voted` (boolean)
  - [ ] `votedAt` (Timestamp)
  - [ ] `liveSessionCode` (string)
  - [ ] `result` (string): approved | needs_critic
  - [ ] `totalVotes` (number)
  - [ ] `details` (object):
    - [ ] `approvedCount` (number)
    - [ ] `needsCriticCount` (number)
    - [ ] `votes` (array): data completa para reportes
  - [ ] `requiresNewCritic` (boolean)
  - [ ] `newCriticScheduled` (boolean)
  - [ ] `newCriticSessionId` (string | null)

---

## **🎨 UI/UX COMPONENTS**

### **Panel de Control del Facilitador**
- [ ] Header con contador de conectados
- [ ] Lista drag & drop de presentaciones
- [ ] Card por presentación con botón "Lanzar votación"
- [ ] Vista de resultados en tiempo real
- [ ] Sección "Historial completadas"
- [ ] Botón "Cerrar sesión"

### **Página de Votación (Asistentes)**
- [ ] Formulario de conexión (email autocomplete)
- [ ] Estado "Esperando votación..."
- [ ] Formulario de votación con 2 botones grandes
- [ ] Campo opcional de comentarios
- [ ] Confirmación visual "Voto guardado"
- [ ] Vista de resultado cuando todos votan
- [ ] Historial scroll de votaciones anteriores

### **Dashboard/Calendario (Actualizado)**
- [ ] Botones dinámicos: "Hoy" / "Mañana" / "Lunes"
- [ ] Card de ticket con resultados de votación
- [ ] Badge "✅ Aprobado" o "🔄 Requiere nuevo"
- [ ] Fecha y hora de evaluación
- [ ] Botón "Ver detalle" (solo facilitador)
- [ ] Botón "Agendar" para nuevo critics si requiere

### **Modal Resumen Final**
- [ ] Título con fecha
- [ ] Estadísticas (duración, presentadores, asistentes)
- [ ] Lista de resultados sin porcentajes
- [ ] Colores: Verde (aprobado), Ámbar (requiere nuevo)
- [ ] Advertencia sobre próximas agendas
- [ ] Botones: Descargar PDF, Cerrar

---

## **⚡ FUNCIONALIDADES TÉCNICAS**

### **Realtime Updates**
- [ ] `onSnapshot` para `live_sessions`
- [ ] `onSnapshot` para lista de presentaciones del día
- [ ] Actualización automática de UI sin refresh
- [ ] Heartbeat de usuarios cada 30 seg

### **Notificaciones**
- [ ] Sonido "ding" al lanzar votación
- [ ] Vibración en móviles (`navigator.vibrate`)
- [ ] Toast notifications con `sonner`
- [ ] Badge visual en botones

### **Validaciones**
- [ ] Email debe ser @prestamype.com
- [ ] Código de sesión debe existir y estar activo
- [ ] Fecha de agenda no puede ser anterior a mínima permitida
- [ ] Usuario debe estar elegible para votar
- [ ] No votar dos veces en misma votación

### **Generación de Códigos**
- [ ] Formato: DIA + MES + HASH (ej: 05FEBA7X)
- [ ] Caracteres sin confusión (sin 0, O, I, 1)
- [ ] Validación de unicidad en Firestore
- [ ] Máximo 5 intentos antes de fallback con timestamp

### **Manejo de Errores**
- [ ] Link expirado → mensaje claro
- [ ] Sesión cerrada → redirección
- [ ] Usuario no elegible → explicación
- [ ] Error de conexión → reintento automático

---

## **📱 RESPONSIVE & ACCESIBILIDAD**

- [ ] Mobile-first design
- [ ] Touch-friendly (botones >44px)
- [ ] Drag & drop funciona en touch
- [ ] Orientación portrait/landscape
- [ ] Accesibilidad ARIA labels
- [ ] Focus management en modales
- [ ] Teclado navigation support

---

## **🧪 TESTING & QA**

### **Casos Edge**
- [ ] Usuario llega tarde a mitad de reunión
- [ ] Usuario se desconecta y reconecta
- [ ] Presentador cancela última hora
- [ ] Nueva sesión se añade durante meet
- [ ] Usuario cierra link accidentalmente
- [ ] Sesión se mueve a siguiente día
- [ ] Viernes → Lunes (salto de fin de semana)
- [ ] Múltiples usuarios reordenan simultáneamente
- [ ] Facilitador cierra sesión antes de que todos voten

### **Validaciones de Negocio**
- [ ] No agendar para hoy si sesión cerrada
- [ ] Máximo 1 voto por usuario por votación
- [ ] Solo votantes elegibles pueden votar
- [ ] Resultados solo visibles al completar
- [ ] Sesión movida es primera en nuevo día

---

## **📦 DEPENDENCIAS NPM**

- [ ] `@dnd-kit/core` - Drag & drop
- [ ] `@dnd-kit/sortable` - Sortable lists
- [ ] `date-fns` - Manejo de fechas (ya instalado)
- [ ] `sonner` - Toast notifications (ya instalado)
- [ ] `react-hook-form` - Forms (ya instalado)
- [ ] `zod` - Validation (ya instalado)
- [ ] `lucide-react` - Icons (ya instalado)

---

## **🚀 DEPLOYMENT**

- [ ] Actualizar Firestore Rules en consola Firebase
- [ ] Crear índices necesarios en Firestore
- [ ] Variables de entorno en Vercel
- [ ] Testing en ambiente staging
- [ ] Deploy a producción
- [ ] Monitoreo de errores (Sentry opcional)

---

## **📊 REPORTES FUTUROS (Preparación)**

- [ ] Data completa guardada en `voteResult.details.votes`
- [ ] Timestamp de cada voto
- [ ] Comentarios de votantes
- [ ] Trazabilidad de movimientos de sesiones
- [ ] Historial de sesiones cerradas
- [ ] Estructura lista para generar:
  - [ ] Reporte de aprobación por presentador
  - [ ] Reporte de tiempo promedio de votación
  - [ ] Reporte de participación por usuario
  - [ ] Reporte de happy paths más rechazados

---

## **✅ CRITERIOS DE ACEPTACIÓN FINAL**

- [ ] Facilitador puede crear sesión de votación en <1 minuto
- [ ] Asistentes se conectan con 1 click (link + email)
- [ ] Votación completa toma <2 minutos por HP
- [ ] Resultados se muestran inmediatamente
- [ ] Sistema funciona con 2-10 asistentes
- [ ] Maneja 1-8 presentaciones por sesión
- [ ] Mobile funciona igual que desktop
- [ ] No hay votos duplicados
- [ ] No se pierde ningún voto
- [ ] Sesión cerrada bloquea agendas para hoy
- [ ] jantonio puede facilitar Y presentar
- [ ] Zero downtime en producción

---

**Total de items:** ~200 checkpoints
**Tiempo estimado de desarrollo:** 2-3 semanas
**Complejidad:** Media-Alta

---

## 📝 NOTAS FINALES

### Prioridades de Implementación

**Fase 1 (Semana 1):**
1. Schema de Firestore y rules
2. Generación de códigos y sesiones
3. Panel de control básico (sin drag & drop)
4. Página de votación básica

**Fase 2 (Semana 2):**
1. Drag & drop de presentaciones
2. Lógica de elegibilidad de votantes
3. Heartbeat y reconexión
4. Notificaciones sonoras/visuales

**Fase 3 (Semana 3):**
1. Lógica de cierre de sesión
2. Botones dinámicos (hoy/mañana/lunes)
3. Resumen final
4. Testing completo y ajustes

### Recursos Adicionales

- [Documentación @dnd-kit](https://docs.dndkit.com/)
- [date-fns Documentation](https://date-fns.org/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-query)

### Contacto y Soporte

Para preguntas o soporte durante la implementación:
- **Slack:** #design-critics-dev
- **Email:** jantonio@prestamype.com

---

**Documento creado:** 5 de Febrero 2026
**Última actualización:** 5 de Febrero 2026
**Versión:** 1.0.0
