import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock, RotateCcw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

function getQuarter(dateStr) {
    if (!dateStr) return null;
    const month = parseInt(dateStr.split('-')[1], 10);
    if (month <= 3) return 1;
    if (month <= 6) return 2;
    if (month <= 9) return 3;
    return 4;
}

function getYear(dateStr) {
    if (!dateStr) return null;
    return parseInt(dateStr.split('-')[0], 10);
}

function getQuarterLabel(q, year) {
    return `Q${q} ${year}`;
}

function getQuarterDateRange(q, year) {
    const months = {
        1: 'Ene - Mar',
        2: 'Abr - Jun',
        3: 'Jul - Sep',
        4: 'Oct - Dic'
    };
    return months[q] + ` ${year}`;
}

function getProductBadge(product) {
    const colors = {
        'PGH': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
        'Recadia': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
        'Cambio Seguro': 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
        'Factoring': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
        'Gestora': 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
        'Transversal': 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    };
    return colors[product] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
}

export function HistoryPage({ sessions = [], user }) {
    // Obtener quarters disponibles desde las sesiones del usuario
    const { quarterOptions, currentQuarterKey } = useMemo(() => {
        const userSessions = sessions.filter(s => s.createdBy === user.email && s.status !== 'eliminado');
        const quartersSet = new Set();

        userSessions.forEach(s => {
            if (s.date) {
                const q = getQuarter(s.date);
                const y = getYear(s.date);
                if (q && y) quartersSet.add(`${q}-${y}`);
            }
        });

        // Agregar quarter actual siempre
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentQ = currentMonth <= 3 ? 1 : currentMonth <= 6 ? 2 : currentMonth <= 9 ? 3 : 4;
        const currentKey = `${currentQ}-${currentYear}`;
        quartersSet.add(currentKey);

        // Ordenar de más reciente a más antiguo
        const options = Array.from(quartersSet)
            .map(key => {
                const [q, y] = key.split('-').map(Number);
                return { key, q, year: y, label: getQuarterLabel(q, y), range: getQuarterDateRange(q, y), sort: y * 10 + q };
            })
            .sort((a, b) => b.sort - a.sort);

        return { quarterOptions: options, currentQuarterKey: currentKey };
    }, [sessions, user.email]);

    const [selectedQuarter, setSelectedQuarter] = useState(currentQuarterKey);

    // Agrupar tickets del quarter seleccionado
    const { completedTickets, inProgressTickets } = useMemo(() => {
        const [targetQ, targetYear] = selectedQuarter.split('-').map(Number);

        // Filtrar sesiones del usuario en el quarter seleccionado
        const userSessions = sessions.filter(s => {
            if (s.createdBy !== user.email) return false;
            if (s.status === 'eliminado') return false;
            if (!s.date) return false;
            const q = getQuarter(s.date);
            const y = getYear(s.date);
            return q === targetQ && y === targetYear;
        });

        // Agrupar por ticket
        const ticketMap = {};
        userSessions.forEach(s => {
            if (!ticketMap[s.ticket]) {
                ticketMap[s.ticket] = {
                    ticket: s.ticket,
                    ticketSummary: s.ticketSummary || '',
                    product: s.product || '',
                    sessions: [],
                    flows: {}
                };
            }
            // Actualizar summary si hay uno más reciente
            if (s.ticketSummary && !ticketMap[s.ticket].ticketSummary) {
                ticketMap[s.ticket].ticketSummary = s.ticketSummary;
            }
            ticketMap[s.ticket].sessions.push(s);

            if (s.flow) {
                if (!ticketMap[s.ticket].flows[s.flow]) {
                    ticketMap[s.ticket].flows[s.flow] = [];
                }
                ticketMap[s.ticket].flows[s.flow].push(s);
            }
        });

        const completed = [];
        const inProgress = [];

        Object.values(ticketMap).forEach(ticketData => {
            const flowNames = Object.keys(ticketData.flows);
            if (flowNames.length === 0) {
                inProgress.push(ticketData);
                return;
            }

            // Verificar si TODOS los flows tienen al menos un voto aprobado
            const allApproved = flowNames.every(flow => {
                return ticketData.flows[flow].some(s =>
                    s.status === 'activo' && s.voteResult?.result === 'approved'
                );
            });

            if (allApproved) {
                completed.push(ticketData);
            } else {
                inProgress.push(ticketData);
            }
        });

        // Ordenar por ticket key
        completed.sort((a, b) => a.ticket.localeCompare(b.ticket));
        inProgress.sort((a, b) => a.ticket.localeCompare(b.ticket));

        return { completedTickets: completed, inProgressTickets: inProgress };
    }, [sessions, user.email, selectedQuarter]);

    const getFlowStatus = (flowSessions) => {
        const hasApproved = flowSessions.some(s => s.status === 'activo' && s.voteResult?.result === 'approved');
        const hasNeedsCritic = flowSessions.some(s => s.status === 'activo' && s.voteResult?.result === 'needs_critic');
        const hasPending = flowSessions.some(s => s.status === 'activo' && (!s.voteResult || !s.voteResult.voted));

        if (hasApproved) return 'approved';
        if (hasNeedsCritic) return 'needs_critic';
        if (hasPending) return 'pending';
        return 'unknown';
    };

    const getVotedDate = (flowSessions) => {
        const approved = flowSessions.find(s => s.status === 'activo' && s.voteResult?.result === 'approved');
        if (approved?.voteResult?.votedAt?.seconds) {
            return new Date(approved.voteResult.votedAt.seconds * 1000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
        }
        return approved?.date || '';
    };

    const renderTicketCard = (ticketData, isCompleted) => (
        <Card key={ticketData.ticket} className={cn(isCompleted && "border-green-500/20")}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-muted-foreground">{ticketData.ticket}</span>
                            {ticketData.product && (
                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", getProductBadge(ticketData.product))}>
                                    {ticketData.product}
                                </span>
                            )}
                            {isCompleted && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Finalizado
                                </span>
                            )}
                        </div>
                        {ticketData.ticketSummary && (
                            <h4 className="text-sm font-semibold leading-tight truncate">{ticketData.ticketSummary}</h4>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {ticketData.sessions.length} {ticketData.sessions.length === 1 ? 'sesión' : 'sesiones'}
                    </span>
                </div>

                <div className="space-y-1.5">
                    {Object.entries(ticketData.flows).map(([flowName, flowSessions]) => {
                        const status = getFlowStatus(flowSessions);
                        const votedDate = status === 'approved' ? getVotedDate(flowSessions) : '';
                        const criticCount = flowSessions.filter(s => s.type === 'Design Critic' || s.type === 'Nuevo alcance').length;

                        return (
                            <div key={flowName} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/40">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-medium truncate">{flowName}</span>
                                    {status === 'approved' && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 whitespace-nowrap">
                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                            Aprobado
                                        </span>
                                    )}
                                    {status === 'needs_critic' && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Requiere nuevo
                                        </span>
                                    )}
                                    {status === 'pending' && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                            <Clock className="h-2.5 w-2.5" />
                                            Pendiente
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                    <span>{criticCount} {criticCount === 1 ? 'critic' : 'critics'}</span>
                                    {votedDate && <span>{votedDate}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );

    const selectedOption = quarterOptions.find(o => o.key === selectedQuarter);

    return (
        <div>
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1>Historial</h1>
                    <p>Tus tickets y sesiones de critics por quarter</p>
                </div>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {quarterOptions.map(opt => (
                            <SelectItem key={opt.key} value={opt.key}>
                                <div className="flex flex-col">
                                    <span className="font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground">{opt.range}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {completedTickets.length === 0 && inProgressTickets.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground font-medium">No hay sesiones de critics en este período</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {selectedOption ? selectedOption.range : ''}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Tickets finalizados */}
                    {completedTickets.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Tickets finalizados ({completedTickets.length})
                            </h3>
                            <div className="space-y-3">
                                {completedTickets.map(t => renderTicketCard(t, true))}
                            </div>
                        </div>
                    )}

                    {/* Tickets en curso */}
                    {inProgressTickets.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Tickets en curso ({inProgressTickets.length})
                            </h3>
                            <div className="space-y-3">
                                {inProgressTickets.map(t => renderTicketCard(t, false))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
