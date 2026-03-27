# سجل محادثات تطبيق ألوان الخليج لإدارة تصنيع ديكور الأعراس

---

## معلومات المشروع الأساسية

| العنصر | القيمة |
|--------|--------|
| **اسم التطبيق** | ألوان الخليج - Alwan Al Khaleej |
| **الوصف** | نظام إدارة تصنيع ديكور الأعراس |
| **الرابط** | https://wedding-decor.onrender.com |
| **GitHub** | https://github.com/NIZARMASSIST/wedding-decor |
| **قاعدة البيانات** | PostgreSQL على Render |
| **الخطة** | Free Tier (512MB RAM) |

---

## تاريخ المحادثات والتعديلات

---

### المحادثة #1 - 2026-03-28

#### المشكلة:
- عند إضافة مشروع جديد والضغط على حفظ لا يتم الاستجابة
- المشاريع والعناصر والأقسام غير موجودة

#### التشخيص:
1. واجهة `Project` لم تكن معرفة في `page.tsx`
2. واجهة `ChecklistItem` غير معرفة
3. حقل `projectId` غير موجود في `newItem` state
4. معالجة أخطاء ضعيفة في API

#### الإصلاحات المطبقة:

**1. إضافة الواجهات المفقودة في `src/app/page.tsx`:**
```typescript
interface Project {
  id: string
  name: string
  nameAr?: string
  clientName?: string
  description?: string
  status: string
  startDate?: string
  endDate?: string
  deadline?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface ChecklistItem {
  id: string
  stageId: string
  itemName: string
  quantity: number
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
  order: number
}
```

**2. تحديث `newItem` state:**
```typescript
const [newItem, setNewItem] = useState({
  name: '', image: '', priority: 1, notes: '', totalQuantity: 1, deadline: '', projectId: ''
})
```

**3. إضافة اختيار المشروع في نماذج العناصر:**
- في نافذة إضافة عنصر جديد
- في نافذة تعديل العنصر

**4. تحسين API routes:**
- `/api/projects` - إضافة validation و logging
- `/api/items` - إضافة projectId و logging
- `/api/departments` - إنشاء الأقسام الافتراضية تلقائياً

**5. تحسين معالجة الأخطاء في `fetchData`:**
- التحقق من response.ok
- إضافة console.log للتشخيص
- تعيين قيم فارغة عند الخطأ

---

### المحادثة #2 - 2026-03-28

#### المشكلة:
- التطبيق لا يعمل - Build Logs تظهر خطأ في Prisma

#### السجل من Render:
```
Error: Use the --accept-data-loss flag to ignore the data loss warnings
```

#### التشخيص:
- `prisma db push` يتطلب علم `--accept-data-loss` لتحديث قاعدة البيانات
- بدون هذا العلم، فشل تحديث قاعدة البيانات

#### الإصلاح:
**تحديث `start.sh`:**
```bash
npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
```

---

## هيكل المشروع

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx          # الصفحة الرئيسية (كل التطبيق)
│   │   ├── layout.tsx        # التخطيط العام
│   │   ├── globals.css       # الأنماط العامة
│   │   └── api/
│   │       ├── route.ts      # API الأساسي
│   │       ├── projects/     # API المشاريع
│   │       ├── items/        # API العناصر
│   │       ├── departments/  # API الأقسام
│   │       ├── stages/       # API المراحل
│   │       ├── checklist/    # API قائمة التحقق
│   │       ├── attachments/  # API المرفقات
│   │       ├── schedule/     # API الجدول الزمني
│   │       └── export/       # API التصدير
│   ├── components/ui/        # مكونات shadcn/ui
│   └── lib/
│       ├── db.ts             # اتصال Prisma
│       ├── i18n.ts           # الترجمة
│       └── utils.ts          # أدوات مساعدة
├── prisma/
│   └── schema.prisma         # مخطط قاعدة البيانات
├── public/
│   ├── logo.png              # شعار الشركة
│   └── logo.svg
├── Dockerfile                # ملف Docker
├── start.sh                  # سكريبت البدء
├── render.yaml               # إعدادات Render
└── package.json
```

---

## نماذج قاعدة البيانات (Prisma Schema)

### Project (المشروع)
- id, name, nameAr, clientName
- description, status, startDate, endDate, deadline
- notes, items[], createdAt, updatedAt

### Department (القسم)
- id, name, nameAr, color, icon
- stages[], createdAt, updatedAt

### ProductionItem (عنصر الإنتاج)
- id, projectId, name, image
- priority, notes, status, totalQuantity, deadline
- stages[], createdAt, updatedAt

### Stage (المرحلة)
- id, itemId, departmentId, stageNumber
- timePerUnit, quantity, estimatedTime, shifts
- shift times, status, startDate, endDate
- notes, attachments[], checklist[], createdAt, updatedAt

### Attachment (المرفق)
- id, stageId, fileName, fileType
- fileData, fileSize, description, uploadType

### ChecklistItem (عنصر قائمة التحقق)
- id, stageId, itemName, quantity
- completed, completedAt, completedBy, notes, order

---

## الميزات الحالية

1. **إدارة المشاريع** - إضافة/تعديل/حذف المشاريع
2. **إدارة العناصر** - إضافة/تعديل/حذف العناصر مع ربطها بالمشاريع
3. **إدارة المراحل** - إضافة مراحل لكل عنصر مع أوقات الشفتات
4. **إدارة الأقسام** - 10 أقسام افتراضية (تصميم، CNC، نجارة، حدادة، خياطة، صبغ، فوم، تجميع، طباعة رقمية، أخرى)
5. **المرفقات** - رفع صور و PDF لكل مرحلة
6. **قائمة التحقق** - متابعة الكميات لكل مرحلة
7. **الجدول الزمني** - عرض جميع المراحل مع التواريخ
8. **الرسوم البيانية** - تقدم المشاريع، توزيع المراحل، حالة العناصر
9. **التصدير** - Excel (عربي + إنجليزي) و PDF (إنجليزي فقط)
10. **ثنائي اللغة** - عربي وإنجليزي

---

## مشاكل معروفة

1. **PDF لا يدعم العربية** - النص العربي يظهر كرموز، لذلك PDF بالإنجليزية فقط
2. **Free Tier محدود** - 512MB RAM، ينام بعد 15 دقيقة عدم نشاط
3. **فقدان البيانات** - قد تفقد البيانات عند تحديث قاعدة البيانات

---

## أوامر مفيدة

### تطوير محلي:
```bash
cd /home/z/my-project
npm run dev           # تشغيل التطوير
npm run build         # بناء الإنتاج
npm run start         # تشغيل الإنتاج محلياً
```

### Prisma:
```bash
npx prisma generate   # توليد Prisma Client
npx prisma db push    # تحديث قاعدة البيانات
```

### Git:
```bash
git status
git add -A
git commit -m "message"
git push origin master
```

---

## معلومات الاتصال

- **Render Database URL**: postgresql://wedding_decor_db_user:X9S9rn1ZKDQJmHDfmtpg05EnH7MMelVS@dpg-d736krvgi27c73cuvnog-a/wedding_decor_db

---

## سجل النشر

| التاريخ | الـ Commit | الوصف |
|---------|------------|-------|
| 2026-03-28 | 4d5cc81 | إضافة --accept-data-loss لـ Prisma |
| 2026-03-28 | 13d9571 | تحديث render.yaml لاستخدام master |
| 2026-03-28 | af9defb | تحسين معالجة الأخطاء والـ logging |
| 2026-03-28 | 4db5f63 | إضافة Project interface وتحسين العلاقات |

---

*آخر تحديث: 2026-03-28*
