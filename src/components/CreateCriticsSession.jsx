import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useHappyPaths } from '../hooks/useHappyPaths';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SESSION_TYPES = ['Design Critic', 'Iteración DS', 'Nuevo alcance'];

const formSchema = z.object({
    ticket: z.string().min(1, "Selecciona un ticket"),
    flow: z.string().min(1, "Selecciona un Happy Path"),
    type: z.enum(['Design Critic', 'Iteración DS', 'Nuevo alcance']),
    notes: z.string().optional(),
    figmaLink: z.string().optional(),
    product: z.string().optional()
});

function CreateCriticsSession({
    onSubmit,
    onClose,
    initialData,
    user,
    activeTickets = [],
    sessions = [],
    readOnlyFields = [],
    excludeTypes = []
}) {
    const isReadOnly = (field) => readOnlyFields.includes(field);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ticket: '',
            flow: '',
            type: 'Design Critic',
            notes: '',
            figmaLink: '',
            product: ''
        }
    });

    const { control, handleSubmit, setValue, watch, reset, formState: { errors, isValid } } = form;
    const watchedTicket = watch("ticket");
    const watchedFlow = watch("flow");
    const watchedType = watch("type");
    const watchedFigmaLink = watch("figmaLink");
    const watchedProduct = watch("product");

    const [detectingLink, setDetectingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    // Initial Data Load
    useEffect(() => {
        if (initialData) {
            reset({
                ticket: initialData.ticket || '',
                flow: initialData.flow || '',
                type: initialData.type || 'Design Critic',
                notes: initialData.notes || '',
                figmaLink: initialData.figmaLink || '',
                product: initialData.product || ''
            });
            // If ticket exists but no link, try internal fetch logic if needed (usually handleTicketChange does it)
            // But we can trigger it manually or let the effect below handle it if ticket changes?
            // If we reset, 'watchedTicket' changes, triggering the effect.
        }
    }, [initialData, reset]);

    // Handle Ticket Change (Auto-detect product & Fetch Figma Link)
    useEffect(() => {
        const handleTicketUpdate = async (ticketKey) => {
            if (!ticketKey) return;

            // 1. Detect Product locally
            const selectedTicket = activeTickets.find(t => t.key === ticketKey);
            let detectedProduct = 'PGH'; // Default

            if (selectedTicket) {
                const summaryUpper = (selectedTicket.summary || '').toUpperCase();
                const colonIndex = summaryUpper.indexOf(':');
                const prefix = colonIndex > -1 ? summaryUpper.substring(0, colonIndex) : '';

                if (prefix && /\bPGH\b/.test(prefix)) detectedProduct = 'PGH';
                else if (summaryUpper.includes('RECADIA')) detectedProduct = 'Recadia';
                else if (summaryUpper.includes('CAMBIO SEGURO') || (prefix && /\bCS\b/.test(prefix))) detectedProduct = 'Cambio Seguro';
                else if (prefix && /\bFACTORING\b/.test(prefix)) detectedProduct = 'Factoring';
                else if (summaryUpper.includes('GESTORA')) detectedProduct = 'Gestora';
                if (/^TRANSVERSAL\s*:/i.test(selectedTicket.summary || '') || summaryUpper.includes('TRANSVERSAL')) {
                    detectedProduct = 'Transversal';
                }

                // Only set if not already set or different (to avoid overwrite if manual... but concept says auto)
                // We overwrite for consistency
                setValue('product', detectedProduct);
            }

            // 2. Fetch Figma Link
            // Only if link is empty or we changed ticket (which we did)
            // But check if we already have it from initialData (reset handles it, but effect runs after reset)
            // We can check if 'figmaLink' is already populated and matches? 
            // Better to only fetch if ticket changed effectively.

            // To avoid refetching on initial load if link is already there:
            const currentLink = form.getValues('figmaLink');
            if (currentLink && initialData?.ticket === ticketKey) return;

            if (ticketKey.includes('-')) {
                setDetectingLink(true);
                setLinkError(null);
                try {
                    const res = await fetch('/api/get-jira-field', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticketKey })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.figmaLink) {
                            setValue('figmaLink', data.figmaLink);
                            setLinkError(null);
                        } else {
                            setLinkError('No se encontró link de Figma en el ticket.');
                            setValue('figmaLink', '');
                        }
                    } else {
                        setLinkError('Error consultando Jira.');
                    }
                } catch (err) {
                    console.error(err);
                    setLinkError('Error de conexión.');
                } finally {
                    setDetectingLink(false);
                }
            }
        };

        if (watchedTicket) {
            handleTicketUpdate(watchedTicket);
        }
    }, [watchedTicket, activeTickets, setValue, initialData]);

    // Optimization: Use preloaded happy paths if available for current ticket
    const preloadedHappyPaths = useMemo(() => {
        if (initialData?.happyPaths && initialData.ticket === watchedTicket) {
            return initialData.happyPaths;
        }
        return null;
    }, [initialData, watchedTicket]);

    const { happyPaths, loading: loadingHappyPaths, refresh: refreshHappyPaths, hasLoaded } = useHappyPaths(watchedFigmaLink, preloadedHappyPaths);

    // Business Logic: Can Do New Scope?
    const canDoNewScope = useMemo(() => {
        if (!watchedTicket || !watchedFlow) return false;
        return sessions.some(s =>
            s.ticket === watchedTicket &&
            s.flow === watchedFlow &&
            s.type === 'Design Critic'
        );
    }, [sessions, watchedTicket, watchedFlow]);

    useEffect(() => {
        if (watchedType === 'Nuevo alcance' && !canDoNewScope) {
            setValue('type', 'Design Critic');
        }
    }, [canDoNewScope, watchedType, setValue]);

    const filteredTickets = activeTickets.filter(ticket => {
        if (ticket.key === watchedTicket) return true;
        const statusCat = ticket.statusCategory?.key || ticket.status?.statusCategory?.key;
        const statusName = (ticket.status?.name || ticket.status || '').toString().toLowerCase();
        if (statusCat === 'done') return false;
        if (statusName === 'listo' || statusName === 'finalizado' || statusName === 'done') return false;
        return true;
    });

    const onSubmitForm = (data) => {
        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 w-full max-w-full min-w-0">
            {/* Ticket Jira */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">
                    Ticket de Jira <span className="text-destructive">*</span>
                </Label>

                {isReadOnly('ticket') && watchedTicket ? (
                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                        <span className="truncate">
                            {watchedTicket} - {activeTickets.find(t => t.key === watchedTicket)?.summary}
                        </span>
                    </div>
                ) : (
                    <Controller
                        name="ticket"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full bg-background">
                                    <SelectValue placeholder="-- Seleccionar ticket --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredTickets.map(t => (
                                        <SelectItem key={t.key} value={t.key}>
                                            {t.summary}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                )}
                {errors.ticket && <span className="text-xs text-destructive">{errors.ticket.message}</span>}
            </div>

            {/* Automatic Happy Paths Section */}
            <div className="space-y-2">
                {detectingLink && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando link de Figma en Jira...
                    </div>
                )}

                {!detectingLink && linkError && watchedTicket && !watchedFigmaLink && (
                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
                            <AlertTriangle className="h-4 w-4" />
                            Falta el link de Figma
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Agrégalo en el campo "Solución" o "Descripción" del ticket en Jira y vuelve a seleccionarlo.
                        </p>
                    </div>
                )}

                {watchedFigmaLink && (
                    <>
                        {loadingHappyPaths || !hasLoaded ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando Happy Paths desde Figma...
                            </div>
                        ) : happyPaths.length > 0 ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label className="text-sm font-medium">
                                    Happy Path <span className="text-destructive">*</span>
                                </Label>
                                {isReadOnly('flow') && watchedFlow ? (
                                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                                        {watchedFlow}
                                    </div>
                                ) : (
                                    <Controller
                                        name="flow"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full bg-background">
                                                    <SelectValue placeholder="-- Seleccionar Happy Path --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {happyPaths.map(hp => (
                                                        <SelectItem key={hp.id} value={hp.name}>
                                                            {hp.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                )}
                                {errors.flow && <span className="text-xs text-destructive">{errors.flow.message}</span>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                ❌ No se encontraron Happy Paths (Frames que empiecen con "HP-").
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={refreshHappyPaths}
                                    className="h-auto p-0 text-xs"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Reintentar
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Session Type - Radio Cards */}
            {watchedFlow && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-sm font-medium">
                        Tipo de sesión <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <>
                                    <label
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                            field.value === 'Design Critic'
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-input hover:bg-muted"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            {...field}
                                            value="Design Critic"
                                            checked={field.value === 'Design Critic'}
                                            className="h-4 w-4 text-primary accent-primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">Design Critic</span>
                                            <span className="text-xs text-muted-foreground">Primera revisión</span>
                                        </div>
                                    </label>

                                    {!excludeTypes.includes('Iteración DS') && (
                                        <label
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                field.value === 'Iteración DS'
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-input hover:bg-muted"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                {...field}
                                                value="Iteración DS"
                                                checked={field.value === 'Iteración DS'}
                                                className="h-4 w-4 text-primary accent-primary"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Iteración DS</span>
                                                <span className="text-xs text-muted-foreground">Revisión de cambios</span>
                                            </div>
                                        </label>
                                    )}

                                    {!excludeTypes.includes('Nuevo alcance') && canDoNewScope && (
                                        <label
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                field.value === 'Nuevo alcance'
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-input hover:bg-muted"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                {...field}
                                                value="Nuevo alcance"
                                                checked={field.value === 'Nuevo alcance'}
                                                className="h-4 w-4 text-primary accent-primary"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">Nuevo alcance</span>
                                                <span className="text-xs text-muted-foreground">Cambio mayor</span>
                                            </div>
                                        </label>
                                    )}
                                </>
                            )}
                        />
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={detectingLink || !isValid}
                >
                    {initialData?.id ? 'Guardar Cambios' : 'Agendar'}
                </Button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
