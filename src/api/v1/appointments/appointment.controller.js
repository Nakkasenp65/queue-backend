import appointmentService from "./appointment.service.js";
import customerService from "../customers/customer.service.js";
import { format } from "date-fns";
import notificationService from "../notifications/notification.service.js";
import httpStatus from "../../../utils/http.js";

async function createAppointment(req, res) {
  const customerId = req.params.customerId;
  const appointment = req.body;
  const appointmentDate = new Date(appointment.appointmentAt);
  const mappedType = (appointment.appointmentType || "onsite").toUpperCase(); // Default to ONSITE

  const appointmentPayload = {
    customerId,
    date: appointmentDate,
    day: format(appointmentDate, "yyyy-MM-dd"),
    section: String(appointmentDate.getHours()),
    type: mappedType,
    note: appointment.note,
    serviceType: appointment.serviceType,
    requiredTags: appointment.requiredTags,
  };

  const newAppointment = await appointmentService.createAppointment(customerId, appointmentPayload);

  await notificationService.createNewAppointmentNotification(
    `แจ้งเตือนการจองคิวใหม่ : ${newAppointment.serviceType}`,
    newAppointment.note,
    newAppointment.serviceType,
    newAppointment.id
  );

  return res.json(newAppointment, 201);
}

async function createNewUserAppointment(req, res) {
  const { customer, appointment } = req.body;
  const newCustomer = await customerService.createOrUpdateCustomer(customer);

  const appointmentDate = new Date(appointment.date);
  const formattedDay = format(appointmentDate, "yyyy-MM-dd");
  const section = String(appointmentDate.getHours());
  const appointmentPayload = {
    date: appointmentDate,
    day: formattedDay,
    section,
    type: appointment.type,
    serviceType: appointment.serviceType,
    note: appointment.note,
    requiredTags: appointment.requiredTags,
  };

  const newAppointment = await appointmentService.createAppointment(newCustomer.id, appointmentPayload);
  await notificationService.createNewAppointmentNotification(
    `แจ้งเตือนการจองคิวใหม่ : ${newAppointment.serviceType}`,
    newAppointment.note,
    newAppointment.serviceType,
    newAppointment.id
  );
  return res.json({ customer: newCustomer, appointment: newAppointment }, 201);
}

async function getAvailabilityController(req, res) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Date parameter is required" });
    }
    const availability = await appointmentService.getAvailabilityByDate(new Date(date));
    return res.status(httpStatus.OK).json(availability);
  } catch (error) {
    console.error("Controller Error (getAvailabilityController):", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
  }
}

async function getEmployeeAppointmentsByTags(req, res) {
  const { tags, status } = req.query;
  const appointments = await appointmentService.getAppointmentsByTags(tags, status);
  return res.status(200).json(appointments);
}

async function getCustomerAppointmentsController(req, res) {
  const { line_user_id } = req.params;
  const appointments = await appointmentService.findAppointmentDetailsByLineId(line_user_id);
  return res.status(200).json(appointments);
}

async function getAppointmentDetailsByLineId(req, res) {
  const appointment = await appointmentService.findAppointmentDetailsByLineId(req.params.line_user_id);
  return res.status(200).json(appointment);
}

async function getAppointmentsByLineId(req, res) {
  const appointments = await appointmentService.findAppointmentsByLineId(req.params.line_user_id);
  return res.status(200).json(appointments);
}

async function getAppointmentById(req, res) {
  const { appointmentId } = req.params;
  const appointment = await appointmentService.getAppointmentById(appointmentId);
  res.status(httpStatus.OK).json(appointment);
}

/**
 * Updates an appointment by its database ID.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function updateAppointmentController(req, res) {
  const { id: appointmentId } = req.params;
  const { action, offerDate, employeeInfo } = req.body;

  if (!employeeInfo) {
    return res.status(400).json({ message: "Employee info is required" });
  }

  // (สำคัญ) แปลง Object เป็น JSON String ก่อนส่งให้ Service
  const employeeInfoString = JSON.stringify(employeeInfo);

  const updatedAppointment = await appointmentService.updateAppointmentStatusByEmployee(
    appointmentId,
    employeeInfoString,
    action,
    offerDate
  );
  res.status(200).json(updatedAppointment);
}

async function cancelAppointmentController(req, res) {
  const { appointmentId } = req.params;
  if (!appointmentId) {
    return res.status(400).json({ message: "Appointment ID is required" });
  }
  const appointment = await appointmentService.cancelAppointment(appointmentId);
  res.status(200).json(appointment);
}

async function updateAppointmentAction(req, res) {
  const { id: appointmentId } = req.params;
  const { action, offerDate } = req.body;

  const updatedAppointment = await appointmentService.updateAppointmentStatusByEmployee(
    appointmentId,
    req.employeeInfo,
    action,
    offerDate
  );

  if (!updatedAppointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  return res.status(200).json(updatedAppointment);
}

async function acceptAppointmentTimeOffer(req, res) {
  try {
    const { appointmentId } = req.params;
    const appointment = await appointmentService.acceptAppointmentTimeOffer(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function rejectAppointmentTimeOffer(req, res) {
  try {
    const { appointmentId } = req.params;
    const appointment = await appointmentService.rejectAppointmentTimeOffer(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
} /**
 * Deletes an appointment by its database ID.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function deleteAppointmentController(req, res) {
  try {
    const { id } = req.params;
    const result = await appointmentService.deleteAppointmentById(id);

    if (!result) {
      return res.json({ success: false, message: "Appointment not found" }, 404);
    }

    return res.json({ success: true, message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Controller Error (deleteAppointmentController):", error);
    return res.json({ success: false, message: "Internal Server Error" }, 500);
  }
}

async function getDisplayAppointment(req, res) {
  const appointment = await appointmentService.getDisplayAppointment(req.params.customerId);
  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }
  return res.status(200).json(appointment);
}

async function submitPaymentSlip(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const { slipUrl } = req.body;

    if (!slipUrl) {
      return res.status(400).json({ message: "slipUrl is required" });
    }

    const updatedAppointment = await appointmentService.submitPaymentSlip(appointmentId, slipUrl);

    // =================================================================
    // HERE YOU WOULD TRIGGER THE QSTASH JOB
    // Example: await qstash.publishJSON({ url: 'YOUR_VERIFICATION_ENDPOINT', body: { appointmentId } });
    console.log(`QStash job should be triggered for appointmentId: ${appointmentId}`);
    // =================================================================

    return res.status(200).json(updatedAppointment);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

async function handlePaymentVerification(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const { isValid } = req.body; // Expecting a boolean: true or false

    if (typeof isValid !== "boolean") {
      return res.status(400).json({ message: "isValid (boolean) is required in the body" });
    }

    const updatedAppointment = await appointmentService.verifyPayment(appointmentId, isValid);

    // This endpoint is called by a service (QStash), so a simple 200 OK is sufficient
    return res.status(200).json({ success: true, newStatus: updatedAppointment.status });
  } catch (error) {
    // Log the error for debugging
    console.error(`Payment verification failed for appointment ${req.params.id}:`, error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

export default {
  createAppointment,
  createNewUserAppointment,
  getEmployeeAppointmentsByTags,
  getAppointmentById,
  getAvailabilityController,
  getDisplayAppointment,
  getCustomerAppointmentsController,
  getAppointmentsByLineId,
  getAppointmentDetailsByLineId,
  updateAppointmentController,
  updateAppointmentAction,
  acceptAppointmentTimeOffer,
  rejectAppointmentTimeOffer,
  deleteAppointmentController,
  cancelAppointmentController,
  submitPaymentSlip,
  handlePaymentVerification,
};
