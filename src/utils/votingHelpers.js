import firebase from './firebase';

const FACILITATOR_EMAIL = 'jantonio@prestamype.com';

// Caracteres sin confusión visual (sin 0, O, I, 1, L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Verifica si un email es el facilitador
 */
export function isFacilitator(email) {
    return email === FACILITATOR_EMAIL;
}

/**
 * Genera un hash corto aleatorio
 */
function generateShortHash(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
    }
    return result;
}

/**
 * Genera un código de sesión basado en fecha + hash aleatorio
 * Formato: DDMMMXXX (ej: 05FEBA7X, 12MARP3L)
 */
export function generateSessionCode(date) {
    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const month = months[d.getMonth()];
    const random = generateShortHash(3);

    return `${day}${month}${random}`;
}

/**
 * Crea un código único verificando en Firestore que no exista
 */
export async function createUniqueSessionCode(date) {
    const db = firebase.firestore();
    let code = generateSessionCode(date);
    let attempts = 0;

    while (attempts < 5) {
        const docRef = db.collection('live_sessions').doc(code);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return code;
        }

        code = generateSessionCode(date);
        attempts++;
    }

    // Fallback: añadir timestamp parcial
    return `${code}${Date.now().toString().slice(-2)}`;
}

/**
 * Obtiene la fecha de Perú en formato YYYY-MM-DD
 */
export function getPeruDateStr(date) {
    const d = date || new Date();
    const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('en-CA', options).format(d);
}

/**
 * Obtiene el día de la semana en zona horaria de Perú
 */
function getPeruDayOfWeek(date) {
    const d = date || new Date();
    const peruStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima',
        weekday: 'short'
    }).format(d);

    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    return dayMap[peruStr] || 0;
}

/**
 * Añade N días a una fecha (respetando zona Perú)
 */
function addDays(dateStr, days) {
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Determina la próxima fecha disponible para agendar
 * Si la sesión está cerrada, retorna mañana o lunes (si viernes)
 */
export function getNextAvailableDate(sessionClosed) {
    const todayStr = getPeruDateStr();
    const dayOfWeek = getPeruDayOfWeek();

    if (!sessionClosed) {
        return {
            date: todayStr,
            label: 'Agendar hoy',
            labelShort: 'Hoy'
        };
    }

    // Sesión cerrada: siguiente día hábil
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        // Lunes a Jueves → mañana
        return {
            date: addDays(todayStr, 1),
            label: 'Agendar mañana',
            labelShort: 'Mañana'
        };
    }

    // Viernes, Sábado o Domingo → siguiente lunes
    const daysToMonday = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : 1;
    return {
        date: addDays(todayStr, daysToMonday),
        label: 'Agendar el lunes',
        labelShort: 'Lunes'
    };
}

/**
 * Reproduce sonido de notificación
 */
export function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = 880; // La5
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.5);

        // Vibración en móviles
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    } catch (e) {
        // Silenciar errores de audio
    }
}
