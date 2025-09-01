import express from "express";
import notificationController from "./notification.controller.js";
const notificationRouter = express.Router();

notificationRouter.post("/", notificationController.createNotification);

export default notificationRouter;
