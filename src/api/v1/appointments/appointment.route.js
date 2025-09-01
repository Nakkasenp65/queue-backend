import express from "express";
import appointmentController from "./appointment.controller.js";

const appointmentRouter = express.Router();
appointmentRouter.get("/", appointmentController.listAppointmentsController);
appointmentRouter.get(
  "/employee-appointments",
  appointmentController.getEmployeeAppointmentsByTags
);
appointmentRouter.get(
  "/my-appointment/:line_user_id",
  appointmentController.getAppointmentDetailsByLineId
);
// ดึง appointment ของ customer ในหน้า my-appointment
appointmentRouter.get("/appointments/:line_user_id", appointmentController.getAppointmentsByLineId);
// ดึงข้อมูลจำนวนคิวของแต่ละวัน
appointmentRouter.get("/availability", appointmentController.getAvailabilityController);
// ดึง appointment ของ customer มาทั้งหมด
appointmentRouter.get("/:line_user_id", appointmentController.getAppointmentsByLineId);

appointmentRouter.post("/cancel/:id", appointmentController.cancelAppointmentController);
appointmentRouter.post("/new-customer", appointmentController.createNewUserAppointment);
appointmentRouter.post("/:customerId", appointmentController.createAppointment);

appointmentRouter.patch(
  "/offer/:appointmentId/accept",
  appointmentController.acceptAppointmentTimeOffer
);
appointmentRouter.patch(
  "/offer/:appointmentId/reject",
  appointmentController.rejectAppointmentTimeOffer
);
appointmentRouter.patch("/:id", appointmentController.updateAppointmentController);
appointmentRouter.patch("/:id/action", appointmentController.updateAppointmentActionController);

// appointmentRouter.delete("/:id", appointmentController.updateAppointmentActionController);

export default appointmentRouter;
