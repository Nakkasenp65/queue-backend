import appointmentService from "./appointment.service.js";
import customerService from "../customers/customer.service.js";
import { eachDayOfInterval, format, addDays, startOfDay, endOfDay } from "date-fns";

/**
 * Handles the creation of a new appointment.
 * It first finds or creates a customer, then creates the appointment for that customer.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function createAppointmentController(req, res) {
  const { line_user_id, appointmentAt, appointmentType, note, requiredTags, ...customerData } =
    req.body;

  console.log("Received appointment creation request:", req.body);

  if (!line_user_id || !appointmentAt) {
    return res.json({ error: "line_user_id and appointmentAt are required" }, 400);
  }

  // 1. Find or create the customer. The service handles the logic.
  const customer = await customerService.createOrUpdateCustomer({
    line_user_id: line_user_id,
    ...customerData,
  });

  // 2. Prepare appointment data
  const appointmentDate = new Date(appointmentAt);
  const mappedType = (appointmentType || "onsite").toUpperCase(); // Default to ONSITE

  const appointmentPayload = {
    customerId: customer.id,
    date: appointmentDate,
    day: format(appointmentDate, "yyyy-MM-dd"),
    section: String(appointmentDate.getHours()),
    type: mappedType,
    note: note,
    requiredTags: requiredTags,
  };

  // 3. Create the appointment using the service
  const newAppointment = await appointmentService.createAppointment(appointmentPayload);

  return res.json(newAppointment, 201);
}

async function getAvailabilityController(req, res) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }
    const availability = await appointmentService.getAvailabilityByDate(new Date(date));
    console.log("Availability Check", availability);
    return res.status(200).json(availability);
  } catch (error) {
    console.error("Controller Error (getAvailabilityController):", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Lists appointments within a date range, structured in a 2D grid format (day x hour).
 * Can be filtered by lineUserId or a text query.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function listAppointmentsController(req, res) {
  try {
    const { startAt, endAt, lineUserId, query } = req.query;

    const startDate = startAt ? new Date(startAt) : new Date();
    const endDate = endAt ? new Date(endAt) : addDays(new Date(), 6);

    const filters = {
      startDate,
      endDate,
      query,
    };

    // If lineUserId is provided, find the customer's DB id first
    if (lineUserId) {
      const customer = await customerService.findCustomerByLineUserIdWithAppointments(lineUserId);
      // If customer doesn't exist, return an empty grid immediately
      if (!customer) {
        const emptyGrid = Array.from({ length: 7 }, () => Array.from({ length: 9 }, () => []));
        return res.json(emptyGrid);
      }
      filters.customerId = customer.id;
    }

    // Get the flat list of appointments from the service
    const appointments = await appointmentService.findAppointmentsByDateRange(filters);

    // --- Structure the flat list into a 2D grid ---
    const HOURS = Array.from({ length: 9 }, (_, i) => 11 + i); // 11 AM to 7 PM
    const dateRange = eachDayOfInterval({
      start: startOfDay(startDate),
      end: endOfDay(endDate),
    });
    const dateToIndexMap = new Map(
      dateRange.map((date, index) => [format(date, "yyyy-MM-dd"), index])
    );

    const dailyAppointmentsGrid = Array.from({ length: dateRange.length }, () =>
      Array.from({ length: HOURS.length }, () => [])
    );

    for (const appointment of appointments) {
      const appDate = new Date(appointment.date);
      const dateKey = format(appDate, "yyyy-MM-dd");
      const hour = appDate.getHours();

      const dayIndex = dateToIndexMap.get(dateKey);
      const sectionIndex = hour - HOURS[0];

      if (dayIndex !== undefined && sectionIndex >= 0 && sectionIndex < HOURS.length) {
        dailyAppointmentsGrid[dayIndex][sectionIndex].push(appointment);
      }
    }

    return res.json(dailyAppointmentsGrid);
  } catch (error) {
    console.error("Controller Error (listAppointmentsController):", error);
    return res.json({ success: false, message: "Internal Server Error" }, 500);
  }
}

/**
 * Retrieves all upcoming appointment times for calendar availability display.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function getUpcomingAppointmentsController(req, res) {
  try {
    const upcomingAppointments = await appointmentService.findUpcomingAppointments();
    return res.json({ success: true, data: upcomingAppointments });
  } catch (error) {
    console.error("Controller Error (getUpcomingAppointmentsController):", error);
    return res.json({ success: false, message: "Internal Server Error" }, 500);
  }
}

async function getAppointmentsByTags(req, res) {
  const { tags, employeeAdminId } = req.query; // เปลี่ยนจาก employeeId เป็น employeeAdminId

  if (!employeeAdminId) {
    return res.status(400).json({ message: "Employee Admin ID is required" });
  }

  const appointments = await appointmentService.findAppointmentsByTags(tags, employeeAdminId);
  return res.status(200).json(appointments);
}

/**
 * Retrieves all appointments for a specific customer using their LINE User ID.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function listCustomerAppointmentsController(req, res) {
  try {
    const { lineUserId } = req.query;

    if (!lineUserId) {
      return res.json({ error: "lineUserId is required" }, 400);
    }

    const customer = await customerService.findCustomerByLineUserIdWithAppointments(lineUserId);
    if (!customer) {
      return res.json({ error: "Customer not found" }, 404);
    }

    const appointments = await appointmentService.findAppointmentsByCustomerId(customer.id);
    return res.json(appointments);
  } catch (error) {
    console.error("Controller Error (listCustomerAppointmentsController):", error);
    return res.json({ success: false, message: "Internal Server Error" }, 500);
  }
}

/**
 * Retrieves a single appointment by its database ID.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function getAppointmentByIdController(req, res) {
  try {
    const { id } = req.params;
    const appointment = await appointmentService.findAppointmentById(id);

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" }, 404);
    }

    return res.json({ success: true, data: appointment });
  } catch (error) {
    console.error("Controller Error (getAppointmentByIdController):", error);
    return res.json({ success: false, message: "Internal Server Error" }, 500);
  }
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
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Appointment ID is required" });
  }
  const appointment = await appointmentService.cancelAppointment(id);
  res.status(200).json(appointment);
}

async function updateAppointmentActionController(req, res) {
  try {
    const { id: appointmentId } = req.params;
    const { action, offerDate, employeeInfo } = req.body;

    const updatedAppointment = await appointmentService.updateAppointmentStatusByEmployee(
      appointmentId,
      employeeInfo,
      action,
      offerDate
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    return res.status(200).json(updatedAppointment);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}

/**
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

export default {
  createAppointmentController,
  getAvailabilityController,
  getUpcomingAppointmentsController,
  getAppointmentsByTags,
  getDisplayAppointment,
  listAppointmentsController,
  listCustomerAppointmentsController,
  getAppointmentByIdController,
  updateAppointmentController,
  updateAppointmentActionController,
  deleteAppointmentController,
  cancelAppointmentController,
};
