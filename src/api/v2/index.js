import express from "express";
import notificationRouter from "./notifications/notification.route.js";
const v2Routes = express.Router();

v2Routes.use("/notifications", notificationRouter);

export default v2Routes;
