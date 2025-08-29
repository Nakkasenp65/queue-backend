// src/middleware/auth.middleware.js
import authService from '../api/v1/auth/auth.service.js';

export default (req, res, next) => {
  // 1. ดึง token จาก cookie
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  // 2. ตรวจสอบความถูกต้องของ token
  const decodedPayload = authService.verifySessionToken(token);

  if (!decodedPayload) {
    // ถ้า token ไม่ถูกต้อง (เช่น หมดอายุ) ให้ลบ cookie ที่อาจจะเสียแล้วทิ้งไป
    res.clearCookie('auth_token');
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  // 3. ถ้า token ถูกต้อง ให้แนบข้อมูลผู้ใช้ (payload) ไปกับ request object
  // เพื่อให้ controller ที่ทำงานถัดไปสามารถนำไปใช้ได้
  req.employee = decodedPayload;

  // 4. ไปยัง middleware หรือ controller ตัวถัดไป
  next();
};
