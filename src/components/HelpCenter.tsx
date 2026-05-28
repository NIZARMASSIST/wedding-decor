'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Search,
  FolderOpen,
  Package,
  Settings,
  Calendar,
  BarChart3,
  Box,
  Users,
  User,
  MessageCircle,
  Bell,
  Download,
  Shield,
  BookOpen,
  LogIn,
  LayoutDashboard,
  X,
  Lightbulb,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface HelpArticle {
  id: string
  category: string
  categoryAr: string
  categoryIcon: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  keywordsAr: string
  keywordsEn: string
}

const helpArticles: HelpArticle[] = [
  {
    id: 'intro',
    category: 'general',
    categoryAr: 'عام',
    categoryIcon: 'bookOpen',
    titleAr: 'مقدمة عن نظام الوان الخليج',
    titleEn: 'Introduction to Alwan Al Khaleej System',
    contentAr: `نظام الوان الخليج هو نظام متكامل لإدارة تصنيع ديكور الأعراس، مصمم خصيصاً لتلبية احتياجات شركات تصنيع الديكور في منطقة الخليج العربي.

يهدف النظام إلى رقمنة وأتمتة عمليات تصنيع ديكور الأعراس التي كانت تُدار تقليدياً بالطرق اليدوية والورقية. من خلال توفير منصة مركزية، يمكن لجميع الأقسام والإدارات العمل بشكل متكامل وتنسيق، مما يقلل من الأخطاء البشرية ويزيد من كفاءة الإنتاج.

الميزات الرئيسية:
• إدارة المشاريع: إنشاء وتتبع مشاريع ديكور الأعراس من البداية حتى التسليم
• إدارة المراحل: تقسيم كل عنصر إنتاجي إلى مراحل حسب القسم مع تتبع التقدم
• إدارة المواد: تتبع المخزون والمواد المستخدمة مع استيراد وتصدير إكسل
• الرسوم البيانية: لوحات تحكم بيانية شاملة لتحليل الإنتاج
• نظام الدردشة: تواصل فوري بين أعضاء الفريق
• الإشعارات: تنبيهات فورية للمدراء
• التصدير: تصدير التقارير بصيغ إكسل وPDF
• دعم ثنائي اللغة: واجهة عربية وإنجليزية

المتطلبات التقنية: يعمل النظام عبر متصفح الويب ولا يحتاج إلى تثبيت أي برامج إضافية. يوصى باستخدام متصفحات حديثة مثل Google Chrome أو Microsoft Edge أو Safari.`,
    contentEn: `Alwan Al Khaleej is a comprehensive system for managing wedding decor manufacturing, designed specifically for decor manufacturing companies in the Arabian Gulf region.

The system aims to digitize and automate wedding decor manufacturing operations that were traditionally managed manually. By providing a centralized platform, all departments can work in an integrated and coordinated manner, reducing human errors and increasing production efficiency.

Key Features:
• Project Management: Create and track wedding decor projects from start to delivery
• Stage Management: Divide each production item into stages by department with progress tracking
• Materials Management: Track inventory and materials with Excel import/export
• Charts: Comprehensive dashboard charts for production analysis
• Chat System: Instant communication between team members
• Notifications: Instant alerts for managers
• Export: Export reports in Excel and PDF formats
• Bilingual Support: Arabic and English interface

Technical Requirements: The system runs through a web browser and doesn't require any additional software installation. Modern browsers like Google Chrome, Microsoft Edge, or Safari are recommended.`,
    keywordsAr: 'نظام الوان الخليج مقدمة ميزات متطلبات تقنية تعريف',
    keywordsEn: 'alwan khaleej system introduction features requirements definition'
  },
  {
    id: 'login',
    category: 'account',
    categoryAr: 'الحساب',
    categoryIcon: 'logIn',
    titleAr: 'تسجيل الدخول وإنشاء الحساب',
    titleEn: 'Login and Account Creation',
    contentAr: `تسجيل الدخول:
1. افتح متصفح الويب وانتقل إلى عنوان التطبيق
2. أدخل بريدك الإلكتروني المسجل في حقل البريد الإلكتروني
3. أدخل كلمة المرور الخاصة بك
4. اضغط على زر "تسجيل الدخول"

تنبيه: إذا أدخلت بيانات خاطئة ثلاث مرات متتالية، يُنصح بالتحقق من بيانات الاعتماد أو التواصل مع المدير العام لإعادة تعيين كلمة المرور.

إنشاء حساب جديد:
1. من شاشة تسجيل الدخول، اضغط على "إنشاء حساب جديد"
2. أدخل الاسم الكامل والبريد الإلكتروني ورقم الهاتف وكلمة المرور
3. اضغط على "تسجيل" لإنشاء الحساب
4. انتظر موافقة المدير العام على حسابك وتفعيله

ملاحظة: الحسابات الجديدة تُنشأ بصلاحية "مشرف" افتراضياً وبحالة "قيد المراجعة" حتى يقوم المدير العام بتفعيلها ومنح الدور المناسب.

تسجيل الخروج:
اضغط على زر "تسجيل الخروج" الموجود في الرأسية العلوية بجانب اسم المستخدم. من المهم تسجيل الخروج عند الانتهاء من العمل، خاصة عند استخدام أجهزة مشتركة.`,
    contentEn: `Login:
1. Open your web browser and navigate to the application URL
2. Enter your registered email in the email field
3. Enter your password
4. Click the "Login" button

Warning: If you enter wrong credentials three times, check your credentials or contact the General Manager to reset your password.

Creating a New Account:
1. From the login screen, click "Create New Account"
2. Enter your full name, email, phone number, and password
3. Click "Register" to create the account
4. Wait for the General Manager to approve and activate your account

Note: New accounts are created with "Supervisor" role by default and "Under Review" status until the General Manager activates them and assigns the appropriate role.

Logout:
Click the "Logout" button in the top header next to your username. It's important to log out when finished, especially on shared devices.`,
    keywordsAr: 'تسجيل دخول خروج حساب كلمة مرور بريد إلكتروني إنشاء حساب جديد تفعيل موافقة مدير',
    keywordsEn: 'login logout account password email register new account activate approval manager'
  },
  {
    id: 'dashboard',
    category: 'general',
    categoryAr: 'عام',
    categoryIcon: 'layoutDashboard',
    titleAr: 'لوحة التحكم الرئيسية',
    titleEn: 'Main Dashboard',
    contentAr: `لوحة التحكم الرئيسية هي نقطة البداية لجميع عمليات النظام. تتميز بتصميم علامات تبويب يتيح الوصول السريع إلى جميع الأقسام.

مكونات الرأسية العلوية:
• الشعار واسم النظام - تعريف هوية النظام
• محول اللغة - التبديل بين العربية والإنجليزية
• تصدير إكسل - تصدير البيانات بصيغة Excel
• تصدير PDF - تصدير التقارير بصيغة PDF
• طباعة A3 - طباعة التقارير بحجم A3
• الدردشة - فتح لوحة الدردشة الجانبية
• الإشعارات - عرض الإشعارات (للمدراء فقط)
• المستخدم - عرض معلومات المستخدم الحالي
• مساعدة - مركز المساعدة والدليل
• تسجيل الخروج - الخروج من النظام

علامات التبويب الرئيسية:
• المشاريع - إدارة مشاريع الديكور (جميع المستخدمين)
• المواد الأولية - إدارة المخزون والمواد (المدير وأمين المستودع)
• العناصر - إدارة العناصر الإنتاجية (جميع المستخدمين)
• المراحل - إدارة مراحل الإنتاج (جميع المستخدمين)
• الجدول الزمني - الجدول الزمني للإنتاج (جميع المستخدمين)
• الرسوم البيانية - الإحصائيات والتحليلات (جميع المستخدمين)
• الأقسام - إدارة أقسام الإنتاج (المدير العام)
• المستخدمين - إدارة حسابات المستخدمين (المدير العام فقط)`,
    contentEn: `The main dashboard is the starting point for all system operations. It features a tab design that allows quick access to all sections.

Header Components:
• Logo & System Name - System identity
• Language Switcher - Toggle between Arabic and English
• Export Excel - Export data in Excel format
• Export PDF - Export reports in PDF format
• Print A3 - Print reports in A3 size
• Chat - Open the chat sidebar
• Notifications - View notifications (managers only)
• User - Current user information
• Help - Help center and guide
• Logout - Exit the system

Main Tabs:
• Projects - Manage decor projects (All users)
• Materials - Manage inventory and materials (Manager & Store keeper)
• Items - Manage production items (All users)
• Stages - Manage production stages (All users)
• Schedule - Production schedule (All users)
• Charts - Statistics and analytics (All users)
• Departments - Manage production departments (General Manager)
• Users - Manage user accounts (General Manager only)`,
    keywordsAr: 'لوحة تحكم رئيسية تبويبات رأسية شريط أدوات تنقل أقسام',
    keywordsEn: 'dashboard main tabs header toolbar navigation sections'
  },
  {
    id: 'projects',
    category: 'projects',
    categoryAr: 'المشاريع',
    categoryIcon: 'folderOpen',
    titleAr: 'إدارة المشاريع',
    titleEn: 'Project Management',
    contentAr: `يُعد قسم إدارة المشاريع القلب النابض للنظام، حيث يتم إنشاء وتتبع جميع مشاريع ديكور الأعراس.

إنشاء مشروع جديد:
1. انتقل إلى تبويب "المشاريع" من الشريط العلوي
2. اضغط على زر "مشروع جديد" لفتح نموذج الإنشاء
3. أدخل اسم المشروع بالعربية والإنجليزية، وتاريخ المشروع، والموقع، واسم المستلم
4. حدد المدير التنفيذي المسؤول واسم العميل وأضف وصفاً للمشروع
5. حدد تاريخ البدء وتاريخ الانتهاء والموعد النهائي للتسليم
6. ارفع صورة المشروع (اختياري) وأضف أي ملاحظات إضافية
7. اضغط على "حفظ" لإنشاء المشروع

تفاصيل المشروع:
• اسم المشروع (عربي/إنجليزي) - مطلوب
• تاريخ المشروع - تاريخ مناسبة العرس - مطلوب
• الموقع - موقع إقامة الحفل
• المستلم - اسم الشخص المستلم للديكور
• المدير التنفيذي - المدير المسؤول عن المشروع
• اسم العميل - اسم العميل طالب الخدمة
• الحالة - قيد التنفيذ / مكتمل / ملغى
• تاريخ البدء والانتهاء والموعد النهائي

تعديل وحذف المشاريع:
يمكن تعديل بيانات المشروع بالضغط على زر التعديل. عند قيام المشرف بتعديل مشروع، يتم تسجيل التغييرات تلقائياً وإرسال إشعار للمدراء. حذف المشاريع متاح فقط للمدير العام والمدير التنفيذي.`,
    contentEn: `The project management section is the heart of the system, where all wedding decor projects are created and tracked.

Creating a New Project:
1. Go to the "Projects" tab
2. Click "New Project" to open the creation form
3. Enter project name in Arabic and English, project date, location, and recipient name
4. Select the executive manager and client name, add a description
5. Set start date, end date, and delivery deadline
6. Upload a project image (optional) and add notes
7. Click "Save" to create the project

Editing and Deleting Projects:
Edit project data by clicking the edit button. When a supervisor edits a project, changes are logged automatically and managers are notified. Deleting projects is only available to the General Manager and Executive Manager.`,
    keywordsAr: 'مشروع جديد إنشاء تعديل حذف تفاصيل مواعيد ملاحظات صورة حالة موقع مستلم عميل مدير تنفيذي',
    keywordsEn: 'project new create edit delete details dates notes image status location recipient client executive manager'
  },
  {
    id: 'items',
    category: 'production',
    categoryAr: 'الإنتاج',
    categoryIcon: 'package',
    titleAr: 'إدارة العناصر الإنتاجية',
    titleEn: 'Production Items Management',
    contentAr: `العناصر الإنتاجية هي الوحدات الأساسية التي يتم تصنيعها ضمن كل مشروع. يمكن أن يكون العنصر أي قطعة ديكور مثل منصة العرس، أو جدار خلفي، أو قوس زهور، أو طاولة كيك.

إنشاء عنصر إنتاجي جديد:
1. اختر المشروع المطلوب من تبويب المشاريع
2. انتقل إلى تبويب "العناصر"
3. اضغط على "عنصر جديد" وأدخل اسم العنصر
4. حدد الأولوية (عالية/متوسطة/منخفضة) والكمية الإجمالية
5. أضف ملاحظات وحدد الموعد النهائي للعنصر
6. ارفع صورة توضيحية للعنصر واضغط "حفظ"

معلومات العنصر الإنتاجي:
• اسم العنصر - الاسم التعريفي مثل "منصة العرس الرئيسية"
• الصورة - صورة توضيحية للعنصر المراد تصنيعه
• الأولوية - عالية أو متوسطة أو منخفضة
• الكمية الإجمالية - العدد المطلوب تصنيعه
• الموعد النهائي - التاريخ المحدد لإنهاء التصنيع
• الحالة - قيد الانتظار / قيد التنفيذ / مكتمل
• ملاحظات - تعليمات خاصة بالعنصر`,
    contentEn: `Production items are the basic units manufactured within each project. An item can be any decor piece like a wedding stage, back wall, flower arch, or cake table.

Creating a New Production Item:
1. Select the desired project from the Projects tab
2. Go to the "Items" tab
3. Click "New Item" and enter the item name
4. Set priority (High/Medium/Low) and total quantity
5. Add notes and set the item deadline
6. Upload an illustrative image and click "Save"`,
    keywordsAr: 'عنصر إنتاجي جديد إنشاء أولوية كمية موعد نهائي حالة صورة ملاحظات',
    keywordsEn: 'production item new create priority quantity deadline status image notes'
  },
  {
    id: 'stages',
    category: 'production',
    categoryAr: 'الإنتاج',
    categoryIcon: 'settings',
    titleAr: 'إدارة المراحل الإنتاجية',
    titleEn: 'Production Stages Management',
    contentAr: `المراحل الإنتاجية هي الخطوات المتسلسلة التي يمر بها كل عنصر إنتاجي خلال عملية التصنيع. يتم ربط كل مرحلة بقسم محدد.

إنشاء مرحلة إنتاجية:
1. اختر العنصر الإنتاجي المراد إضافة مرحلة إليه
2. انتقل إلى تبويب "المراحل" واضغط على "مرحلة جديدة"
3. حدد القسم المسؤول عن المرحلة ورقم ترتيب المرحلة
4. أدخل الوقت المقدر لكل وحدة والكمية المطلوبة
5. حدد عدد الورديات (1 أو 2) وأوقات بداية ونهاية كل وردية
6. اضغط "حفظ" لإنشاء المرحلة

تحديث حالة المرحلة:
• قيد الانتظار - لم يبدأ العمل بعد
• قيد التنفيذ - يتم العمل عليها حالياً (يتم تسجيل تاريخ البدء تلقائياً)
• مكتمل - تم الانتهاء منها (يتم تسجيل تاريخ الانتهاء تلقائياً)

المرفقات وقوائم التحقق:
كل مرحلة تدعم إضافة مرفقات (صور أعمال أو ملفات PDF) وقوائم تحقق لتتبع الكميات المنجزة.`,
    contentEn: `Production stages are the sequential steps each production item goes through during manufacturing. Each stage is linked to a specific department.

Creating a Production Stage:
1. Select the production item to add a stage to
2. Go to the "Stages" tab and click "New Stage"
3. Select the responsible department and stage order number
4. Enter estimated time per unit and required quantity
5. Set number of shifts (1 or 2) and start/end times for each shift
6. Click "Save" to create the stage

Updating Stage Status:
• Pending - Work hasn't started yet
• In Progress - Currently being worked on
• Completed - Finished

Attachments and Checklists:
Each stage supports adding attachments and checklists to track completed quantities.`,
    keywordsAr: 'مرحلة إنتاجية قسم وردية شفت حالة مرفقات قائمة تحقق checklist وقت كمية',
    keywordsEn: 'production stage department shift status attachments checklist time quantity'
  },
  {
    id: 'schedule',
    category: 'planning',
    categoryAr: 'التخطيط',
    categoryIcon: 'calendar',
    titleAr: 'الجدول الزمني للإنتاج',
    titleEn: 'Production Schedule',
    contentAr: `يوفر تبويب الجدول الزمني عرضاً شاملاً لجميع مراحل الإنتاج مرتبة زمنياً. يتم إنشاء الجدول تلقائياً بناءً على بيانات المراحل الإنتاجية.

كيفية قراءة الجدول الزمني:
يعرض الجدول كل مرحلة مع معلومات المشروع والعنصر المرتبط بها، والقسم المسؤول، والتواريخ المتوقعة للبدء والانتهاء، والحالة الحالية.

حساب المدد الزمنية:
يتم حساب المدة تلقائياً بناءً على:
• الوقت المقدر لكل وحدة إنتاجية
• الكمية المطلوبة في المرحلة
• عدد الورديات وساعات العمل في كل وردية

مثال: إذا كان الوقت المقدر لكل وحدة ساعتان والكمية 10 وحدات مع وردية واحدة مدتها 8 ساعات، فإن المدة المتوقعة هي يومان ونصف تقريباً.`,
    contentEn: `The Schedule tab provides a comprehensive view of all production stages arranged chronologically. The schedule is generated automatically based on production stage data.

Time Duration Calculation:
Duration is calculated automatically based on:
• Estimated time per production unit
• Required quantity in the stage
• Number of shifts and working hours per shift`,
    keywordsAr: 'جدول زمني إنتاج جدولة حساب مدة وردية وقت تواريخ',
    keywordsEn: 'schedule production planning duration calculation shift time dates'
  },
  {
    id: 'charts',
    category: 'analytics',
    categoryAr: 'التحليلات',
    categoryIcon: 'barChart3',
    titleAr: 'الرسوم البيانية والإحصائيات',
    titleEn: 'Charts and Statistics',
    contentAr: `يقدم تبويب الرسوم البيانية لوحة تحكم بصرية شاملة تعرض تحليلات متنوعة لأداء الإنتاج وحالة المشاريع.

أنواع الرسوم البيانية:
• رسم أعمدة - عرض تقدم المشاريع عبر المراحل المختلفة
• رسم دائري - توزيع حالات المشاريع (قيد التنفيذ / مكتمل / ملغى)
• رسم مساحي - أعباء العمل على الأقسام المختلفة عبر الزمن

تتفاعل الرسوم بشكل ديناميكي مع بيانات النظام، حيث يتم تحديثها تلقائياً عند أي تغيير.`,
    contentEn: `The Charts tab provides a comprehensive visual dashboard displaying various analytics for production performance and project status.

Chart Types:
• Bar Chart - Display project progress across different stages
• Pie Chart - Distribution of project statuses
• Area Chart - Workloads on different departments over time`,
    keywordsAr: 'رسوم بيانية إحصائيات تحليلات أعمدة دائري مساحي تقدم مشاريع أعباء عمل',
    keywordsEn: 'charts statistics analytics bar pie area progress projects workload'
  },
  {
    id: 'materials',
    category: 'materials',
    categoryAr: 'المواد',
    categoryIcon: 'box',
    titleAr: 'إدارة المواد الأولية',
    titleEn: 'Raw Materials Management',
    contentAr: `يُعد قسم إدارة المواد أداة أساسية لتتبع المخزون والمواد المستخدمة. يدعم النظام نوعين: المواد الخام (خشب، قماش، طلاء) والمواد التشغيلية (مسامير، غراء، مواد استهلاكية).

إضافة مادة جديدة:
1. انتقل إلى تبويب "المواد الأولية"
2. اضغط على "مادة جديدة" لفتح نموذج الإضافة
3. أدخل اسم المادة بالعربية والإنجليزية، وحدد الوحدة (متر/كيلو/قطعة/لفة/صندوق/لتر)
4. اختر الفئة ونوع المادة (خام/تشغيلية)
5. حدد سعر الوحدة والكمية المتوفرة في المخزون
6. اضغط "حفظ" لإضافة المادة

استيراد وتصدير المواد:
يمكن استيراد المواد من ملفات إكسل وتصديرها أيضاً. ميزة الاستيراد مفيدة عند إضافة كميات كبيرة دفعة واحدة.

صلاحيات المواد: إضافة وتعديل وحذف المواد متاحة للمدير العام وأمين المستودع فقط. عرض المواد متاح لجميع المستخدمين.`,
    contentEn: `The materials management section is an essential tool for tracking inventory and materials used.

Adding a New Material:
1. Go to the "Materials" tab
2. Click "New Material"
3. Enter material name in Arabic and English, set the unit
4. Choose category and type (raw/operational)
5. Set unit price and available stock quantity
6. Click "Save"

Material Permissions: Adding, editing, and deleting materials is available to General Manager and Store Keeper only.`,
    keywordsAr: 'مواد أولية خام تشغيلية مخزون استيراد تصدير إكسل ربط مشروع كمية سعر وحدة فئة',
    keywordsEn: 'materials raw operational inventory import export excel project quantity price unit category'
  },
  {
    id: 'departments',
    category: 'admin',
    categoryAr: 'الإدارة',
    categoryIcon: 'users',
    titleAr: 'إدارة الأقسام',
    titleEn: 'Department Management',
    contentAr: `يوفر تبويب الأقسام إدارة شاملة لأقسام الإنتاج. يتم إنشاء عشرة أقسام افتراضية تلقائياً، ويمكن للمدير العام إضافة أقسام جديدة.

الأقسام الافتراضية:
• التصميم - تصميم الديكور وإعداد المخططات
• CNC - القطع والنحت بآلات CNC
• النجارة - أعمال الخشب والنجارة
• الحدادة - أعمال الحديد والمعادن
• الخياطة - أعمال القماش والخياطة
• الدهان - أعمال الدهان والتشطيب
• الفوم - أعمال الفوم والنحت الحراري
• التجميع - تجميع القطع والتركيب النهائي
• الطباعة الرقمية - الطباعة على مختلف المواد
• أخرى - أعمال إضافية

يمكن للمدير العام إضافة أقسام جديدة وتعديل أسماء وألوان وأيقونات الأقسام الموجودة. لا يمكن حذف قسم مرتبط بمراحل إنتاجية قائمة.`,
    contentEn: `The Departments tab provides comprehensive management of production departments. Ten default departments are created automatically, and the General Manager can add new ones.

The General Manager can add new departments and edit names, colors, and icons of existing ones. A department linked to existing production stages cannot be deleted.`,
    keywordsAr: 'أقسام قسم تصميم CNC نجارة حدادة خياطة دهان فوم تجميع طباعة رقمية إضافة تعديل حذف',
    keywordsEn: 'departments design CNC carpentry blacksmith sewing painting foam assembly digital print'
  },
  {
    id: 'users',
    category: 'admin',
    categoryAr: 'الإدارة',
    categoryIcon: 'user',
    titleAr: 'إدارة المستخدمين',
    titleEn: 'User Management',
    contentAr: `تبويب المستخدمين متاح حصرياً للمدير العام، ويتيح إدارة حسابات جميع مستخدمي النظام.

حالات المستخدمين:
• نشط - حساب مُفعّل ويمكنه تسجيل الدخول
• قيد المراجعة - حساب جديد ينتظر موافقة المدير العام
• معلق - حساب موقوف مؤقتاً بقرار من المدير العام

لا يمكن حذف حساب المدير العام أو تغيير دوره. كما لا يمكن تعيين أكثر من مدير عام واحد في النظام.`,
    contentEn: `The Users tab is exclusively available to the General Manager and allows managing all system user accounts.

User Statuses:
• Active - Activated account that can log in
• Under Review - New account waiting for General Manager approval
• Suspended - Account temporarily suspended by General Manager

The General Manager account cannot be deleted or have its role changed.`,
    keywordsAr: 'مستخدمين حسابات أدوار حالة تفعيل تعليق حذف مدير عام مشرف إدارة',
    keywordsEn: 'users accounts roles status activate suspend delete general manager supervisor management'
  },
  {
    id: 'chat',
    category: 'communication',
    categoryAr: 'التواصل',
    categoryIcon: 'messageCircle',
    titleAr: 'نظام الدردشة والمحادثات',
    titleEn: 'Chat and Messaging System',
    contentAr: `يوفر النظام نظام دردشة متكامل يتيح التواصل الفوري بين أعضاء الفريق.

أنواع المحادثات:
• محادثة مباشرة - محادثة خاصة بين شخصين
• محادثة جماعية - محادثة تضم عدة أشخاص باسم محدد
• قناة بث - قناة إعلانية يمكن للمدير إنشاؤها

استخدام الدردشة:
1. اضغط على أيقونة "الدردشة" في الرأسية العلوية
2. اختر محادثة موجودة أو اضغط "محادثة جديدة"
3. اكتب رسالتك واضغط "إرسال" أو مفتاح Enter
4. لإرسال صورة أو ملف، اضغط على أيقونة المرفق (حتى 10 ميجابايت)

إيصالات القراءة:
✓ واحدة = تم إرسال الرسالة
✓✓ باللون الأزرق = قرأها المستلم`,
    contentEn: `The system provides an integrated chat system for instant communication between team members.

Conversation Types:
• Direct Message - Private conversation between two people
• Group Chat - Conversation with multiple people
• Broadcast Channel - Announcement channel for managers

Read Receipts:
✓ single = Message sent
✓✓ blue = Read by recipient`,
    keywordsAr: 'دردشة محادثة رسالة ملف مرفق إرسال حذف قراءة مجموعة قناة بث مباشر',
    keywordsEn: 'chat conversation message file attachment send delete read group channel broadcast direct'
  },
  {
    id: 'notifications',
    category: 'communication',
    categoryAr: 'التواصل',
    categoryIcon: 'bell',
    titleAr: 'الإشعارات',
    titleEn: 'Notifications',
    contentAr: `نظام الإشعارات هو آلية تنبيه فورية تُبقي المدراء على اطلاع دائم بأي تغييرات. تتوفر الإشعارات للمدير العام والمدير التنفيذي فقط.

أنواع الإشعارات:
• معلوماتي - عند إنشاء مشروع جديد أو إضافة عنصر
• تحذير - عند اقتراب موعد نهائي أو تأخر في المراحل
• تغيير - عند تعديل المشرف على مشروع أو مرحلة
• موافقة - عند إجراء تعديل جوهري يحتاج مراجعة

الوصول عبر أيقونة الجرس في الرأسية العلوية. يظهر رقم بجانب الأيقونة يشير إلى عدد الإشعارات غير المقروءة.`,
    contentEn: `The notification system is an instant alert mechanism that keeps managers informed of any changes. Notifications are available to General Manager and Executive Manager only.

Notification Types:
• Informational - When a new project is created
• Warning - When a deadline is approaching
• Change - When a supervisor modifies a project
• Approval - When a significant change requires review`,
    keywordsAr: 'إشعارات تنبيه جرس معلومات تحذير تغيير موافقة مقروء غير مقروء',
    keywordsEn: 'notifications alert bell information warning change approval read unread'
  },
  {
    id: 'export',
    category: 'reports',
    categoryAr: 'التقارير',
    categoryIcon: 'download',
    titleAr: 'التصدير والتقارير',
    titleEn: 'Export and Reports',
    contentAr: `يوفر النظام عدة خيارات لتصدير البيانات والتقارير بصيغ مختلفة.

خيارات التصدير:
• تصدير إكسل (XLSX) - جميع بيانات المشاريع والعناصر والمراحل والمواد
• تصدير PDF (HTML/PDF) - تقرير شامل مع رسوم بيانية وأشرطة تقدم
• طباعة A3 - التقرير بحجم A3 للعرض الكبير

خطوات التصدير:
1. من الرأسية العلوية، اضغط على زر التصدير المطلوب
2. سيقوم النظام بتجهيز التقرير بناءً على البيانات الحالية
3. سيتم تنزيل الملف تلقائياً`,
    contentEn: `The system provides several options for exporting data and reports in different formats.

Export Options:
• Excel Export (XLSX) - All project, item, stage, and material data
• PDF Export - Comprehensive report with charts and progress bars
• A3 Print - Report in A3 size for large display`,
    keywordsAr: 'تصدير تقارير إكسل PDF طباعة A3 تحميل ملف بيانات',
    keywordsEn: 'export reports excel PDF print A3 download file data'
  },
  {
    id: 'roles',
    category: 'admin',
    categoryAr: 'الإدارة',
    categoryIcon: 'shield',
    titleAr: 'أدوار المستخدمين وصلاحياتهم',
    titleEn: 'User Roles and Permissions',
    contentAr: `يتمتع كل دور بمجموعة محددة من الصلاحيات تتحكم فيما يمكن للمستخدم رؤيته وتعديله في النظام.

الأدوار المتاحة:

1. المدير العام (General Manager):
   • جميع الصلاحيات بدون استثناء
   • إدارة المستخدمين والأقسام
   • حذف المشاريع والعناصر والمراحل
   • عرض الإشعارات وسجل التغييرات
   • إنشاء قنوات بث في الدردشة

2. المسؤول التنفيذي (Executive Manager):
   • إنشاء وتعديل المشاريع والعناصر والمراحل
   • عرض الإشعارات
   • لا يمكنه حذف المشاريع أو إدارة المستخدمين

3. أمين المستودع (Store Keeper):
   • إضافة وتعديل وحذف المواد
   • إضافة المواد المستخدمة للمشاريع
   • لا يمكنه إدارة المستخدمين أو حذف المشاريع

4. المشرف (Supervisor):
   • إنشاء وتعديل المشاريع والعناصر والمراحل
   • لا يمكنه حذف المشاريع أو إدارة المواد أو المستخدمين`,
    contentEn: `Each role has a specific set of permissions that control what the user can see and modify.

Available Roles:
1. General Manager - All permissions
2. Executive Manager - Create and edit projects, view notifications
3. Store Keeper - Manage materials, add used materials to projects
4. Supervisor - Create and edit projects and items, limited permissions`,
    keywordsAr: 'أدوار صلاحيات مدير عام تنفيذي أمين مستودع مشرف دور',
    keywordsEn: 'roles permissions general manager executive store keeper supervisor'
  },
]

