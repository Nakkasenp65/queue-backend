import authService from "./auth.service.js";

async function loginController(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const centralData = await authService.authenticateWithCentralServer(username, password);
    if (!centralData) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 2. ซิงค์ข้อมูลพนักงานกับฐานข้อมูลของเรา (Find or Create)
    // **สำคัญ:** เราจะสร้าง Token จากข้อมูลใน DB ของเรา ไม่ใช่จาก Central Server โดยตรง
    const localEmployee = await authService.syncEmployeeWithLocalDb(centralData);

    // 3. สร้าง Session Token (JWT) ของเราเอง โดยเรียกใช้ Service
    const token = authService.createSessionToken(localEmployee);

    // 4. ตั้งค่า Cookie ที่จะส่งกลับไปพร้อมกับ Response
    res.cookie("auth_token", token, {
      httpOnly: true, // ป้องกันการเข้าถึงจาก Javascript ฝั่ง Client
      secure: process.env.NODE_ENV === "production", // ส่งผ่าน HTTPS เท่านั้นใน Production
      sameSite: "none", // ป้องกัน CSRF
      maxAge: 60 * 60 * 24 * 60 * 1000, // 60 วัน (หน่วยเป็นมิลลิวินาที)
      path: "/",
    });

    // 5. ส่ง Response กลับไป (Status 200 OK)
    // สังเกตว่าเราไม่ได้ส่ง Token กลับไปใน JSON body เพราะมันอยู่ใน Cookie แล้ว
    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      employeeId: localEmployee.id,
      // สมมติว่า service ของเรามีการจัดการ field `firstLogin` ด้วย
      // firstLogin: localEmployee.firstLogin,
      // redirectTo: localEmployee.firstLogin ? "/queueManagement/profile" : "/queueManagement/admin",
    });
  } catch (error) {
    console.error("Controller Error (loginController):", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Controller สำหรับดึงข้อมูลผู้ใช้ที่ Login อยู่
 * ข้อมูลผู้ใช้จะถูกแนบมาใน req.employee โดย authMiddleware
 */
async function getMeController(req, res) {
  // Middleware ได้ทำการตรวจสอบ token และแนบข้อมูล employee มาให้แล้ว
  // ถ้ามาถึงตรงนี้ได้ แสดงว่า token ถูกต้อง
  return res.status(200).json({
    isEmployee: true,
    employee: req.employee, // req.employee ถูกสร้างโดย middleware
  });
}

/**
 * Controller สำหรับ Logout
 */
async function logoutController(req, res) {
  // ลบ cookie ที่ชื่อ 'auth_token'
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return res.status(200).json({ message: "ออกจากระบบสำเร็จ" });
}

export default {
  loginController,
  getMeController,
  logoutController,
};
