import { useState, useEffect, useCallback } from 'react';
import { getHappyPathsFromUrl, getCachedHappyPaths } from '../utils/figma';

/**
 * Hook personalizado para obtener Happy Paths de un ticket
 * Maneja loading states, errores y refresh automáticamente
 * 
 * @param {string} figmaLink - URL de Figma del ticket (campo Solución)
 * @returns {Object} { happyPaths, loading, error, refresh }
 * 
 * @example
 * const { happyPaths, loading, error, refresh } = useHappyPaths('https://figma.com/...');
 */
export function useHappyPaths(figmaLink) {
    const [happyPaths, setHappyPaths] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadHappyPaths = useCallback(async (forceRefresh = false) => {
        if (!figmaLink) {
            setHappyPaths([]);
            return;
        }

        let loadedFromCache = false;

        try {
            setError(null);

            // ESTRATEGIA: Stale-While-Revalidate
            // 1. Si no es refresh forzado, intentar mostrar caché INMEDIATAMENTE
            if (!forceRefresh) {
                const cachedPaths = await getCachedHappyPaths(figmaLink);
                if (cachedPaths && cachedPaths.length > 0) {
                    console.log('⚡ Cache hit (Instant Load)');
                    setHappyPaths(cachedPaths);
                    setLoading(false); // Ya tenemos datos, no mostramos spinner
                    loadedFromCache = true;
                    setHasLoaded(true);
                } else {
                    setLoading(true); // No hay caché, mostrar spinner
                }
            } else {
                setLoading(true);
            }

            // 2. Sincronizar con Figma en background (o foreground si no había caché)
            // Esto verificará metadata y descargará solo si cambió
            const paths = await getHappyPathsFromUrl(figmaLink, forceRefresh);

            // Actualizar estado con la versión más reciente
            setHappyPaths(paths);

        } catch (err) {
            console.error('Error loading happy paths:', err);
            // Si ya mostramos caché, el error de red es menos crítico para el usuario,
            // pero igual lo guardamos por si queremos mostrar un warning.
            // Si NO mostramos caché, esto mostrará el error en la UI.
            setError(err.message);
            if (!loadedFromCache && happyPaths.length === 0) {
                setHappyPaths([]);
            }

        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    }, [figmaLink]);

    // Cargar automáticamente cuando cambia el link
    // Solo si el link parece valido para evitar loops con strings vacios
    useEffect(() => {
        if (figmaLink) {
            setHasLoaded(false);
            loadHappyPaths(false);
        }
    }, [loadHappyPaths, figmaLink]);

    // Función para refrescar manualmente
    const refresh = useCallback(() => {
        return loadHappyPaths(true);
    }, [loadHappyPaths]);

    return { happyPaths, loading, error, refresh, hasLoaded };
}
