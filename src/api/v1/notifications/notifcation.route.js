import express from "express";
import notificationController from "./notification.controller.js";

const notificationRouter = express.Router();

// ดึง Notification มาตาม tags
notificationRouter.get("/", notificationController.getNotificationByTags);
// ดึง Notification ของลูกค้า ตาม line_user_id
notificationRouter.get("/customer/:line_user_id", notificationController.getCustomerNotificationByLineId);

export default notificationRouter;
