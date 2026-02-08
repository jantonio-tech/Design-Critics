import firebase from '../utils/firebase';

export const AuthStorage = {
    saveSession(user) {
        try {
            const sessionData = {
                name: user.name,
                email: user.email,
                picture: user.picture,
                initials: user.initials,
                accessToken: user.accessToken,
                timestamp: Date.now()
            };
            localStorage.setItem('dc_session', JSON.stringify(sessionData));
        } catch (e) {
            console.error('Error saving session:', e);
        }
    },

    getSession() {
        try {
            const sessionStr = localStorage.getItem('dc_session');
            if (!sessionStr) return null;
            const session = JSON.parse(sessionStr);
            // Optional: Expiration check (e.g. 24h)
            // if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) return null;
            return session;
        } catch (e) {
            return null;
        }
    },

    clearSession() {
        localStorage.removeItem('dc_session');
    },

    setUserConsent(email) {
        localStorage.setItem('dc_consent_' + email, 'true');
    },

    hasUserConsent(email) {
        return localStorage.getItem('dc_consent_' + email) === 'true';
    },

    setLastUserEmail(email) {
        localStorage.setItem('dc_last_email', email);
    },

    getLastUserEmail() {
        return localStorage.getItem('dc_last_email');
    }
};

export class FirestoreDataService {
    constructor(userEmail) {
        this.userEmail = userEmail;
        this.db = firebase.firestore();
        this.collection = 'critics_sessions';
    }

    async init() {
        // Optional: Ensure collection setup or stats validation
    }

