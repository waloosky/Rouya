import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  push,
  onValue,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCj9UxvluAtmPVNbLHsl4blTEUA94PEOvI",
  authDomain: "interactive-rouya.firebaseapp.com",
  databaseURL: "https://interactive-rouya-default-rtdb.firebaseio.com",
  projectId: "interactive-rouya",
  storageBucket: "interactive-rouya.firebasestorage.app",
  messagingSenderId: "164882328808",
  appId: "1:164882328808:web:868e0251ae47c583a0ed5d",
  measurementId: "G-5HF2WQSSM1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
provider.addScope("email");
provider.addScope("profile");

/**
 * requireAuth — حارس المصادقة المركزي
 * @param {string|string[]} allowedRoles - دور أو مصفوفة أدوار مسموح بها
 * @param {{ onSuccess?: (user, data) => void, redirectTo?: string }} options
 */
function requireAuth(allowedRoles, options = {}) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const redirectTo = options.redirectTo || 'index.html';

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = redirectTo;
      return;
    }

    try {
      const snap = await get(ref(db, 'users/' + user.uid));

      if (!snap.exists()) {
        await signOut(auth);
        window.location.href = redirectTo;
        return;
      }

      const data = snap.val();

      // محظور أو قيد الانتظار
      if (data.status === 'pending' || data.status === 'blocked') {
        await signOut(auth);
        window.location.href = redirectTo;
        return;
      }

      // دور غير مسموح به
      if (!roles.includes(data.role)) {
        // توجيه حسب الدور الحقيقي
        if (data.role === 'admin') window.location.href = 'admin.html';
        else if (data.role === 'teacher') window.location.href = 'teacher_panel.html';
        else window.location.href = 'student_panel.html';
        return;
      }

      // ✅ كل شيء صحيح
      if (typeof options.onSuccess === 'function') {
        options.onSuccess(user, data);
      }
    } catch (err) {
      console.error('requireAuth error:', err);
      window.location.href = redirectTo;
    }
  });
}

/**
 * signOutUser — تسجيل الخروج مع التوجيه
 * @param {string} redirectTo
 */
async function signOutUser(redirectTo = 'index.html') {
  await signOut(auth);
  window.location.href = redirectTo;
}

export {
  auth,
  db,
  ref,
  set,
  get,
  update,
  remove,
  push,
  onValue,
  query,
  orderByChild,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  provider,
  updateProfile,
  onAuthStateChanged,
  signOut,
  requireAuth,
  signOutUser
};
