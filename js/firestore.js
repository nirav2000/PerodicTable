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
  return `import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const google = new GoogleAuthProvider();

export async function ensureAnonymousSession() {
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

export async function upgradeToGoogle() {
  const user = await ensureAnonymousSession();
  return user.isAnonymous ? linkWithPopup(user, google) : signInWithPopup(auth, google);
}

// Shared family model
// households/{householdId}
// households/{householdId}/profiles/{profileId}
// households/{householdId}/profiles/{profileId}/snapshots/{timestamp}

export async function saveHouseholdState(householdId, profileId, payload) {
  await setDoc(doc(db, 'households', householdId), {
    app: 'periodic-table-palace',
    updatedAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'households', householdId, 'profiles', profileId), {
    ...payload,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function loadHouseholdState(householdId, profileId) {
  const snap = await getDoc(doc(db, 'households', householdId, 'profiles', profileId));
  return snap.exists() ? snap.data() : null;
}`;
}

export function getFirestoreRequirements() {
  return [
    'Enable Anonymous authentication in Firebase Auth.',
    'Enable Google as a sign-in provider in Firebase Auth.',
    'Create Firestore security rules for households and profiles.',
    'Decide whether one household id is created by invitation code or manually entered.',
    'Decide whether quiz scores sync automatically or only after pressing Sync.'
  ];
}
