import { useState, useEffect } from 'react';
import { VotingService } from '../services/voting';

/**
 * Hook que detecta si la sesión de votaciones de hoy está cerrada.
 * Escucha cambios en tiempo real para actualizar los botones de agendamiento.
 *
 * @returns {{ exists: boolean, closed: boolean, closedAt: object|null, session: object|null }}
 */
export function useTodaySessionStatus() {
    const [status, setStatus] = useState({
        exists: false,
        closed: false,
        closedAt: null,
        session: null
    });

    useEffect(() => {
        const unsubscribe = VotingService.subscribeToTodaySession((session) => {
            if (!session) {
                setStatus({ exists: false, closed: false, closedAt: null, session: null });
            } else {
                setStatus({
                    exists: true,
                    closed: session.status === 'closed',
                    closedAt: session.summary?.closedAt || null,
                    session
                });
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    return status;
}
