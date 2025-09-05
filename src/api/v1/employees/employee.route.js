import express from "express";
import employeeController from "./employee.controller.js";

// ไม่ได้ใช้แล้วเพราะไม่ต้องเก็บ EMPLOYEE

const employeeRouter = express.Router();

// GET

// เรียกดู appointment โดย tag ที่ส่งมา const { tags } = req.query;
employeeRouter.get("/", employeeController.getAppointmentByTags);

export default employeeRouter;
