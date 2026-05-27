/**
 * ═══════════════════════════════════════════════════════════════
 * auth.js — وحدة المصادقة المركزية لمنصة رؤيا التعليمية
 * الإصدار: 2.0
 *
 * يُصدّر هذا الملف:
 *   - app, auth, db          ← كائنات Firebase الأساسية
 *   - requireAuth(role)      ← تحقق من الصلاحية وأعد توجيه
 *   - signOutUser()          ← تسجيل خروج آمن
 *   - getUserData(uid)       ← جلب بيانات المستخدم
 *   - showMsg / clearMsg     ← دوال مساعدة للرسائل
 *   - setLoading             ← تعطيل/تفعيل زر أثناء العملية
 *   - friendlyError          ← تحويل أكواد الأخطاء لرسائل واضحة
 *   - formatTime             ← تنسيق الوقت بالعربية
 * ═══════════════════════════════════════════════════════════════
 */

/* ── استيراد Firebase ─────────────────────────────────────── */
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";


/* ══════════════════════════════════════════════════════════════
   إعداد Firebase — ملف واحد، مكان واحد
   ══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "AIzaSyCj9UxvluAtmPVNbLHsl4blTEUA94PEOvI",
  authDomain:        "interactive-rouya.firebaseapp.com",
  projectId:         "interactive-rouya",
  storageBucket:     "interactive-rouya.firebasestorage.app",
  messagingSenderId: "164882328808",
  appId:             "1:164882328808:web:868e0251ae47c583a0ed5d",
  databaseURL:       "https://interactive-rouya-default-rtdb.firebaseio.com"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

/* إعادة تصدير دوال Firebase لاستخدامها في الملفات الأخرى */
export {
  ref, get, set, update, push, remove, onValue, query, orderByChild,
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, updateProfile, signOut
};

const provider = new GoogleAuthProvider();
export { provider };


/* ══════════════════════════════════════════════════════════════
   جلب بيانات المستخدم
   ══════════════════════════════════════════════════════════════ */

/**
 * يجلب بيانات المستخدم من قاعدة البيانات
 * @param {string} uid - معرّف المستخدم
 * @returns {Promise<object|null>} بيانات المستخدم أو null
 */
export async function getUserData(uid) {
  try {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error('[auth.js] getUserData error:', e);
    return null;
  }
}


/* ══════════════════════════════════════════════════════════════
   التحقق من الصلاحية وإعادة التوجيه
   ══════════════════════════════════════════════════════════════ */

/**
 * يتحقق من أن المستخدم مسجّل دخول وله الصلاحية المطلوبة.
 * يُستخدم في بداية كل صفحة محمية.
 *
 * @param {string|string[]} allowedRoles
 *   الدور أو الأدوار المسموح بها:
 *   'student' | 'teacher' | 'admin' | ['teacher','admin']
 *
 * @param {object} [options]
 * @param {string} [options.onUnauth='index.html']
 *   الصفحة التي يُعاد التوجيه إليها عند غياب التوثيق
 * @param {function} [options.onSuccess]
 *   callback يُستدعى بعد التحقق الناجح، يستقبل (user, userData)
 *
 * @returns {Promise<void>}
 *
 * ─── مثال الاستخدام ─────────────────────────────────────────
 * import { requireAuth } from './auth.js';
 *
 * // في student_panel.html:
 * requireAuth('student', {
 *   onSuccess: (user, data) => {
 *     initStudentPanel(user, data);
 *   }
 * });
 *
 * // في teacher_panel.html (السماح للمدرس والأدمن):
 * requireAuth(['teacher', 'admin'], {
 *   onSuccess: (user, data) => {
 *     initTeacherPanel(user, data);
 *   }
 * });
 * ─────────────────────────────────────────────────────────── */
