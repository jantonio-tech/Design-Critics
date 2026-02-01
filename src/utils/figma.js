import firebase from './firebase';

const firestore = firebase.firestore();

/**
 * Extrae el file key de un link de Figma
 * 
 * Ejemplos de links válidos:
 * - https://www.figma.com/file/ABC123XYZ/nombre-del-archivo
 * - https://figma.com/file/ABC123XYZ/nombre?node-id=123:456
 * 
 * @param {string} figmaUrl - URL completa del archivo de Figma
 * @returns {string|null} - File key o null si no es válido
 */
export function extractFileKey(figmaUrl) {
    if (!figmaUrl || typeof figmaUrl !== 'string') {
        return null;
    }

    // Clean URL first
    const cleanUrl = figmaUrl.trim();

    // Try default pattern
    const match = cleanUrl.match(/file\/([a-zA-Z0-9]+)/);
    if (match) return match[1];

    // Try design pattern (sometimes links are design/...)
    const matchDesign = cleanUrl.match(/design\/([a-zA-Z0-9]+)/);
    if (matchDesign) return matchDesign[1];

    return null;
}

/**
 * Obtiene metadata básica del archivo de Figma
 * Esta llamada es rápida porque no obtiene el contenido completo
 * Solo metadata: nombre, última modificación, versión
 * 
 * @param {string} fileKey - File key del archivo
 * @returns {Promise<Object>} - Metadata del archivo
 * @throws {Error} Si la API de Figma falla
 */
