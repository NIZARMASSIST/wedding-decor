# دليل نشر ميزة الوحدات

## ✅ الميزة جاهزة ومُختبرة محلياً

تم اختبار الميزة محلياً وتعمل بشكل كامل:
- تبويب "الوحدات" يظهر بين "المشاريع" و "المواد"
- يمكن إنشاء وحدات جديدة وربطها بالمشاريع
- تم إنشاء وحدات تجريبية بنجاح (وحدة المدخل، وحدة المسرح)

انظر لقطة الشاشة: `units-tab-with-data.png`

## ❓ لماذا لا تظهر في الإنتاج؟

التعديلات (16 commits) لم تُنشر على GitHub/Vercel لأن توكين GitHub منتهي الصلاحية.

## 🔧 الحل - اختر طريقة واحدة

### الطريقة 1: تزويد GitHub PAT (الأبسط)
1. اذهب إلى: https://github.com/settings/tokens
2. أنشئ Personal Access Token (classic) مع صلاحية `repo`
3. أرسل التوكين لي وسأقوم بـ:
   ```
   git remote set-url origin https://NIZARMASSIST:YOUR_PAT@github.com/NIZARMASSIST/wedding-decor.git
   git push origin main
   ```
4. Vercel سينشر التعديلات تلقائياً خلال 2-3 دقائق

### الطريقة 2: تزويد VERCEL_TOKEN
1. اذهب إلى: https://vercel.com/account/tokens
2. أنشئ token جديد
3. أرسله لي وسأنشر مباشرة بـ `vercel deploy --prod --token=...`

### الطريقة 3: نشر يدوي من جهازك
1. استخرج `units-feature.zip` على جهازك
2. انسخ الملفات إلى مشروعك المحلي:
   - `units-api/route.ts` → `src/app/api/units/route.ts`
   - `db-migrate-units/route.ts` → `src/app/api/db-migrate-units/route.ts`
   - `items-route.ts` → `src/app/api/items/route.ts`
   - `projects-route.ts` → `src/app/api/projects/route.ts`
   - `schema.prisma` → `prisma/schema.prisma`
   - `page.tsx` → `src/app/page.tsx`
3. git add, commit, push إلى GitHub
4. Vercel سينشر تلقائياً

## 📋 ما الذي تم إضافته؟

- **API جديد**: `/api/units` (GET/POST/PUT/DELETE)
- **API هجرة**: `/api/db-migrate-units` (تم تشغيله على الإنتاج بالفعل)
- **تبويب جديد**: "الوحدات" في الصفحة الرئيسية
- **نموذج بيانات جديد**: Unit مرتبط بـ Project + ProductionItem
- **لا توجد تغييرات على البيانات الموجودة** - كل التعديلات إضافية فقط

## ✅ بعد النشر

بعد النشر، اذهب إلى https://my-project-tau-hazel.vercel.app
1. سجل الدخول بحساب مدير (yahya@gulfcolours.com / 2125)
2. انقر تبويب "الوحدات"
3. اختر مشروع من القائمة المنسدلة
4. انقر "إضافة وحدة" لإنشاء وحدة جديدة
5. اربط العناصر بالوحدة من نافذة "ربط عنصر"
