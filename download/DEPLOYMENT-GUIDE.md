# دليل نشر تطبيق ألوان الخليج - ديكور الأفراح
# Alwan Al Khaleej - Wedding Decor App Deployment Guide

---

## 📦 محتويات النسخة الاحتياطية

| الملف | الوصف |
|-------|-------|
| `src/` | الكود المصدري الكامل (Next.js 16 + React + TypeScript) |
| `prisma/schema.prisma` | مخطط قاعدة البيانات (PostgreSQL) |
| `package.json` | التبعيات والسكريبتات |
| `Dockerfile` | ملف Docker للنشر بالحاويات |
| `start.sh` | سكريبت بدء التشغيل |
| `Caddyfile` | إعدادات خادم Caddy العكسي |
| `render.yaml` | إعدادات نشر Render |
| `vercel.json` | إعدادات Vercel |
| `seed-materials.json` | بيانات المواد الأولية الافتراضية |
| `seed-materials.mjs` | سكريبت إدراج المواد |
| `seed.mjs` | سكريبت إدراج البيانات الأولية |

---

## 🛠️ المتطلبات

- **Node.js** 18+ (يُفضل 20+)
- **قاعدة بيانات PostgreSQL** (محلية أو سحابية)
- **npm** أو **bun**

---

## 🚀 طرق النشر

### الطريقة 1: نشر على Vercel (الأسهل)

```bash
# 1. فك ضغط الأرشيف
tar xzf wedding-decor-backup.tar.gz -d wedding-decor
cd wedding-decor

# 2. إنشاء ملف .env
cp .env.example .env
# عدّل DATABASE_URL برابط قاعدة البيانات الخاص بك

# 3. تثبيت التبعيات
npm install

# 4. رفع قاعدة البيانات
npx prisma db push

# 5. نشر على Vercel
npx vercel --prod
```

**متغيرات البيئة المطلوبة في Vercel:**
- `DATABASE_URL` = `postgresql://user:password@host:5432/dbname`
- `JWT_SECRET` = أي نص سري طويل (مثل: `my-super-secret-key-2024`)

---

### الطريقة 2: نشر بخادم VPS (Ubuntu/CentOS)

```bash
# 1. فك ضغط الأرشيف على السيرفر
tar xzf wedding-decor-backup.tar.gz -d /opt/wedding-decor
cd /opt/wedding-decor

# 2. إنشاء ملف .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/wedding_decor
JWT_SECRET=your-secret-key-here
NODE_ENV=production
EOF

# 3. تثبيت التبعيات
npm install

# 4. بناء المشروع
npx prisma generate
npx prisma db push
npm run build

# 5. تشغيل التطبيق
PORT=3000 node .next/standalone/server.js
```

**تشغيل كخدمة نظام (systemd):**
```ini
# /etc/systemd/system/wedding-decor.service
[Unit]
Description=Wedding Decor App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/wedding-decor
ExecStart=/usr/bin/node .next/standalone/server.js
Environment=PORT=3000
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://user:password@localhost:5432/wedding_decor
Environment=JWT_SECRET=your-secret-key-here
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable wedding-decor
sudo systemctl start wedding-decor
```

---

### الطريقة 3: نشر بـ Docker

```bash
# 1. فك ضغط الأرشيف
tar xzf wedding-decor-backup.tar.gz -d wedding-decor
cd wedding-decor

# 2. إنشاء ملف .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@db:5432/wedding_decor
JWT_SECRET=your-secret-key-here
EOF

# 3. بناء الصورة
docker build -t wedding-decor .

# 4. تشغيل الحاوية
docker run -d \
  --name wedding-decor \
  -p 3000:8080 \
  --env-file .env \
  wedding-decor
```

**أو باستخدام Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/wedding_decor
      - JWT_SECRET=your-secret-key-here
    depends_on:
      - db
  
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wedding_decor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

```bash
docker-compose up -d
```

---

### الطريقة 4: نشر على Render

1. ارفع الكود إلى مستودع GitHub
2. اربط المستودع بـ Render
3. أضف متغيرات البيئة:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Render سيبني تلقائياً باستخدام `Dockerfile`

---

## 🔧 إعداد قاعدة البيانات

### إنشاء قاعدة بيانات PostgreSQL جديدة

```bash
# على السيرفر المحلي
sudo -u postgres psql
CREATE DATABASE wedding_decor;
CREATE USER wedding_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE wedding_decor TO wedding_user;
\q
```

### قواعد بيانات سحابية مجانية
- **Supabase**: https://supabase.com (مجاني، PostgreSQL)
- **Neon**: https://neon.tech (مجاني، PostgreSQL Serverless)
- **Render PostgreSQL**: https://render.com (خطة مجانية)

### بعد إنشاء قاعدة البيانات
```bash
npx prisma db push    # إنشاء الجداول
node seed.mjs          # إدراج البيانات الأولية (مستخدم admin)
node seed-materials.mjs # إدراج المواد الأولية
```

---

## 🔑 بيانات الدخول الافتراضية

| البريد | كلمة المرور | الدور |
|--------|-------------|-------|
| admin@wedding.com | admin123 | مسؤول (admin) |

**⚠️ غيّر كلمة المرور بعد أول تسجيل دخول!**

---

## 🌐 إعدادات Nginx (بديل عن Caddy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📋 قائمة التحقق قبل النشر

- [ ] إنشاء قاعدة بيانات PostgreSQL
- [ ] إعداد ملف `.env` بالمتغيرات الصحيحة
- [ ] تشغيل `npx prisma db push`
- [ ] تشغيل `node seed.mjs` لإنشاء المستخدم الافتراضي
- [ ] تشغيل `node seed-materials.mjs` لإدراج المواد
- [ ] بناء المشروع `npm run build`
- [ ] تشغيل التطبيق والتحقق من عمله
- [ ] تغيير كلمة مرور المسؤول الافتراضية

---

## 📞 معلومات المشروع

- **GitHub**: https://github.com/NIZARMASSIST/wedding-decor
- **Vercel**: https://my-project-tau-hazel.vercel.app
- **التقنيات**: Next.js 16, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Radix UI
