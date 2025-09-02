import express from "express";
import appointmentController from "./appointment.controller.js";

const appointmentRouter = express.Router();

// ดึงข้อมูลตาม tag ความสามารถของพนักงาน
appointmentRouter.get("/employee-appointments", appointmentController.getEmployeeAppointmentsByTags);
// ดึง appointment ของ customer 1 รายการ
appointmentRouter.get("/my-appointment/:line_user_id", appointmentController.getAppointmentDetailsByLineId);
// ดึง appointment ของ customer มาทั้งหมด
appointmentRouter.get("/my-appointments/:line_user_id", appointmentController.getAppointmentsByLineId);
// ดึงข้อมูลจำนวนคิวของแต่ละวัน
appointmentRouter.get("/availability", appointmentController.getAvailabilityController);
// ดึงข้อมูล 1 รายการด้วย appointment id
// appointmentRouter.get("/:appointmentId", appointmentController.getAppointmentById);

appointmentRouter.post("/cancel/:appointmentId", appointmentController.cancelAppointmentController);
appointmentRouter.post("/new-customer", appointmentController.createNewUserAppointment);
appointmentRouter.post("/:customerId", appointmentController.createAppointment);
appointmentRouter.post("/:id/verify-payment", appointmentController.handlePaymentVerification);

appointmentRouter.patch("/offer/:appointmentId/accept", appointmentController.acceptAppointmentTimeOffer);
appointmentRouter.patch("/offer/:appointmentId/reject", appointmentController.rejectAppointmentTimeOffer);
appointmentRouter.patch("/:id", appointmentController.updateAppointmentController);
appointmentRouter.patch("/:id/action", appointmentController.updateAppointmentActionController);
appointmentRouter.patch("/:id/payment", appointmentController.submitPaymentSlip);

// appointmentRouter.delete("/:id", appointmentController.updateAppointmentActionController);

export default appointmentRouter;
