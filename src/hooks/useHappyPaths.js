import { useState, useEffect, useCallback } from 'react';
import { getHappyPathsFromUrl } from '../utils/figma';

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

    const loadHappyPaths = useCallback(async (forceRefresh = false) => {
        if (!figmaLink) {
            setHappyPaths([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const paths = await getHappyPathsFromUrl(figmaLink, forceRefresh);
            setHappyPaths(paths);

        } catch (err) {
            console.error('Error loading happy paths:', err);
            setError(err.message);
            setHappyPaths([]);

        } finally {
            setLoading(false);
        }
    }, [figmaLink]);

    // Cargar automáticamente cuando cambia el link
    // Solo si el link parece valido para evitar loops con strings vacios
    useEffect(() => {
        if (figmaLink) {
            loadHappyPaths(false);
        }
    }, [loadHappyPaths, figmaLink]);

    // Función para refrescar manualmente
    const refresh = useCallback(() => {
        return loadHappyPaths(true);
    }, [loadHappyPaths]);

    return { happyPaths, loading, error, refresh };
}
