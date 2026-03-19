import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local if running from a script (not in Next.js runtime)
if (!process.env.NEXT_RUNTIME) {
  dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });
}

let app: App;

// Initialize Firebase Admin SDK (server-side only)
if (!getApps().length) {
  let serviceAccount: any;

  // Option 1: Use service account JSON file path (for development)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
  }
  // Option 2: Use service account JSON string (for Vercel)
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // Option 3: Use individual environment variables (for production)
  else {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    // The private key often comes from env vars with:
    // - escaped newlines (`\n`)
    // - wrapped quotes (`"-----BEGIN ..."`), depending on how it was set
    // Both will break PEM decoding if not normalized.
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Missing FIREBASE_ADMIN_PRIVATE_KEY in your environment.');
    }

    privateKey = privateKey.trim();

    // Remove wrapping quotes if present (common when pasting into env var UI)
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1).trim();
    }

    // Support both escaped `\n` and real newlines / Windows `\r\n`
    privateKey = privateKey.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    privateKey = privateKey.replace(/\r\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin credentials. Please set FIREBASE_ADMIN_PROJECT_ID, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your .env.local file.'
      );
    }

    serviceAccount = {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || serviceAccount.project_id,
  });
} else {
  app = getApps()[0];
}

// Export Firebase Admin services
export const auth = getAuth(app);
export const db = getFirestore(app);

export const adminApp = app;

export default app;
