import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';
import { useTodaySessionStatus } from '../hooks/useTodaySessionStatus';
import { getNextAvailableDate } from '../utils/votingHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function TicketAccordion({
    ticket,
    sessions = [],
    onSchedule,
    cachedFigmaLink = null
}) {
    const [value, setValue] = useState("");
    const [figmaLink, setFigmaLink] = useState(cachedFigmaLink);
    const isOpen = value === "item-1";

    // Determinar texto dinámico del botón de agendar
    const { closed: sessionClosed } = useTodaySessionStatus();
    const scheduleInfo = getNextAvailableDate(sessionClosed);

    const { happyPaths, loading: loadingHPs, error: errorHPs, hasLoaded, refresh } = useHappyPaths(figmaLink);

    // Calculate progress with "Nuevo alcance" reset logic
    const { validFlowCounts, totalCriticsDone } = React.useMemo(() => {
        const ticketSessions = sessions.filter(s => s.ticket === ticket.key);
        const flowMap = {};

        ticketSessions.forEach(s => {
            if (!s.flow) return;
            if (!flowMap[s.flow]) flowMap[s.flow] = [];
            flowMap[s.flow].push(s);
        });

        const counts = {};
        let total = 0;

        Object.keys(flowMap).forEach(flow => {
            // Sync with Happy Paths:
            // If HPs are loaded, ONLY count flows that exist in the current list
            if (hasLoaded) {
                // Normalizamos para comparar (aunque deberían ser idénticos si vienen del mismo select)
                const isCurrent = happyPaths.some(hp => hp.name === flow);
                // Si el flujo de la sesión NO está en los happy paths actuales, lo ignoramos
                // Esto corrige el caso "1/4" donde el 1 es de un HP eliminado
                if (!isCurrent) return;
            }

            // Sort by timestamp to ensure chronological order (ID is not reliable for Firestore)
            const getTimestamp = (s) => {
                if (s.timestamp && s.timestamp.seconds) return s.timestamp.seconds * 1000;
                if (typeof s.timestamp === 'string') return new Date(s.timestamp).getTime();
                return 0;
            };

            const sList = flowMap[flow].sort((a, b) => getTimestamp(a) - getTimestamp(b));

            let sliceIndex = 0;
            for (let i = sList.length - 1; i >= 0; i--) {
                if (sList[i].type === 'Nuevo alcance') {
                    sliceIndex = i;
                    break;
                }
            }

            const validSessions = sList.slice(sliceIndex);
            const count = validSessions.filter(s => s.type === 'Design Critic' || s.type === 'Nuevo alcance').length;
            counts[flow] = count;
            total += count;
        });

        return { validFlowCounts: counts, totalCriticsDone: total };
    }, [sessions, ticket.key, happyPaths, hasLoaded]);

    const maxCritics = happyPaths.length > 0 ? happyPaths.length * 2 : 0;
    const progressPercent = maxCritics > 0 ? Math.min((totalCriticsDone / maxCritics) * 100, 100) : 0;

    const getProductBadge = (ticket) => {
        const summaryUpper = (ticket.fields?.summary || ticket.summary || '').toUpperCase();
        if (summaryUpper.includes('PGH')) return 'PGH';
        if (summaryUpper.includes('RECADIA')) return 'Recadia';
        if (summaryUpper.includes('CAMBIO SEGURO')) return 'Cambio Seguro';
        if (summaryUpper.includes('FACTORING')) return 'Factoring';
        if (summaryUpper.includes('GESTORA')) return 'Gestora';
        if (summaryUpper.includes('TRANSVERSAL')) return 'Transversal';
        return 'Producto';
    };
    const product = getProductBadge(ticket);

    // Usar cache del batch si está disponible
    useEffect(() => {
        if (cachedFigmaLink && !figmaLink) {
            setFigmaLink(cachedFigmaLink);
        }
    }, [cachedFigmaLink]);

    // Fallback: fetch individual solo si no hay cache
    useEffect(() => {
        const fetchFigmaLink = async () => {
            try {
                if (figmaLink) return;

                const resLink = await fetch('/api/get-jira-field', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketKey: ticket.key })
                });

                if (!resLink.ok) throw new Error('Failed to check Jira');
                const dataLink = await resLink.json();

                if (dataLink.figmaLink) {
                    setFigmaLink(dataLink.figmaLink);
                }
            } catch (err) {
                console.error("Error loading Figma Link for ticket", ticket.key, err);
            }
        };

        // Solo fetch si no tenemos link del cache ni local
        if (!figmaLink && !cachedFigmaLink) {
            fetchFigmaLink();
        }
    }, [ticket.key, cachedFigmaLink]);

    // Verificar si un HP fue evaluado en la sesión de votaciones
    const getVoteStatus = (hpName) => {
        const ticketSessions = sessions.filter(s =>
            s.ticket === ticket.key &&
            s.flow === hpName &&
            s.status === 'activo' &&
            s.voteResult?.voted === true
        );
        if (ticketSessions.length === 0) return null;
        // Tomar el más reciente con voto
        return ticketSessions[ticketSessions.length - 1].voteResult;
    };

    const getHpStatus = (hpName) => {
        const count = validFlowCounts[hpName] || 0;

        if (count >= 3) return { status: 'danger', count, label: `${count}/2 Critics (Excedido)`, action: scheduleInfo.label };
        if (count === 2) return { status: 'warning', count, label: `${count}/2 Critics (Límite)`, action: scheduleInfo.label };
        return { status: 'good', count, label: `${count}/2 Critics`, action: scheduleInfo.label };
    };

    return (
        <Card className={cn("transition-all", isOpen && "ring-1 ring-primary/20")}>
            <Accordion type="single" collapsible value={value} onValueChange={setValue}>
                <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline items-start">
                        <div className="flex flex-col gap-2 w-full text-left pr-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground">{ticket.key}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {product}
                                    </Badge>
                                </div>
                                {/* Chevron is handled by AccordionTrigger automatically */}
                            </div>

                            <h3 className="text-sm font-semibold leading-tight">
                                {ticket.fields?.summary || ticket.summary}
                            </h3>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span className="font-medium">
                                        {loadingHPs ? 'Calculando...' : maxCritics > 0 ? `${totalCriticsDone}/${maxCritics} Critics` : `${totalCriticsDone} Critics`}
                                    </span>
                                    {happyPaths.length > 0 && (
                                        <span>({happyPaths.length} HPs)</span>
                                    )}
                                </div>
                                {maxCritics > 0 && (
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                progressPercent >= 100 ? "bg-green-500" : "bg-primary"
                                            )}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 border-t bg-muted/30 pt-4">
                        <h4 className="text-xs uppercase text-muted-foreground font-semibold mb-3">
                            Detalle de Happy Paths
                        </h4>

                        {loadingHPs && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando flujos desde Figma...
                            </div>
                        )}

                        {!loadingHPs && errorHPs && (
                            <div className="text-center py-4 space-y-3">
                                <div className="flex items-center justify-center gap-2 text-destructive">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold">
                                        {errorHPs.type === 'FILE_NOT_FOUND' ? 'Archivo de Figma no encontrado' : 'Error al cargar Happy Paths'}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {typeof errorHPs === 'string' ? errorHPs : errorHPs.message}
                                </p>
                                {(errorHPs.figmaLink || figmaLink) && (
                                    <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md break-all">
                                        <span className="font-medium">Link:</span>{' '}
                                        {(errorHPs.figmaLink || figmaLink).substring(0, 60)}...
                                    </div>
                                )}
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {(errorHPs.figmaLink || figmaLink) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(errorHPs.figmaLink || figmaLink, '_blank')}
                                        >
                                            Abrir en Figma
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`https://prestamype.atlassian.net/browse/${ticket.key}`, '_blank')}
                                    >
                                        Verificar en Jira
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!loadingHPs && !errorHPs && happyPaths.length === 0 && (
                            <div className="py-4">
                                {!figmaLink ? (
                                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-1 mb-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
                                            <AlertTriangle className="h-4 w-4" />
                                            Falta el link de Figma
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Agrégalo en la descripción del ticket después de "✅ Solución:" en Jira.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 h-7 bg-background text-xs"
                                            onClick={() => window.open(`https://prestamype.atlassian.net/browse/${ticket.key}`, '_blank')}
                                        >
                                            Ir a Jira
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-1 mb-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
                                            <AlertTriangle className="h-4 w-4" />
                                            Falta registrar happy paths
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Utiliza el componente "Encabezado casuística" de Neo DS.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 h-7 bg-background text-xs"
                                            onClick={() => refresh()}
                                        >
                                            Actualizar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-0">
                            {happyPaths.map(hp => {
                                const status = getHpStatus(hp.name);
                                const voteResult = getVoteStatus(hp.name);
                                const isApproved = voteResult?.result === 'approved';
                                const needsNewCritic = voteResult?.requiresNewCritic === true;

                                return (
                                    <div
                                        key={hp.id}
                                        className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium flex items-center gap-1.5">
                                                {hp.name}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Aprobado
                                                    </span>
                                                )}
                                                {needsNewCritic && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                        <RotateCcw className="h-3 w-3" />
                                                        Requiere nuevo
                                                    </span>
                                                )}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                status.status === 'good' && "text-green-600 dark:text-green-400",
                                                status.status === 'warning' && "text-yellow-600 dark:text-yellow-400",
                                                status.status === 'danger' && "text-red-600 dark:text-red-400"
                                            )}>
                                                {status.label}
                                            </span>
                                        </div>
                                        {isApproved ? (
                                            <span className="text-xs text-muted-foreground italic">Evaluado</span>
                                        ) : status.action && (
                                            <Button
                                                size="sm"
                                                onClick={() => onSchedule({
                                                    ticket: ticket.key,
                                                    product: product,
                                                    flow: hp.name,
                                                    type: 'Design Critic',
                                                    lockFlow: true,
                                                    figmaLink: figmaLink,
                                                    happyPaths: happyPaths
                                                })}
                                            >
                                                {status.action}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}

