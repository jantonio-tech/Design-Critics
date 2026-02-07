import firebase from '../utils/firebase';
import { createUniqueSessionCode, getPeruDateStr } from '../utils/votingHelpers';

const db = firebase.firestore();
const COLLECTION = 'live_sessions';
const CRITICS_COLLECTION = 'critics_sessions';

export class VotingService {

    // ========== SESIONES DE VOTACIÓN ==========

    /**
     * Crear sesión de votación en vivo
     * @returns {string} código de sesión
     */
    static async createLiveSession(date, facilitatorEmail) {
        const dateStr = typeof date === 'string' ? date : getPeruDateStr(date);
        const code = await createUniqueSessionCode(new Date(dateStr));

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 8);

        const sessionData = {
            code,
            date: dateStr,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            status: 'active',
            facilitator: facilitatorEmail,
            connectedUsers: [],
            votes: [],
            summary: null
        };

        await db.collection(COLLECTION).doc(code).set(sessionData);

        return code;
    }

    /**
     * Obtener sesión activa de hoy (si existe)
     */
    static async getTodayActiveSession() {
        const todayStr = getPeruDateStr();

        const snapshot = await db.collection(COLLECTION)
            .where('date', '==', todayStr)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    /**
     * Suscribirse a cambios de la sesión en tiempo real
     */
    static subscribeToSession(sessionCode, callback) {
        return db.collection(COLLECTION).doc(sessionCode)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                } else {
                    callback(null);
                }
            });
    }

    /**
     * Suscribirse a la sesión activa de hoy
     */
    static subscribeToTodaySession(callback) {
        const todayStr = getPeruDateStr();

        return db.collection(COLLECTION)
            .where('date', '==', todayStr)
            .limit(1)
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    callback(null);
                } else {
                    const doc = snapshot.docs[0];
                    callback({ id: doc.id, ...doc.data() });
                }
            });
    }

    // ========== CONEXIÓN DE USUARIOS ==========

    /**
     * Conectar usuario a sesión de votación
     */
    static async connectUser(sessionCode, userEmail, userName) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            throw new Error('Sesión no encontrada');
        }

        const session = sessionDoc.data();

        if (session.status !== 'active') {
            throw new Error('La sesión ya no está activa');
        }

        const users = session.connectedUsers || [];
        const existingIndex = users.findIndex(u => u.email === userEmail);

        if (existingIndex >= 0) {
            // Reconexión
            users[existingIndex] = {
                ...users[existingIndex],
                online: true,
                lastSeenAt: new Date(),
                disconnectedAt: null
            };
        } else {
            // Nueva conexión
            users.push({
                email: userEmail,
                name: userName,
                connectedAt: new Date(),
                lastSeenAt: new Date(),
                online: true,
                disconnectedAt: null
            });
        }

        await sessionRef.update({ connectedUsers: users });
    }

    /**
     * Desconectar usuario
     */
    static async disconnectUser(sessionCode, userEmail) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) return;

        const users = sessionDoc.data().connectedUsers || [];
        const updatedUsers = users.map(u =>
            u.email === userEmail
                ? { ...u, online: false, disconnectedAt: new Date() }
                : u
        );

        await sessionRef.update({ connectedUsers: updatedUsers });
    }

    /**
     * Actualizar heartbeat del usuario
     */
    static async updateHeartbeat(sessionCode, userEmail) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) return;

        const users = sessionDoc.data().connectedUsers || [];
        const updatedUsers = users.map(u =>
            u.email === userEmail
                ? { ...u, lastSeenAt: new Date(), online: true }
                : u
        );

        await sessionRef.update({ connectedUsers: updatedUsers });
    }

    // ========== VOTACIONES ==========

    /**
     * Lanzar votación para un critics_session específico
     */
    static async launchVote(sessionCode, criticsSession) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            throw new Error('Sesión no encontrada');
        }

        const session = sessionDoc.data();
        const onlineUsers = (session.connectedUsers || []).filter(u => u.online === true);

        if (onlineUsers.length === 0) {
            throw new Error('No hay usuarios conectados para votar');
        }

        const eligibleVoters = onlineUsers.map(u => u.email);

        const newVote = {
            voteId: `vote-${Date.now()}`,
            sessionId: criticsSession.id,
            ticket: criticsSession.ticket,
            happyPath: criticsSession.flow || criticsSession.flujo || 'Sin título',
            presenter: criticsSession.presentador_email || criticsSession.createdBy,
            presenterName: criticsSession.presentador || criticsSession.presenter || 'Usuario',
            presentationOrder: criticsSession.presentationOrder || 0,
            status: 'active',
            launchedAt: new Date(),
            completedAt: null,
            eligibleVoters,
            expectedVotes: eligibleVoters.length,
            votes: [],
            result: null
        };

        const votes = session.votes || [];
        votes.push(newVote);

        await sessionRef.update({ votes });

        return newVote.voteId;
    }

    /**
     * Registrar voto de un usuario
     */
    static async submitVote(sessionCode, voteId, userEmail, userName, decision, comment = '') {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
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

        // Validar decisión
        if (decision !== 'approved' && decision !== 'needs_critic') {
            throw new Error('Decisión inválida');
        }

        // Añadir voto
        vote.votes.push({
            email: userEmail,
            name: userName,
            decision,
            comment,
            votedAt: new Date()
        });

        // Verificar si se completó
        if (vote.votes.length >= vote.expectedVotes) {
            const approvedCount = vote.votes.filter(v => v.decision === 'approved').length;
            const needsCriticCount = vote.votes.filter(v => v.decision === 'needs_critic').length;

            vote.status = 'completed';
            vote.completedAt = new Date();
            vote.result = {
                decision: approvedCount > needsCriticCount ? 'approved' : 'needs_critic',
                approvedCount,
                needsCriticCount,
                totalVotes: vote.votes.length,
                completedAt: new Date(),
                approvedBy: vote.votes.filter(v => v.decision === 'approved').map(v => v.email),
                needsCriticBy: vote.votes.filter(v => v.decision === 'needs_critic').map(v => v.email)
            };
        }

        votes[voteIndex] = vote;
        await sessionRef.update({ votes });

        return vote.status === 'completed' ? vote.result : null;
    }

    /**
     * Cerrar votación anticipadamente (facilitador)
     */
    static async closeVoteEarly(sessionCode, voteId) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) return;

        const session = sessionDoc.data();
        const votes = session.votes || [];
        const voteIndex = votes.findIndex(v => v.voteId === voteId);

        if (voteIndex === -1) return;

        const vote = votes[voteIndex];

        if (vote.votes.length === 0) {
            vote.status = 'skipped';
        } else {
            const approvedCount = vote.votes.filter(v => v.decision === 'approved').length;
            const needsCriticCount = vote.votes.filter(v => v.decision === 'needs_critic').length;

            vote.status = 'completed';
            vote.completedAt = new Date();
            vote.result = {
                decision: approvedCount > needsCriticCount ? 'approved' : 'needs_critic',
                approvedCount,
                needsCriticCount,
                totalVotes: vote.votes.length,
                completedAt: new Date(),
                approvedBy: vote.votes.filter(v => v.decision === 'approved').map(v => v.email),
                needsCriticBy: vote.votes.filter(v => v.decision === 'needs_critic').map(v => v.email)
            };
        }

        votes[voteIndex] = vote;
        await sessionRef.update({ votes });
    }

    // ========== CIERRE DE SESIÓN ==========

    /**
     * Cerrar sesión de votación y guardar resultados en critics_sessions
     */
    static async closeLiveSession(sessionCode, facilitatorEmail) {
        const sessionRef = db.collection(COLLECTION).doc(sessionCode);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            throw new Error('Sesión no encontrada');
        }

        const session = sessionDoc.data();
        const votes = session.votes || [];

        const completedVotes = votes.filter(v => v.status === 'completed' && v.result);
        const totalApproved = completedVotes.filter(v => v.result.decision === 'approved').length;
        const totalNeedsCritic = completedVotes.filter(v => v.result.decision === 'needs_critic').length;

        const startTime = session.createdAt ? session.createdAt.toDate() : new Date();
        const duration = Math.round((new Date() - startTime) / 1000);

        // Actualizar sesión
        await sessionRef.update({
            status: 'closed',
            summary: {
                totalPresentations: completedVotes.length,
                totalApproved,
                totalNeedsCritic,
                duration,
                closedAt: firebase.firestore.FieldValue.serverTimestamp(),
                closedBy: facilitatorEmail
            }
        });

        // Actualizar cada critics_session con resultado
        const batch = db.batch();

        for (const vote of completedVotes) {
            if (vote.sessionId) {
                const criticRef = db.collection(CRITICS_COLLECTION).doc(vote.sessionId);
                batch.update(criticRef, {
                    voteResult: {
                        voted: true,
                        votedAt: vote.result.completedAt || firebase.firestore.FieldValue.serverTimestamp(),
                        liveSessionCode: sessionCode,
                        result: vote.result.decision,
                        totalVotes: vote.result.totalVotes,
                        details: {
                            approvedCount: vote.result.approvedCount,
                            needsCriticCount: vote.result.needsCriticCount,
                            votes: vote.votes
                        },
                        requiresNewCritic: vote.result.decision === 'needs_critic',
                        newCriticScheduled: false,
                        newCriticSessionId: null
                    }
                });
            }
        }

        await batch.commit();

        return {
            totalPresentations: completedVotes.length,
            totalApproved,
            totalNeedsCritic,
            duration,
            votes: completedVotes
        };
    }

    // ========== PRESENTACIONES DEL DÍA ==========

    /**
     * Obtener presentaciones del día (para el panel de control)
     */
    static async getTodayPresentations() {
        const todayStr = getPeruDateStr();

        const snapshot = await db.collection(CRITICS_COLLECTION)
            .where('fecha_dc', '==', todayStr)
            .where('estado', '==', 'activo')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Normalizar campos
            ticket: doc.data().ticket,
            flow: doc.data().flujo,
            presenter: doc.data().presentador,
            presenterEmail: doc.data().presentador_email,
            product: doc.data().producto,
            type: doc.data().tipo,
            presentationOrder: doc.data().presentationOrder || 999
        })).sort((a, b) => a.presentationOrder - b.presentationOrder);
    }

    /**
     * Suscribirse a presentaciones del día (realtime)
     */
    static subscribeTodayPresentations(callback) {
        const todayStr = getPeruDateStr();

        return db.collection(CRITICS_COLLECTION)
            .where('fecha_dc', '==', todayStr)
            .where('estado', '==', 'activo')
            .onSnapshot((snapshot) => {
                const presentations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    ticket: doc.data().ticket,
                    flow: doc.data().flujo,
                    presenter: doc.data().presentador,
                    presenterEmail: doc.data().presentador_email,
                    product: doc.data().producto,
                    type: doc.data().tipo,
                    presentationOrder: doc.data().presentationOrder || 999
                })).sort((a, b) => a.presentationOrder - b.presentationOrder);

                callback(presentations);
            });
    }

    /**
     * Actualizar orden de presentaciones (batch)
     */
    static async reorderPresentations(orderedPresentations) {
        const batch = db.batch();

        orderedPresentations.forEach((p, index) => {
            const ref = db.collection(CRITICS_COLLECTION).doc(p.id);
            batch.update(ref, {
                presentationOrder: index + 1
            });
        });

        await batch.commit();
    }

    /**
     * Mover presentación a siguiente día (primera posición)
     */
    static async movePresentationToNextDay(sessionId, newDate) {
        const todayStr = getPeruDateStr();

        // Obtener sesiones del día destino
        const nextDaySnapshot = await db.collection(CRITICS_COLLECTION)
            .where('fecha_dc', '==', newDate)
            .where('estado', '==', 'activo')
            .get();

        const batch = db.batch();

        // Incrementar orden de las existentes en el día destino
        nextDaySnapshot.docs.forEach(doc => {
            const currentOrder = doc.data().presentationOrder || 999;
            batch.update(doc.ref, { presentationOrder: currentOrder + 1 });
        });

        // Mover la sesión: primera posición
        const sessionRef = db.collection(CRITICS_COLLECTION).doc(sessionId);
        batch.update(sessionRef, {
            fecha_dc: newDate,
            presentationOrder: 1,
            movidaDesde: todayStr,
            movidaAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
    }
}