interface HelpCenterProps {
  isOpen: boolean
  onClose: () => void
  language: 'ar' | 'en'
}

const iconMap: Record<string, React.ReactNode> = {
  bookOpen: <BookOpen className="w-4 h-4" />,
  logIn: <LogIn className="w-4 h-4" />,
  layoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  folderOpen: <FolderOpen className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  barChart3: <BarChart3 className="w-4 h-4" />,
  box: <Box className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  messageCircle: <MessageCircle className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  download: <Download className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
}

export default function HelpCenter({ isOpen, onClose, language }: HelpCenterProps) {
  const isRTL = language === 'ar'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
      setSearchQuery('')
      setSelectedArticle(null)
    }
  }, [isOpen])

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return helpArticles
    const q = searchQuery.toLowerCase().trim()
    return helpArticles.filter(article => {
      const searchText = language === 'ar'
        ? `${article.titleAr} ${article.contentAr} ${article.keywordsAr}`
        : `${article.titleEn} ${article.contentEn} ${article.keywordsEn}`
      return searchText.toLowerCase().includes(q)
    })
  }, [searchQuery, language])

  const groupedArticles = useMemo(() => {
    const groups: Record<string, HelpArticle[]> = {}
    filteredArticles.forEach(article => {
      if (!groups[article.category]) {
        groups[article.category] = []
      }
      groups[article.category].push(article)
    })
    return groups
  }, [filteredArticles])

  const quickSuggestions = language === 'ar'
    ? ['تسجيل الدخول', 'إنشاء مشروع', 'إضافة مرحلة', 'المواد الأولية', 'تصدير التقارير', 'الدردشة', 'الصلاحيات', 'نسيت كلمة المرور']
    : ['Login', 'Create project', 'Add stage', 'Materials', 'Export reports', 'Chat', 'Permissions', 'Forgot password']

  const formatContent = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return <div key={i} className="h-2" />
      if (trimmed.startsWith('•')) {
        return (
          <div key={i} className="flex gap-2 items-start mr-4">
            <span className="text-blue-500 mt-1 shrink-0">•</span>
            <span>{trimmed.substring(1).trim()}</span>
          </div>
        )
      }
      if (trimmed.match(/^\d+\./)) {
        return (
          <div key={i} className="flex gap-2 items-start mr-4 font-medium">
            <span className="text-blue-600 shrink-0">{trimmed.match(/^\d+/)?.[0]}.</span>
            <span>{trimmed.replace(/^\d+\.\s*/, '')}</span>
          </div>
        )
      }
      if (trimmed.includes('⚠️') || trimmed.includes('تنبيه') || trimmed.includes('Warning')) {
        return (
          <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-amber-800">{trimmed.replace(/⚠️\s*/, '')}</span>
          </div>
        )
      }
      if (trimmed.includes('💡') || trimmed.includes('نصيحة') || trimmed.includes('Tip')) {
        return (
          <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2 flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <span className="text-blue-800">{trimmed.replace(/💡\s*/, '')}</span>
          </div>
        )
      }
      if (trimmed.includes('ℹ️') || trimmed.includes('ملاحظة') || trimmed.includes('Note')) {
        return (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 flex items-start gap-2">
            <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <span className="text-gray-700">{trimmed.replace(/ℹ️\s*/, '')}</span>
          </div>
        )
      }
      if (trimmed.includes('✓') || trimmed.includes('مكتمل') || trimmed.includes('Complete')) {
        return (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-green-500 shrink-0">✓</span>
            <span>{trimmed.replace(/✓\s*/, '')}</span>
          </div>
        )
      }
      return <p key={i} className="mb-1">{trimmed}</p>
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {language === 'ar' ? 'مركز المساعدة' : 'Help Center'}
            </DialogTitle>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-2">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن أي مشكلة أو سؤال...' : 'Search for any problem or question...'}
              className={`bg-white/20 border-white/30 text-white placeholder:text-blue-200 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2`}
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4">
            {/* Quick suggestions */}
            {!searchQuery && !selectedArticle && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  {language === 'ar' ? 'بحث شائع:' : 'Popular searches:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchQuery(s)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-colors border border-blue-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected article */}
            {selectedArticle ? (
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-3 text-sm font-medium"
                >
                  <span>{isRTL ? '→' : '←'}</span>
                  {language === 'ar' ? 'العودة للقائمة' : 'Back to list'}
                </button>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {language === 'ar' ? selectedArticle.titleAr : selectedArticle.titleEn}
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {formatContent(language === 'ar' ? selectedArticle.contentAr : selectedArticle.contentEn)}
                </div>
              </div>
            ) : (
              /* Articles list grouped by category */
              filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </p>
                  <p className="text-sm mt-1">
                    {language === 'ar' ? 'جرب كلمات بحث مختلفة' : 'Try different search terms'}
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={Object.keys(groupedArticles)}>
                  {Object.entries(groupedArticles).map(([category, articles]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">{iconMap[articles[0]?.categoryIcon || 'bookOpen']}</span>
                          <span className="font-semibold text-gray-800">
                            {language === 'ar' ? articles[0]?.categoryAr : category}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs">{articles.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {articles.map(article => (
                            <button
                              key={article.id}
                              onClick={() => setSelectedArticle(article)}
                              className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between group"
                            >
                              <span className="text-sm text-gray-700 group-hover:text-blue-700 font-medium">
                                {language === 'ar' ? article.titleAr : article.titleEn}
                              </span>
                              <span className="text-gray-400 group-hover:text-blue-500 text-xs">
                                {isRTL ? '←' : '→'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
