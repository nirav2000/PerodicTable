export const firebaseConfig = {
  apiKey: 'AIzaSyCo7kj93Gri9OxQW7gRFZ3zxIRvEzRHHOs',
  authDomain: 'perodictablepalace.firebaseapp.com',
  projectId: 'perodictablepalace',
  storageBucket: 'perodictablepalace.firebasestorage.app',
  messagingSenderId: '681228979738',
  appId: '1:681228979738:web:ddffa7c9cb0e3445098ba3',
  measurementId: 'G-ZV75TTS3TN'
};

let auth;
let db;
let initialized = false;

export async function initFirebaseAuth(onStatus) {
  if (initialized) return { auth, db };
  const [{ initializeApp }, { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, linkWithPopup, signOut }, { getFirestore, doc, getDoc, setDoc, serverTimestamp }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js')
  ]);

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  initialized = true;

  const provider = new GoogleAuthProvider();

  async function ensureAnonymous() {
    if (!auth.currentUser) await signInAnonymously(auth);
  }

  async function upgradeToGoogle() {
    if (!auth.currentUser) {
      await signInWithPopup(auth, provider);
      return;
    }
    if (auth.currentUser.isAnonymous) {
      await linkWithPopup(auth.currentUser, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  }

  async function saveSharedState(householdId, profileId, payload) {
    if (!db || !auth.currentUser) return;
    const householdRef = doc(db, 'households', householdId);
    const profileRef = doc(db, 'households', householdId, 'profiles', profileId);
    await setDoc(householdRef, {
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
      app: 'periodic-table-palace'
    }, { merge: true });
    await setDoc(profileRef, {
      ...payload,
      updatedAt: serverTimestamp(),
      ownerUid: auth.currentUser.uid
    }, { merge: true });
  }

  async function loadSharedState(householdId, profileId) {
    if (!db) return null;
    const profileRef = doc(db, 'households', householdId, 'profiles', profileId);
    const snap = await getDoc(profileRef);
    return snap.exists() ? snap.data() : null;
  }

  onAuthStateChanged(auth, (user) => {
    onStatus?.({
      uid: user?.uid || null,
      isAnonymous: !!user?.isAnonymous,
      provider: user?.providerData?.[0]?.providerId || 'anonymous',
      displayName: user?.displayName || 'Anonymous learner',
      ensureAnonymous,
      upgradeToGoogle,
      signOut: () => signOut(auth),
      saveSharedState,
      loadSharedState
    });
  });

  await ensureAnonymous();
  return { auth, db };
}

export function firestoreSetupSummary() {
  return [
    'Firebase ready.',
    'Auth flow: anonymous by default, optional Google upgrade.',
    'Data model: households/{householdId}/profiles/{profileId}.',
    'Suggested rules: allow read/write only for authenticated users who know the household id, or tighten further with household membership documents.',
    'Still needed later: preferred household invitation flow.'
  ].join('\n');
}
