import express from "express";
import notificationController from "./notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/", notificationController.getNotificationByTags);
notificationRouter.get("/customer/:line_user_id", notificationController.getCustomerNotificationByLineId);

export default notificationRouter;