export function requireAuth(allowedRoles, options = {}) {
  const {
    onUnauth = 'index.html',
    onSuccess = null
  } = options;

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  onAuthStateChanged(auth, async (user) => {

    /* غير مسجّل دخول */
    if (!user) {
      window.location.href = onUnauth;
      return;
    }

    const data = await getUserData(user.uid);

    /* المستخدم غير موجود في قاعدة البيانات */
    if (!data) {
      await signOut(auth);
      window.location.href = onUnauth;
      return;
    }

    /* الحساب قيد المراجعة */
    if (data.status === 'pending') {
      await signOut(auth);
      /* إذا كنا في صفحة اللوغن، أظهر رسالة، وإلا أعد توجيه */
      if (!window.location.pathname.endsWith('index.html') &&
          window.location.pathname !== '/') {
        window.location.href = onUnauth;
      }
      return;
    }

    /* الصلاحية غير كافية */
    if (!roles.includes(data.role)) {
      await signOut(auth);
      window.location.href = onUnauth;
      return;
    }

    /* ✅ كل شيء صحيح — نفّذ الـ callback */
    if (typeof onSuccess === 'function') {
      onSuccess(user, data);
    }
  });
}


/* ══════════════════════════════════════════════════════════════
   تسجيل الخروج
   ══════════════════════════════════════════════════════════════ */

/**
 * يُسجّل خروج المستخدم ويُعيد توجيهه لصفحة الدخول.
 * @param {string} [redirect='index.html']
 */
export async function signOutUser(redirect = 'index.html') {
  try {
    await signOut(auth);
    window.location.href = redirect;
  } catch (e) {
    console.error('[auth.js] signOut error:', e);
  }
}


/* ══════════════════════════════════════════════════════════════
   رسائل الحالة في واجهة المستخدم
   ══════════════════════════════════════════════════════════════ */

/**
 * يعرض رسالة حالة مع لون مناسب.
 * @param {string} text       - نص الرسالة
 * @param {'error'|'success'|'warning'|'info'} type - نوع الرسالة
 * @param {string} [elementId='statusMsg'] - معرّف عنصر العرض
 */
export function showMsg(text, type, elementId = 'statusMsg') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `msg msg-${type}`;
  /* إزالة تلقائية بعد 6 ثواني للرسائل الناجحة */
  if (type === 'success') {
    setTimeout(() => clearMsg(elementId), 6000);
  }
}

/**
 * يخفي رسالة الحالة.
 * @param {string} [elementId='statusMsg']
 */
export function clearMsg(elementId = 'statusMsg') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'msg';
  el.textContent = '';
}


/* ══════════════════════════════════════════════════════════════
   إدارة حالة تحميل الأزرار
   ══════════════════════════════════════════════════════════════ */

/**
 * يُعطّل/يُفعّل زراً أثناء العمليات غير المتزامنة.
 * @param {string} id   - معرّف الزر
 * @param {boolean} v   - true = تحميل (معطّل)، false = عادي
 * @param {string} [loadingText] - نص أثناء التحميل (اختياري)
 */
export function setLoading(id, v, loadingText = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.disabled = v;
  el.style.opacity = v ? '0.55' : '1';
  if (loadingText && el._originalText === undefined) {
    el._originalText = el.textContent;
  }
  if (v && loadingText) {
    el.textContent = loadingText;
  } else if (!v && el._originalText !== undefined) {
    el.textContent = el._originalText;
    delete el._originalText;
  }
}


/* ══════════════════════════════════════════════════════════════
   تحويل أكواد الأخطاء إلى رسائل واضحة
   ══════════════════════════════════════════════════════════════ */

const ERROR_MAP = {
  'auth/email-already-in-use': ['هذا البريد مسجّل مسبقاً', 'Email already registered'],
  'auth/invalid-email':        ['البريد الإلكتروني غير صحيح', 'Invalid email address'],
  'auth/wrong-password':       ['كلمة المرور غير صحيحة', 'Wrong password'],
  'auth/user-not-found':       ['لا يوجد حساب بهذا البريد', 'No account found'],
  'auth/weak-password':        ['كلمة المرور ضعيفة جداً (6 أحرف على الأقل)', 'Password too weak (min 6 chars)'],
  'auth/popup-closed-by-user': ['أُغلقت نافذة Google', 'Google popup was closed'],
  'auth/invalid-credential':   ['بيانات الدخول غير صحيحة', 'Invalid credentials'],
  'auth/too-many-requests':    ['محاولات كثيرة، انتظر قليلاً', 'Too many attempts, please wait'],
  'auth/network-request-failed': ['خطأ في الاتصال بالإنترنت', 'Network error, check connection'],
  'auth/user-disabled':        ['هذا الحساب موقوف', 'This account has been disabled'],
};

