import express from "express";
import notificationRouter from "./notifications/notification.route.js";
import appointmentsRouter from "./appointments/appointment.route.js";
const v2Routes = express.Router();

v2Routes.use("/notifications", notificationRouter);
v2Routes.use("/appointments", appointmentsRouter);

export default v2Routes;
