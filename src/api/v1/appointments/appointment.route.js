import express from "express";
import appointmentController from "./appointment.controller.js";

const appointmentRouter = express.Router();
appointmentRouter.post("/", appointmentController.createAppointmentController);
appointmentRouter.get("/", appointmentController.listAppointmentsController);
// appointmentRouter.get('/availability', appointmentController.getUpcomingAppointmentsController);
appointmentRouter.get("/employee-appointments", appointmentController.getAppointmentsByTags);
appointmentRouter.get("/my-appointments", appointmentController.listCustomerAppointmentsController);
appointmentRouter.get("/availability", appointmentController.getAvailabilityController);
appointmentRouter.get("/:id", appointmentController.getAppointmentByIdController);
appointmentRouter.get("/display/:customerId", appointmentController.getDisplayAppointment);
appointmentRouter.patch("/:id", appointmentController.updateAppointmentController);
appointmentRouter.patch("/:id/action", appointmentController.updateAppointmentActionController);
// appointmentRouter.delete("/:id", appointmentController.updateAppointmentActionController);
appointmentRouter.post("/cancel/:id", appointmentController.cancelAppointmentController);

export default appointmentRouter;
