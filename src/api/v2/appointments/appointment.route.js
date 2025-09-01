import appointmentController from "./appointment.controller.js";
import express from "express";

const appointmentsRouter = express.Router();

appointmentsRouter.get("/dashboard", appointmentController.getDashboardAppointments);
appointmentsRouter.get("/employee/:id", appointmentController.getEmployeAppointmentsById);

export default appointmentsRouter;
