import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export const initializeFirebaseApp = () => {
  if (app) return app;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_DATABASE_URL } = process.env;

  // Prefer explicit service-account fields when present; otherwise fall back to ADC via GOOGLE_APPLICATION_CREDENTIALS.
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const serviceAccount = {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: FIREBASE_DATABASE_URL
    });
  } else if (GOOGLE_APPLICATION_CREDENTIALS) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: FIREBASE_DATABASE_URL
    });
  } else {
    throw new Error('Missing Firebase environment variables (set FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS).');
  }

  return app;
};

export const firestore = () => {
  if (!app) {
    initializeFirebaseApp();
  }
  return admin.firestore();
};

export const auth = () => {
  if (!app) {
    initializeFirebaseApp();
  }
  return admin.auth();
};
