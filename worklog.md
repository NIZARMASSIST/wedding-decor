---
Task ID: 1
Agent: Main Agent
Task: Add new project fields - projectDate, location, recipient, executiveManager, execution dates, notesAuthor

Work Log:
- Cloned repo from https://github.com/NIZARMASSIST/wedding-decor
- Updated Prisma schema with new fields: projectDate, location, recipient, executiveManager, notesAuthor
- Updated API route (POST/PUT) for projects to handle new fields
- Auto-generate project name from projectDate if name not provided
- Updated page.tsx: Project interface, newProject state, addProjectOpen dialog, editProjectOpen dialog
- Updated all 3 project card view modes (gallery, list, grid) to display new fields with icons
- Added getProjectDisplayName() and getProjectInitial() helper functions
- Added new lucide icons: MapPin, UserCheck, ClipboardList
- Updated MaterialsTab.tsx project interface and select dropdowns
- Created /api/db-migrate endpoint for schema migration
- Pushed changes to GitHub and deployed to Vercel (wedding-decor project)
- Verified database migration and project creation API

Stage Summary:
- Successfully deployed new project form with fields: projectDate, location, recipient, executiveManager, execution start/end dates, notes with author
- Project name is auto-generated from the date (e.g., "Project 2026-05-25")
- All 3 view modes (grid, list, gallery) now show new project details with appropriate icons and styling
- Notes section shows author name
- URL: https://my-project-tau-hazel.vercel.app

---
Task ID: 2
Agent: Main Agent
Task: إصلاح وإعادة إنشاء زر المساعدة العائم (علامة استفهام) بشكل أوضح

Work Log:
- اكتشفت أن التغييرات السابقة لم تُحفظ (HelpCenter.tsx لم يكن موجوداً)
- أنشأت HelpCenter.tsx من الصفر مع 15 مقالة مساعدة قابلة للبحث
- أضفت زر عائم كبير وواضح (16x16) بعلامة "?" كبيرة في أسفل الشاشة
- الزر ينبض 3 مرات عند ظهور الصفحة لجذب الانتباه (animate-bounce)
- لون أزرق متدرج مع ظل قوي (shadow-2xl + hover:shadow-blue-500/40)
- أضفت الزر في كل من الصفحة الرئيسية وصفحة تسجيل الدخول
- البناء نجح بدون أخطاء

Stage Summary:
- HelpCenter.tsx: /home/z/my-project/src/components/HelpCenter.tsx (45KB, 15 مقالة)
- زر عائم في: page.tsx + login/page.tsx
- الزر: دائرة زرقاء 16x16 مع "?" كبيرة + تأثير نبض + ظل أزرق

