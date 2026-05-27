# دليل ربط الملفات المركزية — منصة رؤيا

## هيكل الملفات بعد التحديث

```
Rouya/
├── style.css            ← ✅ ملف CSS الموحّد (جديد)
├── auth.js              ← ✅ وحدة المصادقة (جديد)
├── firebase-rules.json  ← ✅ قواعد الأمان (جديد)
├── index.html
├── student_panel.html
├── teacher_panel.html
├── admin.html
├── exam.html
└── leaderboard.html
```

---

## الخطوة 1 — ربط style.css بكل صفحة

أضف هذا السطر في `<head>` لكل صفحة HTML، **قبل أي `<style>` داخلي**:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">

  <!-- ✅ الملف الموحّد أولاً -->
  <link rel="stylesheet" href="style.css">

  <style>
    /* هنا فقط الأنماط الخاصة بهذه الصفحة */
  </style>
</head>
```

---

## الخطوة 2 — استخدام auth.js في كل صفحة

### صفحة الطالب (student_panel.html)
```html
<script type="module">
  import {
    requireAuth, signOutUser, showMsg,
    setLoading, formatTime, loadNotifications,
    extractYouTubeId, db, ref, get, update, onValue
  } from './auth.js';

  // تحقق من الصلاحية وابدأ الصفحة
  requireAuth('student', {
    onSuccess: (user, userData) => {
      initStudentPanel(user, userData);
    }
  });

  function initStudentPanel(user, userData) {
    // كود الصفحة هنا...
    document.getElementById('welcomeMsg').textContent =
      'أهلاً بك يا ' + user.displayName;
  }

  // تسجيل الخروج
  window.signOutUser = () => signOutUser();
</script>
```

### صفحة المدرس (teacher_panel.html)
```html
<script type="module">
  import { requireAuth, signOutUser, showMsg, db, ref, get, set,
           push, update, remove, onValue } from './auth.js';

  requireAuth(['teacher', 'admin'], {
    onSuccess: (user, userData) => {
      initTeacherPanel(user, userData);
    }
  });
</script>
```

### صفحة الأدمن (admin.html)
```html
<script type="module">
  import { requireAuth, signOutUser, db, ref, get, update } from './auth.js';

  requireAuth(['teacher', 'admin'], {
    onSuccess: (user, userData) => {
      initAdminPanel(user, userData);
    }
  });
</script>
```

### صفحة الامتحان (exam.html)
```html
<script type="module">
  import { requireAuth, db, ref, get, update } from './auth.js';

  requireAuth('student', {
    onSuccess: (user, userData) => {
      loadExam(user, userData);
    }
  });
</script>
```

### صفحة المتصدرين (leaderboard.html)
```html
<script type="module">
  import { requireAuth, db, ref, onValue } from './auth.js';

  requireAuth(['student', 'teacher', 'admin'], {
    onSuccess: (user) => {
      loadLeaderboard();
    }
  });
</script>
```

---

## الخطوة 3 — تطبيق Firebase Security Rules

### الطريقة الأولى: من Firebase Console (الأسهل)

1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. اختر مشروعك `interactive-rouya`
3. من القائمة الجانبية: **Realtime Database** → **Rules**
4. احذف الكود الموجود والصق محتوى `firebase-rules.json`
5. اضغط **Publish**

### الطريقة الثانية: Firebase CLI

```bash
# ثبّت Firebase CLI إذا لم يكن مثبتاً
npm install -g firebase-tools

# سجّل دخول
firebase login

# في مجلد المشروع
firebase init database

# طبّق القواعد
firebase database:rules:publish --rules firebase-rules.json
```

---

## الخطوة 4 — تحديث قاعدة البيانات

بعد تطبيق القواعد، يجب تحديث بيانات المستخدمين الموجودين:

في Firebase Console → Realtime Database → Data، تأكد أن كل مستخدم له:
```json
{
  "users": {
    "USER_UID": {
      "displayName": "اسم الطالب",
      "email": "email@example.com",
      "role": "student",
      "status": "active",
      "grade": "sixth_prep",
      "createdAt": 1700000000000
    }
  }
}
```

---

## ماذا يحدث إذا نسيت ربط الملفات؟

| ما تنساه | النتيجة |
|---|---|
| `style.css` | الصفحة ستعمل لكن بدون تنسيق موحّد |
| `auth.js` (requireAuth) | الصفحة ستظل تعمل لكن بدون حماية — أي شخص يدخل! |
| Firebase Rules | الطلاب يمكنهم الكتابة على أي بيانات |

---

## ملاحظات مهمة

- `auth.js` يستخدم `type="module"` — يجب أن تكون الصفحة على **سيرفر** (localhost أو hosting) وليس `file://`
- جميع الـ `import` نسبية → الملفات يجب أن تكون في **نفس المجلد**
- بعد تطبيق القواعد، اختبر من حساب طالب أنه لا يستطيع الكتابة على `/lessons`
