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
 * Extrae el node-id de un link de Figma
 * @param {string} figmaUrl
 * @returns {string|null}
 */
export function extractNodeId(figmaUrl) {
    if (!figmaUrl || typeof figmaUrl !== 'string') return null;
    const match = figmaUrl.match(/node-id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
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
    // Usar el proxy local para evitar exponer el token y errores de env var en cliente
    // encodeURIComponent is crucial so the query params (like depth) are treated as part of the endpoint string
    const endpoint = encodeURIComponent(`files/${fileKey}?depth=1`);
    const response = await fetch(`/api/figma-proxy?endpoint=${endpoint}`);

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
async function fetchHappyPathsFromFigma(fileKey, nodeId = null) {
    // Usar el proxy local
    let endpoint;

    if (nodeId) {
        // OPTIMIZATION: Fetch SPECIFIC NODE + depth
        console.log(`🎯 Fetching specific Node ID: ${nodeId}`);
        endpoint = encodeURIComponent(`files/${fileKey}/nodes?ids=${nodeId}&depth=4`);
    } else {
        // Fallback: Whole file
        console.log(`📂 Fetching whole file (Depth 4)`);
        endpoint = encodeURIComponent(`files/${fileKey}?depth=4`);
    }

    const response = await fetch(`/api/figma-proxy?endpoint=${endpoint}`);

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
    let nodesVisited = 0;

    function traverse(node, parentSection = null) {
        nodesVisited++;

        // Log structure for the first 100 nodes of interest (Sections, Frames, Instances)
        if (nodesVisited < 200) {
            if (['SECTION', 'FRAME', 'INSTANCE', 'CANVAS'].includes(node.type)) {
                console.log(`📂 [${node.type}] ${node.name} (ID: ${node.id})`);
            }
        }

        // 1. Detectar instancias del componente "Encabezados casuística"
        if (node.type === 'INSTANCE') {
            const isEncabezado = node.name &&
                (node.name.includes('Encabezados casuística') ||
                    node.name.includes('Encabezados casuistica'));

            if (isEncabezado) {
                console.log('🔍 Encontrado componente Encabezados:', node.name);

                if (node.componentProperties) {
                    console.log('   📋 Propiedades encontradas:', Object.keys(node.componentProperties));

                    // 2. Verificar si Tipo = "Happy Path" Y Pantalla = "Desktop" o "Mobile"
                    // ESTRATEGIA ESTRICTA: Solo incluir componentes que cumplan ambos criterios
                    let isHappyPath = false;
                    let isValidPlatform = false;
                    let propertyText = null;

                    for (const [key, prop] of Object.entries(node.componentProperties)) {
                        const keyLower = key.toLowerCase();
                        const valueLower = String(prop.value).toLowerCase();

                        // Debug detailed properties
                        console.log(`      🔹 [${prop.type}] ${key} = ${prop.value}`);

                        // Verificar si Tipo = "Happy Path"
                        if (keyLower.includes('tipo') || keyLower.includes('type')) {
                            if (valueLower.includes('happy path') || valueLower.includes('happy-path')) {
                                isHappyPath = true;
                                console.log('      ✅ Tipo es Happy Path');
                            }
                        }

                        // Verificar si Pantalla = "Desktop" o "Mobile"
                        if (keyLower.includes('pantalla') || keyLower.includes('screen') || keyLower.includes('device') || keyLower.includes('platform')) {
                            if (valueLower.includes('desktop') || valueLower.includes('mobile') ||
                                valueLower.includes('web') || valueLower.includes('app')) {
                                isValidPlatform = true;
                                console.log(`      ✅ Pantalla válida: ${prop.value}`);
                            }
                        }

                        // Buscar propiedades de TEXTO para usar como título
                        if (prop.type === 'TEXT') {
                            if (keyLower.includes('título') || keyLower.includes('titulo') ||
                                keyLower.includes('title') || keyLower.includes('name') ||
                                keyLower.includes('casuística') || keyLower.includes('nombre') ||
                                keyLower.includes('text') || keyLower.includes('texto') ||
                                keyLower.includes('label') || keyLower.includes('contenido') ||
                                keyLower.includes('content') || keyLower.includes('flow')) {
                                propertyText = prop.value;
                            } else if (!propertyText) {
                                propertyText = prop.value;
                            }
                        }
                    }

                    // Si no encontramos propiedades de plataforma, aceptar por defecto
                    // (retrocompatibilidad con archivos que no usan variantes de pantalla)
                    if (!isValidPlatform) {
                        // Check if there are any platform-related properties at all
                        const hasPlatformProperty = Object.keys(node.componentProperties).some(key => {
                            const k = key.toLowerCase();
                            return k.includes('pantalla') || k.includes('screen') || k.includes('device') || k.includes('platform');
                        });

                        // If no platform property exists, accept the component
                        isValidPlatform = !hasPlatformProperty;
                        if (isValidPlatform) {
                            console.log('      ℹ️ Sin propiedad de pantalla, aceptando por defecto');
                        }
                    }

                    if (isHappyPath && isValidPlatform) {
                        console.log('   ✅ Es un Happy Path válido (Desktop/Mobile)!');

                        // 3. Extraer el nombre
                        const titleText = propertyText || extractTextFromNode(node);
                        console.log('   📝 Título detectado:', titleText);

                        // 4. Determinar ID y nombre
                        // IMPORTANT: Use node.id to allow multiple Happy Paths in the same section/frame.
                        // Using parentSection.id caused duplicates to be filtered out (2 out of 8).
                        const id = node.id;
                        let name = titleText || parentSection?.name || 'Happy Path Sin Nombre';

                        // Limpiar el nombre
                        name = name.replace(/Encabezados casuística/gi, '').trim();

                        // 5. Agregar si no es duplicado
                        if (!happyPaths.find(hp => hp.id === id)) {
                            happyPaths.push({ id, name });
                        }
                    } else {
                        console.log(`   ❌ Excluido: isHappyPath=${isHappyPath}, isValidPlatform=${isValidPlatform}`);
                    }
                } else {
                    console.warn('   ⚠️ El componente no tiene properties expuestas en la API');
                }
            }
        }

        // 2. Recursividad para recorrer hijos
        if (node.children && Array.isArray(node.children)) {
            let nextParent = parentSection;
            // Actualizar el contexto si estamos en un contenedor relevante
            if (['SECTION', 'FRAME', 'CANVAS'].includes(node.type)) {
                nextParent = node;
            }

            node.children.forEach(child => traverse(child, nextParent));
        }
    }

    // Determine ROOT for traversal
    let rootNode;
    if (nodeId && data.nodes) {
        // Figma API might return keys with colons (123:456) even if we requested hyphens
        // So we just take the first node returned.
        const returnedIds = Object.keys(data.nodes);
        if (returnedIds.length > 0) {
            const firstId = returnedIds[0];
            console.log(`🔗 ID Mapping: Requested ${nodeId} -> Received ${firstId}`);
            rootNode = data.nodes[firstId].document;
        }
    } else {
        rootNode = data.document;
    }

    if (rootNode) {
        console.log('🏁 Starting Traversal on Root Node:', rootNode.name);
        traverse(rootNode);
    } else {
        console.error('❌ Root Node not found in response data', data);
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
 * Intenta obtener Happy Paths del caché local (sin consulta a API Figma)
 * Útil para la carga instantánea (Stale-While-Revalidate)
 */
export async function getCachedHappyPaths(figmaLink) {
    const fileKey = extractFileKey(figmaLink);
    if (!fileKey) return null;

    const CACHE_SCHEMA_VERSION = 'v9';

    try {
        const cached = await getCachedData(fileKey);
        if (cached && cached.schemaVersion === CACHE_SCHEMA_VERSION) {
            return cached.happyPaths;
        }
    } catch (e) {
        console.warn('Error reading cache:', e);
    }
    return null;
}

/**
 * Obtiene Happy Paths usando una URL de Figma Directamente
 */
export async function getHappyPathsFromUrl(figmaLink, forceRefresh = false) {
    const fileKey = extractFileKey(figmaLink);
    const nodeId = extractNodeId(figmaLink);

    if (!fileKey) {
        throw new Error(
            'El link de Figma no es válido. ' +
            'Debe ser del formato: https://figma.com/file/ABC123/nombre'
        );
    }

    // 2. Si no es refresh forzado, verificar caché
    // Cache Version to force invalidation on logic changes
    const CACHE_SCHEMA_VERSION = 'v9';

    if (!forceRefresh) {
        try {
            // Obtener metadata y caché en paralelo para optimizar tiempo
            const [metadata, cached] = await Promise.all([
                fetchFigmaMetadata(fileKey),
                getCachedData(fileKey)
            ]);

            // Si el caché existe, está actualizado según Figma, Y usa la versión de esquema correcta
            if (cached &&
                cached.lastModified >= metadata.lastModified &&
                cached.schemaVersion === CACHE_SCHEMA_VERSION) {
                console.log('✅ Usando caché (archivo sin cambios en Figma)');
                return cached.happyPaths;
            }

            console.log('🔄 Archivo modificado o esquema antiguo, actualizando caché...');

        } catch (metadataError) {
            console.warn('Error al verificar metadata, consultando Figma directamente:', metadataError);
        }
    }

    // 3. Archivo modificado o refresh forzado: obtener contenido completo
    const metadata = await fetchFigmaMetadata(fileKey);
    const happyPaths = await fetchHappyPathsFromFigma(fileKey, nodeId);

    // 4. Guardar en caché
    await saveCachedData(fileKey, {
        fileKey,
        fileName: metadata.name,
        happyPaths,
        lastModified: metadata.lastModified,
        lastChecked: Date.now(),
        version: metadata.version,
        schemaVersion: CACHE_SCHEMA_VERSION
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
