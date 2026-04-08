// Firestore scaffolding for the future. Kept separate so the app remains static-friendly on GitHub Pages.

export const firebaseConfig = {
  apiKey: 'AIzaSyCo7kj93Gri9OxQW7gRFZ3zxIRvEzRHHOs',
  authDomain: 'perodictablepalace.firebaseapp.com',
  projectId: 'perodictablepalace',
  storageBucket: 'perodictablepalace.firebasestorage.app',
  messagingSenderId: '681228979738',
  appId: '1:681228979738:web:ddffa7c9cb0e3445098ba3',
  measurementId: 'G-ZV75TTS3TN'
};

export function futureFirestoreNotes() {
  return `
// Future Firestore entry point
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
// Add auth here when you decide the sign-in flow.

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function loadRemoteState(uid) {
  const ref = doc(db, 'users', uid, 'memory', 'periodic-table-palace');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveRemoteState(uid, payload) {
  const ref = doc(db, 'users', uid, 'memory', 'periodic-table-palace');
  await setDoc(ref, payload, { merge: true });
}

// Info still needed from you:
// 1. Which auth method should the app use?
// 2. Should multiple family members share a single palace or have separate profiles?
// 3. Do you want cloud sync to happen automatically or only when a sync button is tapped?
`.trim();
}
