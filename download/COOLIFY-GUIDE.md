# 🚀 دليل نشر تطبيق ألوان الخليج على Coolify
# Complete Guide: Deploy Wedding Decor App on Coolify

---

## 📋 ما هو Coolify؟

Coolify هو بديل مفتوح المصدر لـ Heroku/Vercel/Render تثبته على سيرفرك الخاص.
- ✅ **مجاني بالكامل** — لا رسوم شهرية
- ✅ **تحكم كامل** — بياناتك على سيرفرك
- ✅ **SSL تلقائي** — شهادة HTTPS مجانية
- ✅ **قاعدة بيانات مدمجة** — PostgreSQL, MySQL, MongoDB
- ✅ **نشر من GitHub** — تلقائي عند كل Push
- ✅ **Docker مدعوم** — نشر بالحاويات
- ✅ **بدون سبات** — التطبيق يعمل 24/7

---

## 🖥️ الخطوة 1: الحصول على سيرفر VPS

### خيار أ: Oracle Cloud — مجاني دائماً ⭐ (الأفضل)

1. اذهب إلى: https://cloud.oracle.com/free
2. أنشئ حساب مجاني (يحتاج بطاقة بنكية للتأكيد فقط)
3. أنشئ VM instance:
   - **الصورة**: Ubuntu 22.04 أو 24.04
   - **الشكل**: VM.Standard.E2.1.Micro (مجاني دائماً)
   - **RAM**: 1 GB
   - **CPU**: 1 vCPU
   - **التخزين**: 47 GB (مجاني)
4. افتح المنافذ في Security List:
   - Port `8000` (لوحة Coolify)
   - Port `80` (HTTP)
   - Port `443` (HTTPS)
   - Port `3000` (التطبيق - اختياري)

### خيار ب: Hetzner — رخيص جداً (~3.5€/شهر)

1. اذهب إلى: https://hetzner.com/cloud
2. أنشئ سيرفر CX22 (2 vCPU, 4GB RAM, 40GB) — ممتاز للتطبيق
3. اختر Ubuntu 22.04

### خيار ج: Contabo — الأرخص (~4.99€/شهر)

1. اذهب إلى: https://contabo.com
2. أنشئ Cloud VPS S (4 vCPU, 8GB RAM, 50GB)

---

## 🔧 الخطوة 2: تثبيت Coolify على السيرفر

### اتصل بالسيرفر عبر SSH:
```bash
ssh root@YOUR_SERVER_IP
```

### ثبّت Coolify بأمر واحد:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

⏳ الانتظار: 5-10 دقائق حسب سرعة السيرفر

### بعد التثبيت:
1. افتح المتصفح: `http://YOUR_SERVER_IP:8000`
2. أنشئ حساب المسؤول
3. سجّل الدخول

---

## 📦 الخطوة 3: نشر التطبيق على Coolify

### الطريقة أ: نشر من GitHub (الأسهل) ⭐

1. **في لوحة Coolify**:
   - اضغط **"Add New Resource"** → **"Service"**
   - اختر **"Public Repository"**
   - أدخل رابط المستودع:
     ```
     https://github.com/NIZARMASSIST/wedding-decor
     ```
   - اختر الفرع: `main`

2. **إعداد متغيرات البيئة**:
   اذهب إلى **Environment Variables** وأضف:
   ```
   DATABASE_URL=postgresql://wedding_user:wedding_pass_2024@localhost:5432/wedding_decor
   JWT_SECRET=your-very-long-secret-key-change-this-2024
   NODE_ENV=production
   ```

3. **إعداد المنفذ**:
   - Port: `8080`

4. **اضغط "Deploy"** 🚀

### الطريقة ب: نشر بـ Docker Compose

1. **في لوحة Coolify**:
   - اضغط **"Add New Resource"** → **"Docker Compose"**
   - الصق محتوى ملف `docker-compose.coolify.yml`

2. **اضغط "Deploy"** 🚀

### الطريقة ج: نشر يدوي بالأرشيف

1. **ارفع الأرشيف للسيرفر**:
   ```bash
   scp wedding-decor-backup.tar.gz root@YOUR_SERVER_IP:/opt/
   ```

2. **فك الضغط**:
   ```bash
   cd /opt
   mkdir wedding-decor
   tar xzf wedding-decor-backup.tar.gz -C wedding-decor
   ```

