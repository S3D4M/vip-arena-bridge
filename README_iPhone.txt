تشغيل الجسر من الآيفون فقط (بدون كمبيوتر) — استضافة مجانية على Render
=====================================================================
الفكرة: الجسر يشتغل على سيرفر في الإنترنت (مو على جوالك)، وأنت تفتح رابط اللعبة في Safari.

الخطوة 1 — فك الضغط
  افتح الملف vip-arena-bridge.zip من تطبيق "الملفات" واضغط عليه ليتفك.

الخطوة 2 — GitHub (مرة وحدة)
  1) من Safari افتح github.com وأنشئ حساب مجاني.
  2) New repository ← اسمه vip-arena ← Public ← Create.
  3) اضغط "uploading an existing file" ثم اختر 3 ملفات من المجلد المفكوك:
       server.js  و  package.json  و  game.html
     ثم Commit changes.

الخطوة 3 — Render (مجاني بدون بطاقة)
  1) افتح render.com ← Sign up بحساب GitHub.
  2) New ← Web Service ← اختر مستودع vip-arena.
  3) الإعدادات:
       Build Command :  npm install
       Start Command :  node server.js
       Instance Type :  Free
  4) Environment Variables (أضف):
       CONTROL_KEY = اكتب رمز سري تختاره (أحرف وأرقام)
       TIKTOK_USER = prnk911        (اختياري، هذا الافتراضي)
  5) Create Web Service وانتظر دقائق حتى تشوف Live.

الخطوة 4 — الروابط
  اللعبة :  https://اسم-خدمتك.onrender.com/
  التحكم :  https://اسم-خدمتك.onrender.com/#control=رمزك_السري
  فحص سريع:  https://اسم-خدمتك.onrender.com/health   (يعرض هل الجسر متصل بتيك توك)

الخطوة 5 — لا تخليه ينام
  الخطة المجانية تنام بعد ~15 دقيقة بدون زيارات وتحتاج دقيقة لتصحى.
  سجّل في uptimerobot.com (مجاني) وأضف Monitor من نوع HTTP على رابط /health كل 5 دقائق.
  وافتح رابط اللعبة قبل البث بدقيقتين.

وقت البث
  1) ابدأ LIVE من تيك توك على prnk911 (بث شاشة الجوال).
  2) افتح رابط اللعبة في Safari — المؤشر فوق يصير أخضر "متصل".
  3) لوحة التحكم اختيارية: تحتاج جهاز ثاني، لأن تبويب اللعبة يتوقف إذا تركته في الخلفية.

تنبيه مهم
  - ما قدرت أختبر الاتصال بتيك توك من سيرفر استضافة. تيك توك أحياناً يحدّ اتصالات السيرفرات
    (عكس الاتصال من البيت). إذا /health يعرض tiktokConnected=false وأنت ببث فعلاً، أضف مفتاح
    مجاني من eulerstream.com باسم EULER_API_KEY في Render، وإذا ما نفع قلي نغيّر الطريقة.
