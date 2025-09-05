import axios from "axios";
import http from "http-status";

/*ให้ทุกๆ POST request body เป็น
 {
    auth: {
      username: ''
      password: ''
    },
    data: {
      ข้อมูลที่อัพเดทจริงเช่น appointmentData
    }
  }
*/

export default async (req, res, next) => {
  console.log(req.body);

  try {
    // แนบ auth มาใน body และ data เป็นข้อมูลจริง (req.body) ที่จะเอาไปใช้ใน controller
    const { data } = await axios.post(`https://adminregister.vercel.app/api?action=login`, req.body.auth);

    if (data) {
      // สร้าง employeeInfo จาก login data
      req.employeeInfo = data.data;
      // ทำให้ body จริงเป็น data ที่จะเอามา อัพเดท
      req.body = req.body.data;
    }
    // ส่งต่อไปยัง Controller ใน Route
    next();
  } catch (error) {
    console.log(
      "-------------------------------ERROR FROM ONEMEMBER MIDDLEWARE-------------------------------\n",
      error
    );
    if (error.code === "ERR_BAD_REQUEST") res.status(http.BAD_REQUEST).json({ message: "UNAUTHORIZED || BAD REQUEST" });
  }
};
