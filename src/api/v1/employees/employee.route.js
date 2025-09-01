import express from "express";
import employeeController from "./employee.controller.js";

const employeeRouter = express.Router();

employeeRouter.get("/", employeeController.getAppointmentByTags);

export default employeeRouter;
