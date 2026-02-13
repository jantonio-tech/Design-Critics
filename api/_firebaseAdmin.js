// Firebase Admin SDK initialization for Vercel Serverless Functions
// Requires FIREBASE_SERVICE_ACCOUNT env variable with the service account JSON

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
    if (getApps().length === 0) {
        const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
        );

        initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || 'dc-tracker-prestamype'
        });
    }

    return getFirestore();
}

export default getFirebaseAdmin;