3. **في لوحة Coolify**:
   - اضغط **"Add New Resource"** → **"Private Repository"**
   - أدخل المسار المحلي: `/opt/wedding-decor`

---

## 🗄️ الخطوة 4: إنشاء قاعدة البيانات

### من لوحة Coolify:

1. اذهب إلى **"Databases"**
2. اضغط **"Add Database"**
3. اختر:
   - **النوع**: PostgreSQL 16
   - **الاسم**: wedding_decor
   - **المستخدم**: wedding_user
   - **كلمة المرور**: كلمة سر قوية

4. بعد الإنشاء، انسخ رابط الاتصال (DATABASE_URL)
5. أضفه إلى متغيرات بيئة التطبيق

### أو بـ Docker Compose:
قاعدة البيانات تُنشأ تلقائياً مع `docker-compose.coolify.yml`

---

## 🌐 الخطوة 5: ربط نطاق (Domain) — اختياري

1. **في لوحة Coolify**:
   - اذهب إلى إعدادات التطبيق
   - اضغط **"Domains"**
   - أدخل النطاق: `app.yourdomain.com`

2. **في إعدادات DNS** (عند مزود النطاق):
   - أضف سجل A:
     ```
     app.yourdomain.com  →  A  →  YOUR_SERVER_IP
     ```

3. **Coolify يضبط SSL تلقائياً** ✅ (شهادة Let's Encrypt مجانية)

---

## 🔄 الخطوة 6: إعداد النشر التلقائي (Auto Deploy)

1. **في لوحة Coolify**:
   - اذهب إلى إعدادات التطبيق
   - فعّل **"Auto Deploy"**
   - كل Push على فرع `main` = نشر تلقائي

2. أو أضف **Webhook** في GitHub:
   - اذهب إلى GitHub → Settings → Webhooks
   - أضف رابط Webhook من Coolify

---

## ✅ التحقق من النشر

بعد النشر، افتح الرابط:
```
http://YOUR_SERVER_IP:3000
```
أو مع النطاق:
```
https://app.yourdomain.com
```

### بيانات الدخول الافتراضية:
| البريد | كلمة المرور |
|--------|-------------|
| admin@wedding.com | admin123 |

**⚠️ غيّر كلمة المرور فوراً بعد أول دخول!**

---

## 🔧 إعداد قاعدة البيانات بعد النشر

بعد أول نشر ناجح، شغّل سكريبتات البذرة:

### من لوحة Coolify Terminal:
```bash
# إنشاء الجداول
npx prisma db push

# إدراج المستخدم الافتراضي
node seed.mjs

# إدراج المواد الأولية
node seed-materials.mjs
```

### أو من SSH:
```bash
# ادخل حاوية التطبيق
docker exec -it wedding-decor-app sh

# شغّل الأوامر
npx prisma db push
node seed.mjs
node seed-materials.mjs
```

---

## 🛡️ نصائح أمنية مهمة

1. **غيّر JWT_SECRET** إلى نص سري طويل ومعقد
2. **غيّر كلمة مرور المسؤول** بعد أول دخول
3. **غيّر كلمة مرور قاعدة البيانات** من القيم الافتراضية
4. **فعّل Firewall** على السيرفر:
   ```bash
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw allow 8000  # Coolify
   ufw enable
   ```
5. **أغلق منفذ Coolify 8000** من الخارج بعد الإعداد (استخدم SSH tunnel)

---

## 📊 مراقبة التطبيق

### من لوحة Coolify:
- ✅ حالة التطبيق (Running/Stopped)
- ✅ استخدام CPU و RAM
- ✅ سجلات التطبيق (Logs)
- ✅ إعادة التشغيل بضغطة واحدة
- ✅ النسخ الاحتياطي التلقائي لقاعدة البيانات

---

## 💡 ملخص سريع (5 خطوات فقط)

```
1. احصل على VPS (Oracle Cloud مجاني)
2. ثبّت Coolify: curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
3. أنشئ قاعدة بيانات PostgreSQL من لوحة Coolify
4. أضف التطبيق من GitHub + متغيرات البيئة
5. اضغط Deploy → انتهى! 🎉
```

---

## 🔗 روابط مفيدة

- **موقع Coolify**: https://coolify.io
- **وثائق Coolify**: https://coolify.io/docs
- **GitHub Coolify**: https://github.com/coollabsio/coolify
- **Oracle Cloud Free**: https://cloud.oracle.com/free
- **ديسكورد Coolify**: https://coollabs.io/discord
