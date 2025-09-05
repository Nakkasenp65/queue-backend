# Queue Backend - ระบบจัดการคิว (Backend)

โปรเจกต์นี้คือระบบ Backend สำหรับจัดการคิวการนัดหมาย สร้างขึ้นด้วย Node.js, Express, และ Prisma ORM สำหรับเชื่อมต่อกับฐานข้อมูล MongoDB

## 🎯 แนวคิดหลัก (Core Concept)

- **การจัดการนัดหมาย (Appointment Management):** ลูกค้าสามารถสร้าง, ดู, และยกเลิกนัดหมายได้
- **การจัดการลูกค้า (Customer Management):** จัดการข้อมูลลูกค้าที่ผูกกับ LINE User ID
- **การจัดการพนักงาน (Employee/Admin):** พนักงานสามารถดูนัดหมายที่เกี่ยวข้อง, รับงาน, หรือปฏิเสธงานได้
- **การแจ้งเตือน (Notifications):** ระบบสามารถส่งการแจ้งเตือนเมื่อมีกิจกรรมต่างๆ เกิดขึ้น (เช่น การยืนยันนัดหมาย)

## 🛠️ สิ่งที่ต้องมี (Prerequisites)

- Node.js (เวอร์ชัน 18.x หรือสูงกว่า)
- npm (มาพร้อมกับ Node.js)
- Git

## 🚀 ขั้นตอนการติดตั้ง (Setup Instructions)

1.  **Clone โปรเจกต์:**

    ```bash
    git clone <your-repository-url>
    cd queue-backend
    ```

2.  **ติดตั้ง Dependencies:**

    ```bash
    npm install
    ```

3.  **ตั้งค่า Environment Variables:**
    สร้างไฟล์ `.env` ขึ้นมาใน root directory ของโปรเจกต์ โดยคัดลอกเนื้อหาด้านล่างแล้วใส่ค่าที่ถูกต้อง

    ```properties
    # URL สำหรับเชื่อมต่อ MongoDB Atlas (อย่าลืมใส่ชื่อ Database ของคุณ)
    MONGO_URL="mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"

    # URL ของ Frontend ที่จะเชื่อมต่อกับ Backend นี้
    FRONTEND_URL="http://localhost:5173"

    # URL สำหรับเชื่อมต่อ Database (สำหรับ Prisma) - ควรเป็นค่าเดียวกับ MONGO_URL
    DATABASE_URL="mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"

    # (Optional) API สำหรับอัปโหลดรูปภาพ
    UPLOAD_IMAGE_API_URL="https://your-image-upload-service/api/upload"
    ```

4.  **ซิงค์ฐานข้อมูล (Database Sync):**
    หลังจากตั้งค่า `.env` เรียบร้อยแล้ว ให้ทำการซิงค์ Prisma Schema กับฐานข้อมูล MongoDB ของคุณด้วยคำสั่ง:

    ```bash
    npx prisma db push
    ```

    คำสั่งนี้จะสร้าง Collections ต่างๆ ตามที่กำหนดไว้ในไฟล์ `prisma/schema.prisma`

5.  **สร้าง Prisma Client:**
    เพื่อให้โค้ดสามารถใช้งาน Prisma Client ได้ ให้รันคำสั่ง:
    ```bash
    npx prisma generate
    ```

## 🏃 การรันโปรเจกต์ (Running the Project)

- **สำหรับ Development (โหมดพัฒนา):**
  โปรเจกต์นี้ถูกตั้งค่าให้ใช้งานกับ Vercel CLI ได้ง่าย

  ```bash
  vercel dev
  ```

  หรือหากมี script ใน `package.json` ก็สามารถใช้ `npm run dev` ได้

- **สำหรับ Production:**
  สามารถ Deploy โปรเจกต์นี้ขึ้นบน Vercel ได้โดยตรง Vercel จะทำการ build และ run โปรเจกต์ให้โดยอัตโนมัติ

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
/
├── prisma/
│   └── schema.prisma       # ไฟล์กำหนด Schema ของฐานข้อมูล
├── src/
│   ├── api/                # โฟลเดอร์หลักสำหรับ API routes และ logic
│   │   └── v1/
│   │       ├── appointments/ # จัดการนัดหมาย
│   │       ├── customers/    # จัดการลูกค้า
│   │       └── ...
│   ├── lib/                # โค้ดส่วนกลาง เช่น การเชื่อมต่อ DB
│   └── index.js            # ไฟล์เริ่มต้นของ Express server
├── .env                    # ไฟล์เก็บ Environment variables (ต้องสร้างเอง)
└── package.json            # ไฟล์จัดการ Dependencies และ Scripts
```
