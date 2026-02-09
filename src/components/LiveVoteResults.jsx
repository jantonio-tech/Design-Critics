import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Widget de resultados de votación en tiempo real.
 *
 * @param {object} vote - Objeto de votación de live_sessions.votes[]
 * @param {boolean} isFacilitator - true si el usuario actual es el facilitador
 */
export function LiveVoteResults({ vote, isFacilitator = false }) {
    if (!vote) return null;

    const isActive = vote.status === 'active';
    const isCompleted = vote.status === 'completed';
    const votedEmails = (vote.votes || []).map(v => v.email);
    const pendingVoters = (vote.eligibleVoters || []).filter(e => !votedEmails.includes(e));
    const totalVoted = vote.votes?.length || 0;
    const totalExpected = vote.expectedVotes || 0;

    return (
        <div className="space-y-3">
            {/* Progreso */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                    {isCompleted ? 'Votación completada' : 'Votación en curso'}
                </span>
                <span className={cn(
                    "font-semibold",
                    isCompleted ? "text-green-600 dark:text-green-400" : "text-primary"
                )}>
                    {totalVoted}/{totalExpected} votos
                </span>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCompleted ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${totalExpected > 0 ? (totalVoted / totalExpected) * 100 : 0}%` }}
                />
            </div>

            {/* Lista de votantes */}
            {isActive && (
                <div className="space-y-2">
                    {/* Quién ya votó */}
                    {vote.votes?.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Votaron:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {vote.votes.map(v => (
                                    <span
                                        key={v.email}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400"
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        {v.name || v.email.split('@')[0]}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quién falta */}
                    {pendingVoters.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Pendientes:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {pendingVoters.map(email => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                                    >
                                        <Clock className="w-3 h-3" />
                                        {email.split('@')[0]}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Resultado final */}
            {isCompleted && vote.result && (
                <div className="space-y-3">
                    <div className={cn(
                        "text-center py-3 rounded-lg font-semibold flex flex-col gap-1",
                        vote.result.decision === 'approved'
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}>
                        <span>
                            {vote.result.decision === 'approved'
                                ? '✅ APROBADO'
                                : '🔄 REQUIERE NUEVO CRITICS'
                            }
                        </span>
                        <span className="text-xs font-normal opacity-90">
                            {vote.result.decision === 'approved'
                                ? 'El diseño está listo para Handoff / Desarrollo'
                                : 'Se debe agendar una nueva sesión para revisar cambios'
                            }
                        </span>
                    </div>

                    {/* Detalle solo para facilitador */}
                    {isFacilitator && (
                        <div className="text-xs space-y-2 border-t pt-3">
                            <p className="font-medium text-muted-foreground">Detalle (solo visible para ti):</p>

                            {vote.result.approvedCount > 0 && (
                                <div>
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                        Aprobado ({vote.result.approvedCount}):
                                    </span>
                                    <span className="ml-1 text-muted-foreground">
                                        {vote.votes
                                            .filter(v => v.decision === 'approved')
                                            .map(v => v.name || v.email.split('@')[0])
                                            .join(', ')}
                                    </span>
                                </div>
                            )}

                            {vote.result.needsCriticCount > 0 && (
                                <div>
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                        Requiere nuevo ({vote.result.needsCriticCount}):
                                    </span>
                                    <span className="ml-1 text-muted-foreground">
                                        {vote.votes
                                            .filter(v => v.decision === 'needs_critic')
                                            .map(v => v.name || v.email.split('@')[0])
                                            .join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Comentarios */}
                            {vote.votes.filter(v => v.comment).map(v => (
                                <div key={v.email} className="bg-muted/50 p-2 rounded text-muted-foreground">
                                    <span className="font-medium">{v.name || v.email.split('@')[0]}:</span> {v.comment}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
