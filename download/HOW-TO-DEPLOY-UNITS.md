# كيفية نشر ميزة الوحدات على Vercel

## الوضع الحالي
- ✓ كود ميزة الوحدات موجود ومكتمل محلياً (16 commits)
- ✓ قاعدة البيانات الإنتاجية تحتوي على جدول Unit (تمت الهجرة بنجاح)
- ✗ التعديلات لم تُنشر على GitHub/Vercel (توكين GitHub منتهي)

## الطريقة 1: تزويد VERCEL_TOKEN (الأسرع)
1. اذهب إلى: https://vercel.com/account/tokens
2. أنشئ token جديد (اسمه مثلاً "deploy")
3. أرسل التوكين لي في رسالة جديدة
4. سأقوم بـ: `vercel deploy --prod --token=YOUR_TOKEN`

## الطريقة 2: تزويد GitHub PAT
1. اذهب إلى: https://github.com/settings/tokens
2. أنشئ Personal Access Token (classic) مع صلاحية `repo`
3. أرسل التوكين لي وسأقوم بـ:
   ```
   git remote set-url origin https://NIZARMASSIST:YOUR_PAT@github.com/NIZARMASSIST/wedding-decor.git
   git push origin main
   ```
4. Vercel سيقوم بالنشر تلقائياً بعد الـ push

## الطريقة 3: نشر يدوي من جهازك
1. استخرج ملف `units-feature.zip` 
2. انسخ الملفات إلى مشروعك المحلي:
   - `units-api/route.ts` → `src/app/api/units/route.ts`
   - `db-migrate-units/route.ts` → `src/app/api/db-migrate-units/route.ts`
   - `items-route.ts` → `src/app/api/items/route.ts`
   - `projects-route.ts` → `src/app/api/projects/route.ts`
   - `schema.prisma` → `prisma/schema.prisma`
   - `page.tsx` → `src/app/page.tsx`
3. git add, commit, push إلى GitHub
4. Vercel سينشر تلقائياً

## بعد النشر
- تبويب "الوحدات" سيظهر في الصفحة الرئيسية بين "المشاريع" و "المواد"
- قاعدة البيانات جاهزة (الجدول Unit موجود)
- البيانات الموجودة محفوظة 100% (لن تتأثر)
