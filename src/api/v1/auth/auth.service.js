import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../../../lib/prisma.js';

const CENTRAL_SERVER_URL = 'https://adminregister.vercel.app/api?action=login';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '60d';

/**
 * ยืนยันตัวตนพนักงานโดยส่ง request ไปยัง Central Server
 * @param {string} username - ชื่อผู้ใช้ของพนักงาน
 * @param {string} password - รหัสผ่านของพนักงาน
 * @returns {Promise<object|null>} ข้อมูลพนักงานจาก Central Server ถ้าสำเร็จ, หรือ null ถ้าล้มเหลว
 */
const authenticateWithCentralServer = async (username, password) => {
  console.log({ username, password });
  try {
    const response = await axios.post(CENTRAL_SERVER_URL, {
      username,
      password,
    });

    // ตรวจสอบว่า response สำเร็จและมี data field ตามที่คาดหวัง
    if (response.status === 200 && response.data?.data) {
      return response.data.data; // คืนค่าข้อมูลพนักงานที่อยู่ใน field 'data'
    }
    return null;
  } catch (error) {
    // axios จะ throw error สำหรับ status code ที่ไม่ใช่ 2xx (เช่น 400, 401, 500)
    console.error('Central server authentication failed:', error.response?.data || error.message);
    return null;
  }
};

/**
 * ค้นหาพนักงานในฐานข้อมูลของเราจากข้อมูลที่ได้จาก Central Server
 * หากไม่พบ จะสร้างพนักงานใหม่ขึ้นมา (Find or Create)
 * @param {object} centralData - ข้อมูลพนักงานที่ได้จาก Central Server
 * @returns {Promise<object>} ข้อมูลพนักงานในฐานข้อมูลของเรา (Local Employee Record)
 */
const syncEmployeeWithLocalDb = async (centralData) => {
  // ใช้ centralServerId (adminId) เป็น key หลักในการค้นหา เพราะเป็นค่า unique
  const existingEmployee = await prisma.employee.findUnique({
    where: { centralServerId: centralData.adminId },
  });

  if (existingEmployee) {
    // ถ้าพนักงานมีอยู่แล้ว อาจจะอัปเดตข้อมูลบางอย่างถ้าจำเป็น
    const updatedEmployee = await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: {
        fullname: centralData.fullName || existingEmployee.fullname,
        staffId: centralData.staffId,
        centralRoles: centralData.roles,
        role: centralData.roles?.includes('admin') ? 'ADMIN' : 'STAFF', // อัปเดต role เผื่อมีการเปลี่ยนแปลง
      },
    });
    return updatedEmployee;
  } else {
    // ถ้าไม่พบ ให้สร้างพนักงานใหม่
    const newEmployee = await prisma.employee.create({
      data: {
        centralServerId: centralData.adminId,
        fullname: centralData.fullName || centralData.username,
        email: centralData.email || `${centralData.username}@fallback.com`, // สร้าง email สำรองถ้าไม่มี
        staffId: centralData.staffId,
        role: centralData.roles?.includes('admin') ? 'ADMIN' : 'STAFF',
        centralRoles: centralData.roles,
        // ไม่ต้องเก็บ password ของ central server
      },
    });
    return newEmployee;
  }
};

/**
 * สร้าง Session Token (JWT) สำหรับพนักงาน
 * @param {object} employee - ข้อมูลพนักงานจากฐานข้อมูลของเรา (Local Employee Record)
 * @returns {string} The generated JSON Web Token.
 */
const createSessionToken = (employee) => {
  const payload = {
    // ใส่เฉพาะข้อมูลที่จำเป็นและปลอดภัยลงใน token
    id: employee.id, // ใช้ ID จาก DB ของเราเป็นหลัก
    role: employee.role,
    fullname: employee.fullname,
    staffId: employee.staffId,
    centralRole: employee.centralRoles,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * ตรวจสอบความถูกต้องของ Session Token (JWT)
 * @param {string} token - The JWT string from the cookie.
 * @returns {Promise<object|null>} The decoded payload if the token is valid, otherwise null.
 */
const verifySessionToken = (token) => {
  try {
    // ถ้า token ถูกต้อง jwt.verify จะคืนค่า payload ที่ถอดรหัสแล้ว
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // ถ้า token ไม่ถูกต้อง (หมดอายุ, แก้ไข) จะเกิด error
    console.error('Invalid session token:', error.message);
    return null;
  }
};

export default {
  authenticateWithCentralServer,
  syncEmployeeWithLocalDb,
  createSessionToken,
  verifySessionToken,
};
