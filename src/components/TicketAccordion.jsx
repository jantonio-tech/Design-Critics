import React, { useState, useEffect } from 'react';
import { useHappyPaths } from '../hooks/useHappyPaths';

export function TicketAccordion({
    ticket,
    sessions = [],
    onSchedule
}) {
    const [expanded, setExpanded] = useState(false);
    // happyPaths, loadingHPs, errorHPs come from the hook now
    const [figmaLink, setFigmaLink] = useState(null);

    // Use the robust hook for Happy Paths
    const { happyPaths, loading: loadingHPs, error: errorHPs } = useHappyPaths(figmaLink);

    // Calculate initial progress (Total critics for this ticket)
    const ticketSessions = sessions.filter(s => s.ticket === ticket.key);
    const totalCriticsDone = ticketSessions.filter(s => s.type === 'Design Critic').length;

    // Derived state for Max Critics (Total HPs * 2)
    const maxCritics = happyPaths.length > 0 ? happyPaths.length * 2 : 0;
    const progressPercent = maxCritics > 0 ? Math.min((totalCriticsDone / maxCritics) * 100, 100) : 0;

    // Determine product from ticket (Logic reused)
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

    // Lazy load Happy Paths when component mounts (or when expanded if we wanted strictly lazy)
    // To show progress bar in collapsed state, we ideally want to fetch this broadly.
    // NOTE: For performance on many tickets, we might want to trigger this only on view or spread out.
    // For now, we'll fetch on mount to satisfy the "Progress Bar" requirement.
    // Lazy load Happy Paths when component mounts
    // NOTE: We first need the link.
    useEffect(() => {
        const fetchFigmaLink = async () => {
            try {
                // 1. Get Figma Link based on Ticket if not already present
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

        fetchFigmaLink();
    }, [ticket.key]); // Only run on mount/ticket change



    // Helper to get critics count for a specific HP
    const getHpStatus = (hpName) => {
        const hpSessions = ticketSessions.filter(s => s.flow === hpName && s.type === 'Design Critic');
        const count = hpSessions.length;

        if (count >= 2) return { status: 'complete', count, label: 'Completo ✅', action: null };
        if (count === 1) return { status: 'inprogress', count, label: '1/2 Critics', action: 'Agendar Hoy' };
        return { status: 'new', count: 0, label: '0/2 Critics', action: 'Agendar Hoy' };
    };

    return (
        <div className={`ticket-accordion ${expanded ? 'expanded' : ''}`}>
            {/* Header / Summary Card */}
            <div className="accordion-header" onClick={() => setExpanded(!expanded)}>

                <div className="accordion-top-row">
                    <span className="ticket-key">{ticket.key}</span>
                    <span className="ticket-product-badge">{product}</span>
                </div>
                <h3 className="ticket-summary">{ticket.fields?.summary || ticket.summary}</h3>

                {/* Progress Bar Section */}
                <div className="progress-section">
                    <div className="progress-flex">
                        <span className="progress-label">
                            {loadingHPs ? 'Calculando...' : maxCritics > 0 ? `${totalCriticsDone}/${maxCritics} Critics` : `${totalCriticsDone} Critics`}
                        </span>
                        {activeHPsCount(happyPaths) > 0 && (
                            <span className="hp-count-label">({happyPaths.length} HPs)</span>
                        )}
                    </div>
                    {maxCritics > 0 && (
                        <div className="progress-track">
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressPercent >= 100 ? '#10B981' : '#3B82F6'
                                }}
                            ></div>
                        </div>
                    )}
                </div>

                {/* Main CTA (Collapsed) - Only show if not expanded to avoid clutter when open */}
                {!expanded && (
                    <button
                        className="btn-quick-schedule"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSchedule({
                                ticket: ticket.key,
                                product: product,
                                type: 'Design Critic',
                                figmaLink: figmaLink // Pass link if we found it to save time
                            });
                        }}
                    >
                        Agendar Hoy
                    </button>
                )}

                <div className="accordion-chevron">
                    {expanded ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    )}
                </div>
            </div>

            {/* Expanded Body */}
            {expanded && (
                <div className="accordion-body">
                    <h4 className="body-title">Detalle de Happy Paths</h4>

                    {loadingHPs && <div className="loading-state">Cargando flujos desde Figma...</div>}

                    {!loadingHPs && happyPaths.length === 0 && (
                        <div className="empty-state">
                            <p>No se detectaron frames "HP-" en el archivo de Figma asociado.</p>
                            <button
                                className="btn-secondary-small"
                                onClick={() => onSchedule({ ticket: ticket.key, product, type: 'Design Critic' })}
                            >
                                Agendar Manualmente
                            </button>
                        </div>
                    )}

                    {happyPaths.map(hp => {
                        const status = getHpStatus(hp.name);
                        return (
                            <div key={hp.id} className="hp-row">
                                <div className="hp-info">
                                    <span className="hp-name">{hp.name}</span>
                                    <span className={`hp-status-text status-${status.status}`}>
                                        {status.label}
                                    </span>
                                </div>
                                {status.action && (
                                    <button
                                        className="btn-hp-action"
                                        onClick={() => onSchedule({
                                            ticket: ticket.key,
                                            product: product,
                                            flow: hp.name,
                                            type: 'Design Critic',
                                            figmaLink: figmaLink
                                        })}
                                    >
                                        {status.action}
                                    </button>
                                )}
                            </div>
                        );
                    })}


                </div>
            )}

            <style jsx>{`
                .ticket-accordion {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #E5E7EB;
                    margin-bottom: 16px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .ticket-accordion:hover {
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                .accordion-header {
                    padding: 16px;
                    cursor: pointer;
                    position: relative;
                }
                
                /* Layout Wrapper for Mobile (Default) */
                .header-content-wrapper {
                    display: flex;
                    flex-direction: column;
                    padding-right: 20px; /* Space for chevron */
                }

                .header-col-left {
                    order: 1;
                }
                
                .header-col-right {
                    order: 2;
                    margin-top: 8px;
                }

                .accordion-top-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    font-size: 12px;
                }
                .ticket-key { font-weight: 700; color: #374151; }
                .ticket-product-badge { 
                    background: #F3F4F6; color: #4B5563; padding: 2px 6px; border-radius: 4px; 
                }
                
                .ticket-summary {
                    font-size: 15px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    color: #111827;
                    line-height: 1.4;
                }

                .progress-section {
                    margin-bottom: 12px;
                }
                .progress-flex {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #6B7280;
                    margin-bottom: 4px;
                    font-weight: 500;
                }
                .progress-track {
                    height: 6px;
                    background: #E5E7EB;
                    border-radius: 3px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: #3B82F6;
                    border-radius: 3px;
                    transition: width 0.5s ease;
                }

                .btn-quick-schedule {
                    width: 100%;
                    padding: 8px 16px; /* Reduced vertical padding slightly */
                    background: #EFF6FF;
                    color: #2563EB;
                    border: 1px solid #BFDBFE;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .btn-quick-schedule:hover { background: #DBEAFE; }

                .accordion-chevron {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    font-size: 18px;
                    color: #9CA3AF;
                    display: block;
                }

                .accordion-body {
                    border-top: 1px solid #F3F4F6;
                    padding: 16px;
                    background: #FAFAFA;
                }
                .body-title {
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #6B7280;
                    margin: 0 0 12px 0;
                    font-weight: 600;
                }
                .hp-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #F3F4F6;
                }
                .hp-row:last-child { border-bottom: none; }
                
                .hp-info { display: flex; flex-direction: column; gap: 2px; }
                .hp-name { font-weight: 500; font-size: 14px; color: #374151; }
                .hp-status-text { font-size: 11px; }
                .status-complete { color: #10B981; }
                .status-inprogress { color: #F59E0B; }
                .status-new { color: #9CA3AF; }

                .btn-hp-action {
                    padding: 6px 12px;
                    background: #111827;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }
                .btn-hp-action:hover { background: #000; }

                .manual-add-section {
                    margin-top: 12px;
                    text-align: center;
                }
                .btn-text-only {
                    background: none;
                    border: none;
                    color: #6B7280;
                    font-size: 12px;
                    text-decoration: underline;
                    cursor: pointer;
                }


                
                /* Dark Mode Support */
                html[data-theme="dark"] .ticket-accordion {
                    background: #1E293B;
                    border-color: #334155;
                }
                html[data-theme="dark"] .ticket-key { color: #E2E8F0; }
                html[data-theme="dark"] .ticket-summary { color: #F8FAFC; }
                html[data-theme="dark"] .ticket-product-badge { background: #334155; color: #94A3B8; }
                html[data-theme="dark"] .accordion-body { background: #0F172A; border-top-color: #334155; }
                html[data-theme="dark"] .status-active { background: #1E3A8A; color: #93C5FD; }
                html[data-theme="dark"] .hp-name { color: #E2E8F0; }
                html[data-theme="dark"] .btn-quick-schedule {
                    background: #1e3a8a;
                    border-color: #1e40af;
                    color: #bfdbfe;
                }
                html[data-theme="dark"] .btn-quick-schedule:hover { background: #1e40af; }
                html[data-theme="dark"] .btn-hp-action { background: #475569; }
                html[data-theme="dark"] .btn-hp-action:hover { background: #64748B; }
            `}</style>
        </div>
    );
}

function activeHPsCount(hps) {
    return hps ? hps.length : 0;
}
