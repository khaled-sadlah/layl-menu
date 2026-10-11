# مشروع ليل — نسخة مع تحديث الصور

هذه نسخة الكود القابلة للتعديل، وتشمل صورًا منفصلة من الإنترنت للأصناف الـ128. ملفات الصور محفوظة داخل المشروع ومربوطة بالمنيو. تم فحص بناء نسخة Netlify بنجاح. تحديث الصور في هذا الملف لم يُنشر على الموقع العام ضمن تجهيز هذا التنزيل.

## التشغيل على جهازك

1. ثبّت Node.js 22.13 أو أحدث وافتَح مجلد المشروع في VS Code.
2. افتح Terminal داخل المجلد ونفّذ:

```bash
npm install -g pnpm
pnpm install --frozen-lockfile
pnpm exec vite --config vite.netlify.config.ts
```

افتح الرابط الذي يظهر في الطرفية لمعاينة الواجهة. تشغيل Vite وحده يعرض الواجهة؛ الطلبات وتسجيل دخول الكاشير تحتاج وظائف Netlify.

## تشغيل الطلبات والكاشير محليًا

انسخ `.env.example` إلى `.env` وضع:

```env
STAFF_PASSWORD=Admin
```

ثم شغّل:

```bash
npx netlify dev --command "pnpm exec vite --config vite.netlify.config.ts --host 127.0.0.1" --target-port 5173 --port 8888
```

صفحة الطلبات: `http://localhost:8888/?table=1`

الكاشير: `http://localhost:8888/cashier`

بطاقات الطاولات: `http://localhost:8888/tables`

التحديث التلقائي كل 10 ثوانٍ. كلمة المرور تُقرأ من متغير `STAFF_PASSWORD` في الخادم. لا يتضمن الملف بيانات الطلبات الحية أو بيانات الدخول لحساب الاستضافة. تشغيل Netlify محليًا لم يُختبر ضمن تجهيز هذا الملف.

## البناء والنشر

```bash
pnpm run build:netlify
```

مجلد الإخراج: `netlify-dist`. إعدادات النشر في `netlify.toml`، ووظائف الخادم في `netlify/functions`. نشر مجلد الواجهة وحده لا يكفي لتشغيل الطلبات؛ انشر المشروع مع الوظائف واضبط `STAFF_PASSWORD` في Netlify.

## أماكن التعديل

- الأسماء والأسعار: `lib/menu.ts`.
- ربط صور الأصناف: `lib/item-images.json`.
- الصور الجديدة: `public/images/web-menu`.
- مصادر الصور: `lib/photo-sources.json`؛ صور توضيحية من الويب وليست تصويرًا لأطباق المطعم نفسه.
- واجهة الزبون: `app/menu-app.tsx`.
- شاشة الكاشير: `app/cashier/page.tsx`.
- تنسيق الصفحات: `app/globals.css`.

الملفات الخاصة بالنسخة السابقة من البنية محفوظة مع المصدر، لكن أوامر Netlify أعلاه هي الخاصة بالنسخة الحالية.
