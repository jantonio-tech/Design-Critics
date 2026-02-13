// Vercel Cron Job - Crear sesión de sala automática a las 2:20pm Lima (L-V)
// Schedule: "20 19 * * 1-5" (19:20 UTC = 14:20 Lima UTC-5)

import getFirebaseAdmin from './_firebaseAdmin.js';

// Caracteres sin confusión visual (sin 0, O, I, 1, L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateShortHash(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
    }
    return result;
}

function generateSessionCode(date) {
    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const month = months[d.getMonth()];
    const random = generateShortHash(3);
    return `${day}${month}${random}`;
}

function getPeruDateStr() {
    const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('en-CA', options).format(new Date());
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verificar que es una llamada del cron de Vercel o autorizada
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    // En producción, verificar el secret del cron
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const db = getFirebaseAdmin();
        const todayStr = getPeruDateStr();

        console.log(`[Cron] Checking sessions for ${todayStr}...`);

        // 1. Verificar si ya existe una live_session para hoy
        const existingSession = await db.collection('live_sessions')
            .where('date', '==', todayStr)
            .limit(1)
            .get();

        if (!existingSession.empty) {
            console.log('[Cron] Session already exists for today, skipping.');
            return res.status(200).json({
                success: true,
                action: 'skipped',
                message: 'Ya existe una sesión para hoy'
            });
        }

        // 2. Verificar si hay critics_sessions agendadas para hoy
        const todaySessions = await db.collection('critics_sessions')
            .where('fecha_dc', '==', todayStr)
            .where('estado', '==', 'activo')
            .get();

        if (todaySessions.empty) {
            console.log('[Cron] No sessions scheduled for today.');
            return res.status(200).json({
                success: true,
                action: 'no_sessions',
                message: 'No hay presentaciones agendadas para hoy'
            });
        }

        // 3. Generar código único
        let code = generateSessionCode(new Date());
        let attempts = 0;
        while (attempts < 5) {
            const docRef = await db.collection('live_sessions').doc(code).get();
            if (!docRef.exists) break;
            code = generateSessionCode(new Date());
            attempts++;
        }

        // 4. Crear la sesión en estado 'waiting'
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 8);

        const sessionData = {
            code,
            date: todayStr,
            createdAt: new Date(),
            expiresAt,
            status: 'waiting',
            facilitator: 'jantonio@prestamype.com',
            connectedUsers: [],
            votes: [],
            summary: null,
            currentVotingCriticId: null,
            autoCreated: true
        };

        await db.collection('live_sessions').doc(code).set(sessionData);

        console.log(`[Cron] Session created: ${code} with ${todaySessions.size} presentations.`);

        return res.status(200).json({
            success: true,
            action: 'created',
            code,
            presentations: todaySessions.size,
            message: `Sala creada con código ${code}`
        });

    } catch (error) {
        console.error('[Cron] Error:', error.message);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