---
Task ID: 3
Agent: Main Agent
Task: إنشاء صفحة مستقلة لحاسبة تكلفة التصميم بنفس طريقة صفحة المرجع (https://n1dkf4s8z641-d.space-z.ai/)

Work Log:
- قرأت محتوى الصفحة المرجعية عبر curl واكتشفت أنها صفحة Design Cost Calculator مستقلة (Standalone) — ليست مجرد تبويب داخل التطبيق
- أنشأت مسار جديد: /home/z/my-project/src/app/design-cost-calculator/
- page.tsx: Server Component مع metadata كاملة (title, description, keywords, openGraph) مطابقة للمرجع
- page-client.tsx: Client Component مع:
  * هيدر ثابت sticky مع شعار وأزرار (العودة للتطبيق + تبديل اللغة)
  * دعم كامل للغتين AR/EN مع حفظ التفضيل في localStorage
  * كشف لغة المتصفح تلقائياً عند أول زيارة (navigator.language)
  * مزامنة <html lang> و <html dir> مع اللغة الحالية
  * منع hydration mismatch عبر mounted state
  * تدرج لوني خلفي (amber-50 → orange-50 → rose-50) مطابق للهوية البصرية للتطبيق
  * فوتر مع版权
  * يستخدم نفس مكون DesignCostCalculator الموجود في التطبيق (لا تكرار)
- تشغيل next build: ✓ نجح، الصفحة ظهرت في قائمة المسارات كـ (Static) prerendered
- اختبار HTTP: ✓ 200 OK مع العنوان الصحيح "Design Cost Calculator - Technical File Cost Estimation"

Stage Summary:
- صفحة جديدة مستقلة على المسار: /design-cost-calculator
- تعمل بدون تسجيل دخول (أداة عامة) — مطابقة لسلوك الصفحة المرجعية
- يمكن الوصول إليها مباشرة عبر الرابط https://<bot-id>-d.space-z.ai/design-cost-calculator
- توجد أيضاً كتبويب "حاسبة التكلفة" داخل التطبيق الرئيسي (لا تعارض)
- ملفات: page.tsx (metadata) + page-client.tsx (UI + i18n)

---
Task ID: 5
Agent: Main Agent
Task: تسجيل المواد المستعملة في كل مشروع على حدة (للمدير + الستور كيبر فقط) + تصدير Excel، مع عرضها في نفس صفحة المشاريع تحت المواد المطلوبة.

Work Log:
- مراجعة الكود الحالي: اكتشفت أن المواد المستعملة موجودة في الـ schema (UsedMaterial) لكن العرض كان مختصراً جداً (سطر واحد في بطاقة المشروع) بدون جدول تفصيلي ولا تصدير Excel
- إنشاء API endpoint جديد: /api/materials/export-used/route.ts
  * GET يدعم ?projectId=X لمشروع محدد أو جميع المشاريع إذا لم يُمرر
  * يرجع ملف Excel بصيغة .xlsx مع ورقتين:
    - "Used Materials": تفصيل كل مادة مستعملة (مشروع، مادة، كمية، سعر، إجمالي، ملاحظات، من أضافها، التاريخ)
    - "Summary by Material": ملخص مجمّع حسب المادة (إجمالي الكميات والتكلفة وعدد المشاريع)
  * أعمدة بعرض مخصص + ترقيم تلقائي + أسماء ملفات ديناميكية
- إضافة دالة handleExportUsedMaterials في page.tsx:
  * تستخدم fetch + blob + URL.createObjectURL للتنزيل المباشر
  * toast.loading/success/error أثناء العملية
  * معالجة حالة "لا توجد بيانات" برسالة واضحة
- إضافة state جديده: expandedUsedMaterials (قابل للطي/الفتح)
- إضافة قسم "المواد المستعملة" في صفحة المشاريع (في الـ list view) تحت "المواد المطلوبة" مباشرة:
  * header أرجواني قابل للنقر لإظهار/إخفاء الجدول
  * Badge بعدد المواد + الإجمالي بالريال القطري
  * جدول كامل: المادة | الكمية | السعر | الإجمالي | أضيفت بواسطة | حذف
  * tfoot بإجمالي التكلفة
  * زر "إضافة مادة مستعملة" (يظهر فقط للمدير + ستور كيبر + maintenance)
  * زر "تنزيل Excel" (يظهر للجميع للاطلاع، لكن الإضافة/الحذف للمخولين فقط)
  * حالة فارغة: رسالة + زر "تسجيل أول مادة مستعملة"
- تحديث الـ grid view (العرض المختصر): إضافة زر Excel بجانب عنوان "المواد المستعملة"
- التحقق من الصلاحيات: canManageUsed = role في [store_keeper, general_manager, maintenance]
  * الإضافة والحذف للمخولين فقط
  * التصدير متاح للجميع (اطلاع)
- اختبار:
  * Main page: HTTP 200 ✓
  * GET /api/materials/export-used: HTTP 200 + ملف Excel صالح (Microsoft Excel 2007+, 22KB) ✓
  * GET /api/materials/export-used?projectId=nonexistent: HTTP 404 (صحيح) ✓
  * اسم الملف: used-materials-all-projects-2026-06-26.xlsx ✓
  * الكود مُجمَّع في client + server bundle ✓
  * لا أخطاء تجميع ✓

Stage Summary:
- المواد المستعملة الآن معروضة بشكل كامل في صفحة المشاريع تحت المواد المطلوبة مباشرة (قابل للطي)
- جدول تفصيلي + إجمالي تكلفة + اسم من أضافها + ملاحظات
- زر تنزيل Excel بجانب كل مشروع يُنزّل ملف .xlsx بورقتين (تفصيل + ملخص)
- الصلاحيات: المدير العام + الستور كيبر + maintenance فقط يمكنهم الإضافة/الحذف
- الباقي يمكنهم الاطلاع والتصدير فقط
- ملفات جديدة/معدلة:
  * src/app/api/materials/export-used/route.ts (جديد)
  * src/app/page.tsx (state + دالة + UI section + grid view enhancement)
