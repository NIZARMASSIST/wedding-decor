// نظام الترجمة
export const translations = {
  ar: {
    // العناوين الرئيسية
    title: 'نظام إدارة تصنيع ديكور الأعراس',
    subtitle: 'إدارة المراحل والإنتاج والجدولة الزمنية',
    
    // التنقل
    nav_items: 'العناصر',
    nav_stages: 'المراحل',
    nav_schedule: 'الجدول الزمني',
    nav_departments: 'الأقسام',
    
    // الأزرار
    btn_print: 'طباعة A3',
    btn_export: 'تصدير Excel',
    btn_add_item: 'إضافة عنصر جديد',
    btn_add_stage: 'إضافة مرحلة',
    btn_save: 'حفظ',
    btn_cancel: 'إلغاء',
    btn_delete: 'حذف',
    btn_edit: 'تعديل',
    btn_upload: 'رفع ملف',
    btn_view: 'عرض',
    btn_download: 'تحميل',
    btn_add_attachment: 'إضافة مرفق',
    btn_close: 'إغلاق',
    
    // العناصر
    items_list: 'قائمة العناصر',
    items_count: 'عدد العناصر',
    no_items: 'لا توجد عناصر',
    no_items_desc: 'ابدأ بإضافة عنصر جديد',
    
    // حقول العنصر
    item_name: 'اسم العنصر',
    item_name_placeholder: 'مثال: بوابة دخول رئيسية',
    item_priority: 'الأولوية',
    item_quantity: 'الكمية',
    item_deadline: 'الموعد النهائي',
    item_image: 'صورة العنصر',
    item_notes: 'ملاحظات',
    item_notes_placeholder: 'ملاحظات إضافية...',
    item_status: 'الحالة',
    
    // المراحل
    stages: 'المراحل',
    stage_number: 'المرحلة',
    stage_department: 'القسم',
    stage_time: 'الوقت',
    stage_time_hours: 'ساعات',
    stage_time_per_unit: 'وقت الوحدة (ساعات)',
    stage_total_time: 'الوقت الإجمالي',
    stage_estimated_time: 'الوقت المقدر (ساعات)',
    stage_quantity: 'الكمية',
    stage_notes: 'ملاحظات',
    stage_select_department: 'اختر القسم',
    stage_select_item: 'اختر العنصر',
    stage_attachments: 'المرفقات',
    stage_details: 'تفاصيل المرحلة',
    stage_shifts: 'الشفتات',
    stage_single_shift: 'شفت واحد',
    stage_double_shift: 'شفتين',
    stage_total_time: 'الوقت الإجمالي',
    stage_time_hours: 'ساعة',
    
    // حالات
    status_pending: 'قيد الانتظار',
    status_in_progress: 'قيد التنفيذ',
    status_completed: 'مكتمل',
    
    // الجدول الزمني
    schedule_title: 'الجدول الزمني للإنتاج',
    schedule_issue_date: 'تاريخ الإصدار',
    schedule_total_time: 'الوقت الإجمالي',
    schedule_progress: 'التقدم',
    
    // الأقسام
    departments_title: 'الأقسام المتاحة',
    departments_stage: 'مرحلة',
    
    // أسماء الأقسام
    dept_design: 'التصميم',
    dept_cnc: 'القطع الرقمي',
    dept_carpentry: 'النجارة',
    dept_blacksmith: 'الحدادة',
    dept_sewing: 'الخياطة',
    dept_painting: 'الصبغ',
    dept_foam: 'الفوم',
    dept_assembly: 'التجميع',
    dept_digital_print: 'الطباعة الرقمية',
    dept_other: 'صناعات أخرى',
    
    // المرفقات
    attachments: 'المرفقات',
    attachment_title: 'إضافة مرفق',
    attachment_file: 'الملف',
    attachment_description: 'وصف الملف',
    attachment_description_placeholder: 'أدخل وصفاً للملف...',
    attachment_type: 'نوع الرفع',
    attachment_work: 'أثناء العمل',
    attachment_completion: 'عند الانتهاء',
    attachment_images: 'الصور',
    attachment_pdfs: 'ملفات PDF',
    attachment_no_files: 'لا توجد مرفقات',
    attachment_select_file: 'اختر ملف (صورة أو PDF)',
    attachment_uploaded_at: 'تم الرفع في',
    
    // رسائل
    msg_item_added: 'تم إضافة العنصر بنجاح',
    msg_item_deleted: 'تم حذف العنصر',
    msg_item_updated: 'تم التحديث',
    msg_stage_added: 'تم إضافة المرحلة',
    msg_stage_deleted: 'تم حذف المرحلة',
    msg_attachment_added: 'تم إضافة المرفق بنجاح',
    msg_attachment_deleted: 'تم حذف المرفق',
    msg_error: 'خطأ',
    msg_enter_name: 'الرجاء إدخال اسم العنصر',
    msg_select_department: 'الرجاء اختيار القسم',
    msg_select_file: 'الرجاء اختيار ملف',
    msg_confirm_delete: 'هل أنت متأكد من حذف هذا العنصر؟',
    msg_confirm_delete_stage: 'هل أنت متأكد من حذف هذه المرحلة؟',
    msg_confirm_delete_attachment: 'هل أنت متأكد من حذف هذا المرفق؟',
    msg_file_too_large: 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)',
    msg_invalid_file_type: 'نوع الملف غير مدعوم (الصور و PDF فقط)',
    
    // الطباعة
    print_schedule: 'الجدول الزمني لتصنيع ديكور الأعراس',
    
    // أخرى
    preview: 'معاينة',
    required: '*',
    file: 'ملف',
    image: 'صورة',
    pdf: 'PDF',
    bytes: 'بايت',
    kb: 'كيلوبايت',
    mb: 'ميجابايت',
  },
  
  en: {
    // Main titles
    title: 'Wedding Decor Manufacturing Management System',
    subtitle: 'Manage stages, production and scheduling',
    
    // Navigation
    nav_items: 'Items',
    nav_stages: 'Stages',
    nav_schedule: 'Schedule',
    nav_departments: 'Departments',
    
    // Buttons
    btn_print: 'Print A3',
    btn_export: 'Export Excel',
    btn_add_item: 'Add New Item',
    btn_add_stage: 'Add Stage',
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_edit: 'Edit',
    btn_upload: 'Upload File',
    btn_view: 'View',
    btn_download: 'Download',
    btn_add_attachment: 'Add Attachment',
    btn_close: 'Close',
    
    // Items
    items_list: 'Items List',
    items_count: 'Items count',
    no_items: 'No items found',
    no_items_desc: 'Start by adding a new item',
    
    // Item fields
    item_name: 'Item Name',
    item_name_placeholder: 'e.g: Main Entrance Gate',
    item_priority: 'Priority',
    item_quantity: 'Quantity',
    item_deadline: 'Deadline',
    item_image: 'Item Image',
    item_notes: 'Notes',
    item_notes_placeholder: 'Additional notes...',
    item_status: 'Status',
    
    // Stages
    stages: 'Stages',
    stage_number: 'Stage',
    stage_department: 'Department',
    stage_time: 'Time',
    stage_time_hours: 'hours',
    stage_time_per_unit: 'Time per Unit (hours)',
    stage_total_time: 'Total Time',
    stage_estimated_time: 'Estimated Time (hours)',
    stage_quantity: 'Quantity',
    stage_notes: 'Notes',
    stage_select_department: 'Select Department',
    stage_select_item: 'Select Item',
    stage_attachments: 'Attachments',
    stage_details: 'Stage Details',
    stage_shifts: 'Shifts',
    stage_single_shift: 'Single Shift',
    stage_double_shift: 'Double Shift',
    stage_total_time: 'Total Time',
    stage_time_hours: 'hours',
    
    // Status
    status_pending: 'Pending',
    status_in_progress: 'In Progress',
    status_completed: 'Completed',
    
    // Schedule
    schedule_title: 'Production Schedule',
    schedule_issue_date: 'Issue Date',
    schedule_total_time: 'Total Time',
    schedule_progress: 'Progress',
    
    // Departments
    departments_title: 'Available Departments',
    departments_stage: 'stage',
    
    // Department names
    dept_design: 'Design',
    dept_cnc: 'CNC Cutting',
    dept_carpentry: 'Carpentry',
    dept_blacksmith: 'Blacksmith',
    dept_sewing: 'Sewing',
    dept_painting: 'Painting',
    dept_foam: 'Foam',
    dept_assembly: 'Assembly',
    dept_digital_print: 'Digital Printing',
    dept_other: 'Other Crafts',
    
    // Attachments
    attachments: 'Attachments',
    attachment_title: 'Add Attachment',
    attachment_file: 'File',
    attachment_description: 'Description',
    attachment_description_placeholder: 'Enter file description...',
    attachment_type: 'Upload Type',
    attachment_work: 'During Work',
    attachment_completion: 'Upon Completion',
    attachment_images: 'Images',
    attachment_pdfs: 'PDF Files',
    attachment_no_files: 'No attachments',
    attachment_select_file: 'Select file (Image or PDF)',
    attachment_uploaded_at: 'Uploaded at',
    
    // Messages
    msg_item_added: 'Item added successfully',
    msg_item_deleted: 'Item deleted',
    msg_item_updated: 'Updated successfully',
    msg_stage_added: 'Stage added successfully',
    msg_stage_deleted: 'Stage deleted',
    msg_attachment_added: 'Attachment added successfully',
    msg_attachment_deleted: 'Attachment deleted',
    msg_error: 'Error',
    msg_enter_name: 'Please enter item name',
    msg_select_department: 'Please select department',
    msg_select_file: 'Please select a file',
    msg_confirm_delete: 'Are you sure you want to delete this item?',
    msg_confirm_delete_stage: 'Are you sure you want to delete this stage?',
    msg_confirm_delete_attachment: 'Are you sure you want to delete this attachment?',
    msg_file_too_large: 'File is too large (max 10MB)',
    msg_invalid_file_type: 'Invalid file type (Images and PDF only)',
    
    // Print
    print_schedule: 'Wedding Decor Manufacturing Schedule',
    
    // Other
    preview: 'Preview',
    required: '*',
    file: 'File',
    image: 'Image',
    pdf: 'PDF',
    bytes: 'bytes',
    kb: 'KB',
    mb: 'MB',
  }
}

export type Language = 'ar' | 'en'
export type TranslationKey = keyof typeof translations.ar