/**
 * يُعيد رسالة خطأ واضحة بناءً على كود Firebase.
 * @param {string} code - كود الخطأ من Firebase
 * @param {boolean} [arabic=true] - لغة الرسالة
 * @returns {string}
 */
export function friendlyError(code, arabic = true) {
  const entry = ERROR_MAP[code];
  if (entry) return arabic ? entry[0] : entry[1];
  return arabic ? 'حدث خطأ، حاول مجدداً' : 'An error occurred, try again';
}


/* ══════════════════════════════════════════════════════════════
   تنسيق الوقت بالعربية
   ══════════════════════════════════════════════════════════════ */

/**
 * يُحوّل timestamp إلى نص نسبي بالعربية.
 * @param {number} ts - timestamp بالمللي ثانية
 * @returns {string} مثل: "الآن" | "منذ 5 دقائق" | "منذ 3 أيام"
 */
export function formatTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000); // بالثواني
  if (diff < 60)   return 'الآن';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `منذ ${m} ${m === 1 ? 'دقيقة' : 'دقائق'}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `منذ ${h} ${h === 1 ? 'ساعة' : 'ساعات'}`;
  }
  const d = Math.floor(diff / 86400);
  return `منذ ${d} ${d === 1 ? 'يوم' : 'أيام'}`;
}


/* ══════════════════════════════════════════════════════════════
   إنشاء جزيئات الخلفية (Scene Particles)
   ══════════════════════════════════════════════════════════════ */

/**
 * يُنشئ جزيئات الخلفية المتطايرة.
 * @param {string} containerId - معرّف عنصر الحاوية
 * @param {number} [count=24] - عدد الجزيئات
 */
export function initParticles(containerId = 'sceneParticles', count = 24) {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${7 + Math.random() * 11}s;
      animation-delay: ${Math.random() * 9}s;
      width: ${1 + Math.random() * 2}px;
      height: ${1 + Math.random() * 2}px;
      background: ${Math.random() > 0.5 ? '#00e5ff' : '#ffab00'};
    `;
    container.appendChild(p);
  }
}


/* ══════════════════════════════════════════════════════════════
   إشعارات الطالب
   ══════════════════════════════════════════════════════════════ */

/**
 * يُحمّل إشعارات المستخدم ويعرضها في اللوحة.
 * @param {string} uid - معرّف المستخدم
 * @param {object} elements - { list, badge }
 */
export function loadNotifications(uid, elements) {
  const { list, badge } = elements;
  if (!list || !badge) return;

  onValue(ref(db, `notifications/${uid}`), (snap) => {
    if (!snap.exists()) {
      list.innerHTML = '<div class="notif-empty">لا توجد إشعارات جديدة</div>';
      return;
    }
    const data     = snap.val();
    const lastSeen = data.lastSeen?.ts || 0;
    const items    = data.items || {};
    const sorted   = Object.entries(items).sort((a, b) => b[1].ts - a[1].ts);

    let unread = 0;
    list.innerHTML = sorted.map(([, n]) => {
      const isUnread = n.ts > lastSeen;
      if (isUnread) unread++;
      return `
        <div class="notif-item ${isUnread ? 'unread' : ''}">
          <div class="notif-item-title">${n.icon || '📢'} ${n.title}</div>
          <div class="notif-item-body">${n.body}</div>
          <div class="notif-item-time">${formatTime(n.ts)}</div>
        </div>`;
    }).join('');

    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  });
}


/* ══════════════════════════════════════════════════════════════
   دالة مساعدة: استخراج معرّف يوتيوب
   ══════════════════════════════════════════════════════════════ */

/**
 * يستخرج معرّف الفيديو من أي رابط YouTube.
 * @param {string} url
 * @returns {string|null}
 */
export function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
