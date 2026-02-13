import { useState, useEffect } from 'react';
import { VotingService } from '../services/voting';

/**
 * Hook que detecta el estado de la sesión de votaciones de hoy.
 * Escucha cambios en tiempo real para actualizar la UI.
 *
 * Estados posibles de la sesión:
 * - null: No existe sesión para hoy
 * - 'waiting': Sala abierta, esperando que se inicie una votación
 * - 'voting': Votación en curso
 * - 'closed': Sesión cerrada con resultados
 * - 'cancelled': Sesión cancelada
 *
 * @returns {{
 *   exists: boolean,
 *   waiting: boolean,
 *   voting: boolean,
 *   closed: boolean,
 *   cancelled: boolean,
 *   closedAt: object|null,
 *   session: object|null,
 *   sessionCode: string|null,
 *   currentVotingCriticId: string|null
 * }}
 */
export function useTodaySessionStatus() {
    const [status, setStatus] = useState({
        exists: false,
        waiting: false,
        voting: false,
        closed: false,
        cancelled: false,
        closedAt: null,
        session: null,
        sessionCode: null,
        currentVotingCriticId: null
    });

    useEffect(() => {
        const unsubscribe = VotingService.subscribeToTodaySession((session) => {
            if (!session) {
                setStatus({
                    exists: false,
                    waiting: false,
                    voting: false,
                    closed: false,
                    cancelled: false,
                    closedAt: null,
                    session: null,
                    sessionCode: null,
                    currentVotingCriticId: null
                });
            } else {
                setStatus({
                    exists: true,
                    waiting: session.status === 'waiting',
                    voting: session.status === 'voting',
                    closed: session.status === 'closed',
                    cancelled: session.status === 'cancelled',
                    closedAt: session.summary?.closedAt || null,
                    session,
                    sessionCode: session.code || session.id,
                    currentVotingCriticId: session.currentVotingCriticId || null
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