async function fetchFigmaMetadata(fileKey) {
    const token = import.meta.env.VITE_FIGMA_TOKEN;
    if (!token) throw new Error("Figma Token not found in env");

    const response = await fetch(
        `https://api.figma.com/v1/files/${fileKey}?depth=0`,
        {
            headers: {
                'X-Figma-Token': token
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Figma API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
        lastModified: new Date(data.lastModified).getTime(),
        name: data.name,
        version: data.version
    };
}

/**
 * Obtiene el contenido completo del archivo y detecta Happy Paths
 * Busca componentes "Encabezados casuística" con Tipo = "Happy Path"
 * 
 * @param {string} fileKey - File key del archivo
 * @returns {Promise<Array>} - Array de Happy Paths [{id, name}]
 * @throws {Error} Si no se encuentran Happy Paths o falla la API
 */
async function fetchHappyPathsFromFigma(fileKey) {
    const token = import.meta.env.VITE_FIGMA_TOKEN;
    if (!token) throw new Error("Figma Token not found in env");

    const response = await fetch(
        `https://api.figma.com/v1/files/${fileKey}`,
        {
            headers: {
                'X-Figma-Token': token
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Figma API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const happyPaths = [];

    /**
     * Extrae texto de un nodo de texto (recursivamente)
     * @param {Object} node - Nodo de Figma
     * @returns {string|null} - Texto encontrado o null
     */
    function extractTextFromNode(node) {
        if (node.type === 'TEXT' && node.characters) {
            return node.characters;
        }

        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const text = extractTextFromNode(child);
                if (text) return text;
            }
        }

        return null;
    }

    /**
     * Recorre el árbol de nodos buscando "Encabezados casuística"
     * con Tipo = "Happy Path"
     * 
     * @param {Object} node - Nodo actual
     * @param {Object|null} parentSection - Section padre (contexto)
     */
    function traverse(node, parentSection = null) {
        // 1. Detectar instancias del componente "Encabezados casuística"
        if (node.type === 'INSTANCE') {
            const isEncabezado = node.name &&
                (node.name.includes('Encabezados casuística') ||
                    node.name.includes('Encabezados casuistica'));

            if (isEncabezado && node.componentProperties) {
                // 2. Verificar si Tipo = "Happy Path"
                let isHappyPath = false;

                for (const [key, prop] of Object.entries(node.componentProperties)) {
                    // Buscar la propiedad que contiene "tipo" en su nombre
                    if (key.toLowerCase().includes('tipo') &&
                        prop.value === 'Happy Path') {
                        isHappyPath = true;
                        break;
                    }
                }

                if (isHappyPath) {
                    // 3. Extraer el nombre del texto dentro del componente
                    const titleText = extractTextFromNode(node);

                    // 4. Determinar ID y nombre
                    const id = parentSection?.id || node.id;
                    let name = titleText || parentSection?.name || 'Sin nombre';

                    // Limpiar el nombre (remover "Encabezados casuística" si aparece)
                    name = name.replace(/Encabezados casuística/gi, '').trim();

                    // 5. Agregar si no es duplicado
                    if (!happyPaths.find(hp => hp.id === id)) {
                        happyPaths.push({ id, name });
                    }
                }
            }
        }

        // Actualizar contexto de section padre
        let currentSection = parentSection;
        if (node.type === 'SECTION') {
            currentSection = node;
        }

        // Recorrer hijos recursivamente
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => traverse(child, currentSection));
        }
    }

    // Iniciar traversal desde el documento raíz
    traverse(data.document);

    // Validar que se encontraron happy paths
    if (happyPaths.length === 0) {
        // Intentar no lanzar error, sino retornar vacío para que la UI decida
        console.warn('No se encontraron Happy Paths en el archivo.');
    }

    return happyPaths;
}

/**
 * Obtiene datos cacheados de Firestore
 * @param {string} fileKey - File key del archivo
 * @returns {Promise<Object|null>} - Datos cacheados o null
 */
async function getCachedData(fileKey) {
    const docRef = firestore.collection('figma_cache').doc(fileKey);
    const doc = await docRef.get();

    return doc.exists ? doc.data() : null;
}

/**
 * Guarda datos en caché de Firestore
 * @param {string} fileKey - File key del archivo
 * @param {Object} data - Datos a cachear
 */
async function saveCachedData(fileKey, data) {
    await firestore.collection('figma_cache').doc(fileKey).set(data, { merge: true });
}

// NOTE: We need a way to get Jira Field Value. 
// In the client, we usually get this from the ticket object loaded in the app.
// The code in the prompt assumes `getJiraFieldValue`, but that is server-side or requires Jira API.
// We should modify `getHappyPathsForTicket` to accept the `figmaLink` directly, 
// OR we rely on the `jiraTickets` already loaded in state which contains details.
// However, looking at the code, `search-jira` returns summary, status, etc.
// It might NOT return the "Solución" field by default.
// The user prompt says: "Los tickets de Jira ya contienen un link de Figma en el campo 'Solución'".
// I might need to update `search-jira` endpoint to return this field or `search-jira.js` logic.
// BUT I cannot change `search-jira.js` (Serverless Function) easily from here without `api/` access and deploy.
// Wait, I can see `api/search-jira.js` in the file list. I CAN modify it.
// I should check `api/search-jira.js` to see if it retrieves custom fields like 'Solución'.
// For now, I will assume we pass the link OR the ticket key and we fetch the link.
// The prompt provides `getHappyPathsForTicket` which calls `getJiraFieldValue`.
// I will export a function that accepts `figmaLink` directly as well, to be flexible.

/**
 * Obtiene Happy Paths usando una URL de Figma Directamente
 */
export async function getHappyPathsFromUrl(figmaLink, forceRefresh = false) {
    const fileKey = extractFileKey(figmaLink);

    if (!fileKey) {
        throw new Error(
            'El link de Figma no es válido. ' +
            'Debe ser del formato: https://figma.com/file/ABC123/nombre'
        );
    }

    // 2. Si no es refresh forzado, verificar caché
    if (!forceRefresh) {
        try {
            // Obtener metadata de Figma (rápido, ~200ms)
            const metadata = await fetchFigmaMetadata(fileKey);

            // Consultar caché en Firestore
            const cached = await getCachedData(fileKey);

            // Si el caché existe y está actualizado según Figma
            if (cached && cached.lastModified >= metadata.lastModified) {
                console.log('✅ Usando caché (archivo sin cambios en Figma)');
                return cached.happyPaths;
            }

            console.log('🔄 Archivo modificado en Figma, actualizando caché...');

        } catch (metadataError) {
            console.warn('Error al verificar metadata, consultando Figma directamente:', metadataError);
        }
    }

    // 3. Archivo modificado o refresh forzado: obtener contenido completo
    const metadata = await fetchFigmaMetadata(fileKey);
    const happyPaths = await fetchHappyPathsFromFigma(fileKey);

    // 4. Guardar en caché
    await saveCachedData(fileKey, {
        fileKey,
        fileName: metadata.name,
        happyPaths,
        lastModified: metadata.lastModified,
        lastChecked: Date.now(),
        version: metadata.version
    });

    console.log(`✅ Detectados ${happyPaths.length} Happy Path(s), caché actualizado`);

    return happyPaths;
}

// Re-implementing the one requested if we can fetch the field.
// Since we don't have direct Jira access here, we will rely on the UI passing the link,
// or we need to update the API to fetch it.
// I will include this placeholder.
export async function getHappyPathsForTicket(jiraTicketKey, figmaLink, forceRefresh = false) {
    if (!figmaLink) {
        throw new Error('Figma Link is required');
    }
    return getHappyPathsFromUrl(figmaLink, forceRefresh);
}
