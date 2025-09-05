import express from "express";
import appointmentController from "./appointment.controller.js";
// ตัวครอบ middleware ตรวจ username, password ที่พนักงานกรอกมา
import oneMemberMiddleware from "../../../middleware/oneMember.middleware.js";

const appointmentRouter = express.Router();

// GET

// ดึงข้อมูลตาม tag ความสามารถของพนักงาน (เอามาทั้งหมดเลยถ้าไม่มี tag)
appointmentRouter.get("/employee-appointments", appointmentController.getEmployeeAppointmentsByTags);
// ดึง appointment ของ customer 1 รายการ
appointmentRouter.get("/my-appointment/:line_user_id", appointmentController.getAppointmentDetailsByLineId);
// ดึง appointment ของ customer มาทั้งหมด
appointmentRouter.get("/my-appointments/:line_user_id", appointmentController.getAppointmentsByLineId);
// ดึงข้อมูลจำนวนคิวของแต่ละวัน
appointmentRouter.get("/availability", appointmentController.getAvailabilityController);
// ดึงข้อมูล 1 รายการด้วย appointment id
appointmentRouter.get("/:appointmentId", appointmentController.getAppointmentById);

// POST

// ยกเลิกการจอง
appointmentRouter.post("/cancel/:appointmentId", appointmentController.cancelAppointmentController);
// การจองครั้งแรกของลูกค้าใหม่ สร้าง Customer แล้วค่อยสร้าง Appointment
appointmentRouter.post("/new-customer", appointmentController.createNewUserAppointment);
// การจองของลูกค้าที่สมัครแล้ว
appointmentRouter.post("/:customerId", appointmentController.createAppointment);
// ช่องตรวจสลิป ยังไม่มีมีโค้ด
appointmentRouter.post("/:id/verify-payment", appointmentController.handlePaymentVerification);

// PATCH

// ยอมรับเวลาที่เสนอเลื่อนมา
appointmentRouter.patch("/offer/:appointmentId/accept", appointmentController.acceptAppointmentTimeOffer);
// ปฏิเสธเวลาที่เสนอ
appointmentRouter.patch("/offer/:appointmentId/reject", appointmentController.rejectAppointmentTimeOffer);
// แก้ไขการจอง
appointmentRouter.patch("/:id", appointmentController.updateAppointmentController);
// แก้ไขการจองจากปุ่มพนักงาน (ยอมรับ/ปฏิเสธ/เสนอเลื่อน)
appointmentRouter.patch("/:id/action", oneMemberMiddleware, appointmentController.updateAppointmentAction);
// รับสลิปมา เปลี่ยน Appointment เป็น PAYMEN_RECEIVE (ยังไม่ได้ตรวจ)
appointmentRouter.patch("/:id/payment", appointmentController.submitPaymentSlip);

// ลบการจองออก (ปัจจุบันเปลี่ยนเป็น cancelled ไม่ได้ลบออก)
// appointmentRouter.delete("/:id", appointmentController.updateAppointmentActionController);

export default appointmentRouter;