    async readAll() {
        try {
            // "Active" items (not deleted)
            // If historical architecture: 'estado' == 'activo'
            const snapshot = await this.db.collection(this.collection)
                .where('estado', '==', 'activo')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                timestamp: doc.data().created_at, // object
                date: doc.data().fecha_dc,
                presenter: doc.data().presentador,
                product: doc.data().producto,
                ticket: doc.data().ticket,
                flow: doc.data().flujo,
                type: doc.data().tipo,
                descartaDate: doc.data().descarta_fecha || '',
                notes: doc.data().notas || '',
                status: doc.data().estado,
                createdBy: doc.data().presentador_email
            })).sort((a, b) => {
                // Sort by Created At (Ascending)
                const timeA = a.timestamp && a.timestamp.seconds ? a.timestamp.seconds : 0;
                const timeB = b.timestamp && b.timestamp.seconds ? b.timestamp.seconds : 0;
                return timeA - timeB;
            });
        } catch (error) {
            console.error('Error reading all DCs:', error);
            throw new Error('Error al cargar datos');
        }
    }

    async readUserHistory() {
        try {
            // Get ALL items created by user (including discarded) for history
            const snapshot = await this.db.collection(this.collection)
                .where('presentador_email', '==', this.userEmail)
                .orderBy('fecha_dc', 'desc')
                .get();

            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    timestamp: doc.data().created_at,
                    date: doc.data().fecha_dc,
                    presenter: doc.data().presentador,
                    product: doc.data().producto,
                    ticket: doc.data().ticket,
                    flow: doc.data().flujo,
                    type: doc.data().tipo,
                    descartaDate: doc.data().descarta_fecha || '',
                    notes: doc.data().notas || '',
                    status: doc.data().estado,
                    createdBy: doc.data().presentador_email
                }))
                .filter(item => item.status !== 'eliminado');
        } catch (error) {
            console.error('Error reading user history:', error);
            // Don't block
            return [];
        }
    }

    async create(dcData) {
        try {
            const newDoc = {
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                fecha_dc: dcData.date,
                presentador: dcData.presenter,
                presentador_email: dcData.createdBy,
                producto: dcData.product,
                ticket: dcData.ticket,
                flujo: dcData.flow,
                tipo: dcData.type,
                descarta_fecha: dcData.descartaDate || '',
                notas: dcData.notes || '',
                estado: 'activo'
            };

            const docRef = await this.db.collection(this.collection).add(newDoc);

            // Si es tipo Nuevo scope (o legacy Cambio de alcance), marcar TODOS los DCs anteriores de este ticket como descartados
            // (excluyendo el recién creado)
            if (dcData.type === 'Nuevo scope' || dcData.type === 'Cambio de alcance' || dcData.type === 'Nuevo alcance') {
                await this.archiveAllPrevious(dcData.ticket, dcData.flow, docRef.id);
            }

            // Retornar en formato esperado
            return {
                ...dcData,
                id: docRef.id,
                timestamp: new Date().toISOString(),
                status: 'activo' // CRITICAL: Required for checking active status in UI immediately
            };
        } catch (error) {
            console.error('Error creating DC:', error);
            throw new Error('Error al guardar en Firestore');
        }
    }

    async update(dcData) {
        try {
            // Logic for "Reemplazo" or simple update?
            // "Si se edita y cambia el tipo a 'Nuevo scope', ¿se archivan los anteriores?" -> Yes, theoretically.
            // But simple update usually just changes fields of THIS doc.

            const updateFields = {
                fecha_dc: dcData.date,
                producto: dcData.product,
                ticket: dcData.ticket,
                flujo: dcData.flow,
                tipo: dcData.type,
                notas: dcData.notes || ''
            };

            await this.db.collection(this.collection).doc(dcData.id).update(updateFields);

            if (dcData.type === 'Nuevo scope' || dcData.type === 'Cambio de alcance' || dcData.type === 'Nuevo alcance') {
                await this.archiveAllPrevious(dcData.ticket, dcData.flow, dcData.id);
            }

            return { ...dcData };
        } catch (error) {
            console.error('Error updating DC:', error);
            throw new Error('Error al actualizar');
        }
    }

    async delete(dcId) {
        try {
            // Soft delete
            await this.db.collection(this.collection).doc(dcId).update({
                estado: 'eliminado',
                deleted_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error deleting DC:', error);
            throw new Error('Error al eliminar');
        }
    }

    async archiveAllPrevious(ticket, flow, currentId) {
        try {
            console.log(`🧹 Archiving previous active critics for ticket ${ticket} and flow ${flow}...`);
            const snapshot = await this.db.collection(this.collection)
                .where('ticket', '==', ticket)
                .where('estado', '==', 'activo')
                .get();

            const batch = this.db.batch();
            let count = 0;

            snapshot.docs.forEach(doc => {
                const docFlow = doc.data().flujo;
                if (doc.id !== currentId && docFlow === flow) {
                    batch.update(doc.ref, { estado: 'descartado' });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                console.log(`✨ Archived ${count} previous items.`);
            }
        } catch (e) {
            console.error("Error archiving previous:", e);
        }
    }

    /**
     * Suscripción en tiempo real a todas las sesiones activas.
     * Reemplaza readAll() con actualizaciones automáticas.
     * @param {function} onData - Recibe array completo de sesiones cada vez que hay cambios
     * @returns {function} unsubscribe
     */
    subscribeAll(onData) {
        return this.db.collection(this.collection)
            .where('estado', '==', 'activo')
            .limit(200)
            .onSnapshot(snapshot => {
                const sessions = snapshot.docs.map(doc => this._mapDoc(doc))
                    .sort((a, b) => {
                        const timeA = a.timestamp && a.timestamp.seconds ? a.timestamp.seconds : 0;
                        const timeB = b.timestamp && b.timestamp.seconds ? b.timestamp.seconds : 0;
                        return timeA - timeB;
                    });
                onData(sessions);
            }, error => {
                console.error('Error en subscribeAll:', error);
            });
    }

    /**
     * Suscripción en tiempo real al historial del usuario (incluye descartados, excluye eliminados).
     * Reemplaza readUserHistory() con actualizaciones automáticas.
     * @param {function} onData - Recibe array de sesiones del usuario
     * @returns {function} unsubscribe
     */
    subscribeUserHistory(onData) {
        return this.db.collection(this.collection)
            .where('presentador_email', '==', this.userEmail)
            .orderBy('fecha_dc', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                const sessions = snapshot.docs
                    .map(doc => this._mapDoc(doc))
                    .filter(item => item.status !== 'eliminado');
                onData(sessions);
            }, error => {
                console.error('Error en subscribeUserHistory:', error);
            });
    }

    /** Mapea un doc de Firestore al formato UI */
    _mapDoc(doc) {
        const data = doc.data();
        return {
            id: doc.id,
            timestamp: data.created_at,
            date: data.fecha_dc,
            presenter: data.presentador,
            product: data.producto,
            ticket: data.ticket,
            flow: data.flujo,
            type: data.tipo,
            descartaDate: data.descarta_fecha || '',
            notes: data.notas || '',
            status: data.estado,
            createdBy: data.presentador_email,
            voteResult: data.voteResult || null,
            presentationOrder: data.presentationOrder || null
        };
    }

    // Legacy realtime capabilities
    subscribeToChanges(callback) {
        // Basic implementation for Firestore
        // Note: Firestore onSnapshot returns ALL data or changes depending on query
        // Implementing a global listener might be expensive.
        // The original code used dataService.subscribeToChanges which seemed to imply
        // a custom event emitter or Supabase-like logic in the original prompt?
        // Wait, the original index.html had `Realtime subscription` in `CalendarPage` and `HistoryPage`.
        // BUT `FirestoreDataService` in `index.html` (which I read earlier) did NOT show `subscribeToChanges`.
        // Let me check my memory/logs.
        // Actually, looking at `index.html:2723`, `dataService.subscribeToChanges` IS called.
        // I need to implement it.
        // The original implementation was likely using `onSnapshot`.

        // Since I'm migrating, I'll implement a clean `onSnapshot` listener.
        // However, `readAll` gets specific docs. A global listener for ALL changes to collection?
        // That's heavy.

        // Let's implement a filtered listener to active items?
        // The UI updates local state based on these events.

        return this.db.collection(this.collection)
            .where('estado', '==', 'activo')
            // LIMIT? ordered by created_at?
            .orderBy('created_at', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    // Translate to "eventType" expected by components
                    // 'added', 'modified', 'removed' maps to 'INSERT', 'UPDATE', 'DELETE'
                    let eventType = 'INSERT';
                    if (change.type === 'modified') eventType = 'UPDATE';
                    if (change.type === 'removed') eventType = 'DELETE';

                    const data = change.doc.data();
                    const payload = {
                        eventType,
                        new: { ...data, id: change.doc.id },
                        old: { id: change.doc.id } // mock
                    };
                    callback(payload);
                });
            });
    }

    unsubscribe(unsubscribeFunc) {
        if (typeof unsubscribeFunc === 'function') {
            unsubscribeFunc();
        }
    }
}
