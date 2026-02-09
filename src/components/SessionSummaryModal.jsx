import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { BarChart3, Clock, Users, Presentation, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal de resumen final de la sesión de votaciones.
 * Se muestra al cerrar la sesión con todos los resultados.
 */
export function SessionSummaryModal({ open, onClose, summary, votes = [] }) {
    if (!summary) return null;

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        if (h > 0) return `${h}h ${m}min`;
        return `${m}min`;
    };

    // Obtener lista única de presentadores
    const presenters = [...new Set(votes.map(v => v.presenterName))];

    // Obtener número de asistentes (de la primera votación con votos)
    const firstVoteWithVoters = votes.find(v => v.eligibleVoters?.length > 0);
    const attendeesCount = firstVoteWithVoters?.eligibleVoters?.length || 0;

    // Fecha
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const capitalizedDate = today.charAt(0).toUpperCase() + today.slice(1);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Resumen de la Sesión
                    </DialogTitle>
                    <DialogDescription>
                        {capitalizedDate}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Clock className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Duración</p>
                                    <p className="text-sm font-semibold">{formatDuration(summary.duration || 0)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Presentation className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Presentadores</p>
                                    <p className="text-sm font-semibold">{presenters.length}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Critics evaluados</p>
                                    <p className="text-sm font-semibold">{summary.totalPresentations || 0}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Users className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Asistentes</p>
                                    <p className="text-sm font-semibold">{attendeesCount}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Resultados */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Resultados</h3>

                        {votes.map((vote, index) => (
                            <Card
                                key={vote.voteId}
                                className={cn(
                                    "border-l-4",
                                    vote.result?.decision === 'approved'
                                        ? "border-l-green-500"
                                        : "border-l-amber-500"
                                )}
                            >
                                <CardContent className="p-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold">
                                            {vote.happyPath}
                                        </h4>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-xs font-semibold px-2 py-0.5 rounded-full block w-fit ml-auto mb-1",
                                                vote.result?.decision === 'approved'
                                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            )}>
                                                {vote.result?.decision === 'approved'
                                                    ? 'APROBADO'
                                                    : 'REQUIERE NUEVO CRITICS'
                                                }
                                            </span>
                                            <span className="text-[10px] text-muted-foreground block">
                                                {vote.result?.decision === 'approved'
                                                    ? 'Listo para Handoff'
                                                    : 'Se debe reprogramar'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {vote.presenterName} · {vote.ticket}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Resumen */}
                    <div className="flex gap-4 justify-center text-sm border-t pt-4">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                            Aprobados: {summary.totalApproved || 0}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Requieren nuevo: {summary.totalNeedsCritic || 0}
                        </span>
                    </div>

                    {/* Advertencia */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            A partir de ahora, las nuevas sesiones se agendarán para el próximo día hábil.
                        </p>
                    </div>

                    {/* Acciones */}
                    <Button onClick={onClose} className="w-full" size="lg">
                        Cerrar sesión
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
