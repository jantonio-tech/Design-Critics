import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';

const PRODUCTS = ['PGH', 'Recadia', 'Cambio Seguro', 'Factoring', 'Gestora', 'Transversal', 'Web Pública'];
const TYPES = ['Design Critic', 'Iteración DS', 'Nuevo scope'];

function CreateCriticsSession({
    onSubmit,
    onClose,
    initialData,
    user,
    activeTickets = [],
    sessions = [],       // New prop for history check
    readOnlyFields = [], // Prop for Simplified Mode
    excludeTypes = []    // Prop to filter specific types
}) {
    const props = { readOnlyFields }; // Access wrapper for helper function
    const [formData, setFormData] = useState({
        product: '',
        ticket: '',
        flow: '',
        type: 'Design Critic',
        notes: '',
        figmaLink: ''
    });

    const isReadOnly = (field) => {
        // Check if we are in "Simplified Mode" via props (readOnlyFields)
        // usage: <CreateCriticsSession readOnlyFields={['ticket', 'product']} ... />
        return props.readOnlyFields && props.readOnlyFields.includes(field);
    };

    const [detectingLink, setDetectingLink] = useState(false);
    const [linkError, setLinkError] = useState(null);

    // Initial Data Load & Auto-Detect Logic
    useEffect(() => {
        if (initialData) {
            const ticketKey = initialData.ticket || '';
            let product = initialData.product || ''; // Allow empty default if simplified mode passing it

            // If product is missing but ticket exists, try to detect
            if (!product && ticketKey && activeTickets.length > 0) {
                const selectedTicket = activeTickets.find(t => t.key === ticketKey);
                if (selectedTicket) {
                    const summaryUpper = (selectedTicket.summary || '').toUpperCase();
                    const colonIndex = summaryUpper.indexOf(':');
                    const prefix = colonIndex > -1 ? summaryUpper.substring(0, colonIndex) : '';

                    if (prefix && /\bPGH\b/.test(prefix)) product = 'PGH';
                    else if (summaryUpper.includes('RECADIA')) product = 'Recadia';
                    else if (summaryUpper.includes('CAMBIO SEGURO') || (prefix && /\bCS\b/.test(prefix))) product = 'Cambio Seguro';
                    else if (prefix && /\bFACTORING\b/.test(prefix)) product = 'Factoring';
                    else if (summaryUpper.includes('GESTORA')) product = 'Gestora';
                    if (/^TRANSVERSAL\s*:/i.test(selectedTicket.summary || '') || summaryUpper.includes('TRANSVERSAL')) {
                        product = 'Transversal';
                    }
                }
            }

            // Fallback for standalone usage
            if (!product) product = 'PGH';

            setFormData({
                product: product,
                ticket: ticketKey,
                flow: initialData.flow || '',
                type: initialData.type || 'Design Critic',
                notes: initialData.notes || '',
                figmaLink: initialData.figmaLink || ''
            });

            // If link is provided directly (e.g. from Accordion), use it!
            if (initialData.figmaLink) {
                // No need to fetch, just use it. 
                // We might want to trigger happy path loading immediately though.
            }
            // Trigger link fetch if needed (simulating selection)
            else if (ticketKey && ticketKey.includes('-')) {
                // We need to fetch the link. 
                fetchFigmaLink(ticketKey);
            }
        }
    }, [initialData, activeTickets]);

    // Helper to fetch link (extracted from handleTicketChange)
    const fetchFigmaLink = async (key) => {
        setDetectingLink(true);
        setLinkError(null);
        try {
            const res = await fetch('/api/get-jira-field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketKey: key })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.figmaLink) {
                    setFormData(prev => ({ ...prev, figmaLink: data.figmaLink }));
                } else {
                    setLinkError('No se encontró link de Figma en el ticket (campo Solución o Descripción).');
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
    };


    // Happy Paths Hook
    const { happyPaths, loading: loadingHappyPaths, refresh: refreshHappyPaths, hasLoaded } = useHappyPaths(formData.figmaLink);

    // Filter tickets logic
    // Logic to Enable "Nuevo alcance"
    const canDoNewScope = React.useMemo(() => {
        if (!formData.ticket || !formData.flow) return false;
        // Check if there is at least one 'Design Critic' session for this ticket + flow
        // Note: sessions prop must be passed from parent
        return sessions.some(s =>
            s.ticket === formData.ticket &&
            s.flow === formData.flow &&
            s.type === 'Design Critic'
        );
    }, [sessions, formData.ticket, formData.flow]);

    // Effect to reset type if "Nuevo alcance" becomes invalid
    useEffect(() => {
        if (formData.type === 'Nuevo alcance' && !canDoNewScope) {
            setFormData(prev => ({ ...prev, type: 'Design Critic' }));
        }
    }, [canDoNewScope, formData.type]);

    const filteredTickets = activeTickets.filter(ticket => {
        if (ticket.key === formData.ticket) return true;
        const statusCat = ticket.statusCategory?.key || ticket.status?.statusCategory?.key;
        const statusName = (ticket.status?.name || ticket.status || '').toString().toLowerCase();
        if (statusCat === 'done') return false;
        if (statusName === 'listo' || statusName === 'finalizado' || statusName === 'done') return false;
        return true;
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTicketChange = async (e) => {
        const selectedKey = e.target.value;

        // 1. Detect Product from Ticket Summary locally (fast)
        const selectedTicket = activeTickets.find(t => t.key === selectedKey);
        let detectedProduct = formData.product;

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
        }

        setFormData(prev => ({
            ...prev,
            ticket: selectedKey,
            product: detectedProduct,
            figmaLink: '',   // Reset link
            flow: ''         // Reset flow
        }));

        // 2. Auto-fetch Figma Link from Jira (Async)
        if (selectedKey && selectedKey.includes('-')) {
            setDetectingLink(true);
            setLinkError(null);
            try {
                const res = await fetch('/api/get-jira-field', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketKey: selectedKey })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.figmaLink) {
                        setFormData(prev => ({ ...prev, figmaLink: data.figmaLink }));
                    } else {
                        setLinkError('No se encontró link de Figma en el ticket (campo Solución o Descripción).');
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

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Producto y Ticket */}
            {/* Ticket Jira - Moved to Top */}
            <div className="form-group">
                <label className="form-label required">Ticket de Jira</label>

                {isReadOnly('ticket') && formData.ticket ? (
                    // Read-only View (Styled like Disabled Select)
                    <div className="form-select disabled" style={{
                        backgroundColor: 'var(--bg-active)',
                        color: 'var(--text-secondary)',
                        cursor: 'not-allowed',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formData.ticket} - {activeTickets.find(t => t.key === formData.ticket)?.summary}
                        </span>
                    </div>
                ) : (
                    // Normal Select View
                    <div style={{ position: 'relative' }}>
                        <select
                            name="ticket"
                            className="form-select"
                            value={formData.ticket}
                            onChange={handleTicketChange}
                            required
                        >
                            <option value="">-- Seleccionar ticket --</option>
                            {filteredTickets.map(t => (
                                <option key={t.key} value={t.key}>
                                    {t.summary}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* AUTOMATIC HAPPY PATHS SECTION - MOVED UP */}
            <div className="form-group">
                {/* Status: Detecting Link */}
                {detectingLink && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <span className="animate-spin">⏳</span>
                        Buscando link de Figma en Jira...
                    </div>
                )}

                {/* Status: Error finding link */}
                {!detectingLink && linkError && formData.ticket && !formData.figmaLink && (
                    <div className="text-sm text-gray-400 p-3 rounded-md flex flex-col gap-1" style={{ border: '1px solid #64748B' }}>
                        <div className="flex items-center gap-2 text-amber-500 font-medium">
                            <span>⚠️</span> Falta el link de Figma
                        </div>
                        <div className="text-xs opacity-80">
                            Agrégalo en el campo "Solución" o "Descripción" del ticket en Jira y vuelve a seleccionarlo.
                        </div>
                    </div>
                )}

                {/* Status: Link Found & Loading Paths */}
                {formData.figmaLink && (
                    <>
                        {loadingHappyPaths || !hasLoaded ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="animate-spin">🔄</span>
                                Cargando Happy Paths desde Figma...
                            </div>
                        ) : happyPaths.length > 0 ? (
                            <div className="search-animation">
                                <label className="form-label required">Happy Path</label>
                                {isReadOnly('flow') && formData.flow ? (
                                    /* Read Only Flow View */
                                    <div className="form-select disabled" style={{
                                        backgroundColor: 'var(--bg-active)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'not-allowed',
                                        opacity: 0.7
                                    }}>
                                        {formData.flow}
                                    </div>
                                ) : (
                                    /* Normal Select */
                                    <select
                                        className="form-select"
                                        onChange={(e) => setFormData(prev => ({ ...prev, flow: e.target.value }))}
                                        value={formData.flow}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {happyPaths.map(hp => (
                                            <option key={hp.id} value={hp.name}>
                                                {hp.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-red-500">
                                ❌ No se encontraron Happy Paths (Frames que empiecen con "HP-").
                                <button type="button" onClick={refreshHappyPaths} className="ml-2 text-blue-500 underline text-xs">Reintentar</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Tipo - Replaced with Radio Buttons */}
            {/* Show only if Flow is selected */}
            {formData.flow && (
                <div className="form-group fade-in-up">
                    <label className="form-label required">Tipo de sesión</label>
                    <div className="radio-group-container">
                        <label className={`radio-card ${formData.type === 'Design Critic' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="type"
                                value="Design Critic"
                                checked={formData.type === 'Design Critic'}
                                onChange={handleChange}
                            />
                            <div className="radio-content">
                                <span className="radio-title">Design Critic</span>
                                <span className="radio-desc">Primera revisión del flujo</span>
                            </div>
                        </label>

                        {!excludeTypes.includes('Iteración DS') && (
                            <label className={`radio-card ${formData.type === 'Iteración DS' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    value="Iteración DS"
                                    checked={formData.type === 'Iteración DS'}
                                    onChange={handleChange}
                                />
                                <div className="radio-content">
                                    <span className="radio-title">Iteración DS</span>
                                    <span className="radio-desc">Revisión de cambios</span>
                                </div>
                            </label>
                        )}

                        {!excludeTypes.includes('Nuevo alcance') && (
                            <label className={`radio-card ${formData.type === 'Nuevo alcance' ? 'selected' : ''} ${!canDoNewScope ? 'disabled' : ''}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    value="Nuevo alcance"
                                    checked={formData.type === 'Nuevo alcance'}
                                    onChange={handleChange}
                                    disabled={!canDoNewScope}
                                />
                                <div className="radio-content">
                                    <span className="radio-title">Nuevo alcance</span>
                                    <span className="radio-desc">Reemplaza a "Nuevo scope"</span>
                                </div>
                            </label>
                        )}
                    </div>
                    {!canDoNewScope && formData.flow && !excludeTypes.includes('Nuevo alcance') && (
                        <div className="text-xs text-gray-500 mt-1">
                            * Requiere un Design Critic previo en este flujo.
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .fade-in-up {
                    animation: fadeInUp 0.3s ease-out;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .radio-group-container {
                    display: flex;
                    gap: 12px;
                }
                .radio-card {
                    flex: 1;
                    display: flex;
                    align-items: center; /* Vertical center alignment */
                    gap: 10px;          /* Match design spacing */
                    padding: 12px;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .radio-card:hover:not(.disabled) {
                    background: #F9FAFB;
                    border-color: #D1D5DB;
                }
                .radio-card.selected {
                    border-color: #2563EB;
                    background: #EFF6FF;
                    box-shadow: 0 0 0 1px #2563EB;
                }
                .radio-card.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: #F3F4F6;
                }
                /* Hide default radio but keep accessible? Or style it? */
                /* Let's keep specific style for radio input if needed, or simple */
                .radio-card input {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                    accent-color: #2563EB;
                }
                .radio-content {
                    display: flex;
                    flex-direction: column;
                }
                .radio-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #111827;
                }
                .radio-desc {
                    font-size: 12px;
                    color: #6B7280;
                }
                .radio-card.disabled .radio-title,
                .radio-card.disabled .radio-desc {
                     color: #9CA3AF;
                }

                /* Dark Mode Support */
                html[data-theme="dark"] .radio-card {
                    border-color: #374151;
                    background: #1F2937;
                }
                html[data-theme="dark"] .radio-card:hover:not(.disabled) {
                    background: #374151;
                    border-color: #4B5563;
                }
                html[data-theme="dark"] .radio-card.selected {
                    background: rgba(37, 99, 235, 0.2);
                    border-color: #3B82F6;
                }
                html[data-theme="dark"] .radio-card.disabled {
                    background: #0F172A; /* Darker than card */
                    border-color: #1E293B;
                    opacity: 0.6;
                }
                html[data-theme="dark"] .radio-title { color: #F3F4F6; }
                html[data-theme="dark"] .radio-desc { color: #9CA3AF; }
                
                html[data-theme="dark"] .radio-card.disabled .radio-title,
                html[data-theme="dark"] .radio-card.disabled .radio-desc {
                    color: #4B5563;
                }
            `}</style>

            {/* Product Label Removed as requested */}









            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={detectingLink || !formData.ticket || !formData.flow || !formData.type}>
                    {initialData?.id ? 'Guardar Cambios' : 'Agendar'}
                </button>
            </div>
        </form>
    );
}

export default CreateCriticsSession;
