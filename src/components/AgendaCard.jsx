import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AgendaCard({ sessions, user, onDelete }) {
    // 1. Get today's date in 'YYYY-MM-DD' format using Peru logic (America/Lima)
    const getTodayStr = () => {
        const now = new Date();
        const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Intl.DateTimeFormat('en-CA', options).format(now);
    };

    const todayStr = getTodayStr();

    // 2. Filter sessions for today
    const todaysSessions = sessions.filter(session => session.date === todayStr);

    // 3. Format Date for Display
    const displayDate = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    const capitalizedDate = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

    return (
        <Card className="mb-6 border-l-4 border-l-primary shadow-sm bg-muted/50 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">Agenda de Hoy</CardTitle>
                            <p className="text-xs text-muted-foreground capitalize">{capitalizedDate}</p>
                        </div>
                    </div>

                    {todaysSessions.length > 0 && (
                        <div className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full border border-green-500/20 animate-pulse">
                            En curso
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {todaysSessions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center opacity-50">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <p className="text-sm">No hay sesiones programadas para hoy.</p>
                        <p className="text-xs opacity-60">¡Día libre de críticas!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todaysSessions.map((session) => {
                            const isOwner = user && (session.createdBy === user.email);

                            return (
                                <div
                                    key={session.id}
                                    className="group flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-all hover:border-primary/30"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold truncate leading-none mb-1.5 flex items-center gap-2">
                                            {session.flow || 'Sin título'}
                                            {session.type === 'Nuevo alcance' && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded">Scope</span>
                                            )}
                                        </h4>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[150px] font-medium">{session.presenter || 'Usuario'}</span>
                                        </div>
                                    </div>

                                    {isOwner && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onDelete(session.id)}
                                            title="Eliminar sesión"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
