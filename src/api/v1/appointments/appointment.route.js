import express from "express";
import appointmentController from "./appointment.controller.js";
import authMiddleware from "../../../middleware/auth.middleware.js";

const appointmentRouter = express.Router();

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment
 * @example http://localhost:3000/api/v1/appointments
 */
appointmentRouter.post("/", appointmentController.createAppointmentController);

/**
 * @route   GET /api/v1/appointments
 * @desc    List appointments in a grid, with optional filters
 * @example http://localhost:3000/api/v1/appointments?startAt=2023-10-01&endAt=2023-10-07&lineUserId=U1234567890abcdef1234567890abcdef&query=John
 */
appointmentRouter.get("/", appointmentController.listAppointmentsController);

/**
 * @route   GET /api/v1/appointments/availability
 * @desc    Get all upcoming appointment times for calendar display
 * @example http://localhost:3000/api/v1/appointments/availability
 */
// appointmentRouter.get('/availability', appointmentController.getUpcomingAppointmentsController);

/**
 * @route   GET /api/v1/appointments/my-appointments
 * @desc    Get all appointments for a specific customer via lineUserId query param
 * @example http://localhost:3000/api/v1/appointments/my-appointments?lineUserId=U1234567890abcdef1234567890abcdef
 */
appointmentRouter.get("/my-appointments", appointmentController.listCustomerAppointmentsController);
appointmentRouter.get("/availability", appointmentController.getAvailabilityController);
appointmentRouter.get("/employee-appointments", appointmentController.getAppointmentsByTags);
/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get a single appointment by its database ID
 * @example http://localhost:3000/api/v1/appointments/1234567890abcdef1234567890abcdef
 */
appointmentRouter.get("/:id", appointmentController.getAppointmentByIdController);

/**
 * @route   PATCH /api/v1/appointments/:id
 * @desc    Update an appointment by its database ID
 * @example http://localhost:3000/api/v1/appointments/1234567890abcdef1234567890abcdef
 */
appointmentRouter.patch("/:id", appointmentController.updateAppointmentController);

appointmentRouter.patch(
  "/:id/action",
  authMiddleware,
  appointmentController.updateAppointmentActionController
);

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Delete an appointment by its database ID
 * @example http://localhost:3000/api/v1/appointments/1234567890abcdef1234567890abcdef
 */
appointmentRouter.delete("/:id", appointmentController.deleteAppointmentController);

export default appointmentRouter;
