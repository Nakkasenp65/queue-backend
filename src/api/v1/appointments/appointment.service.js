// import prisma from '../../../lib/prisma.js';
import { startOfDay, endOfDay, format } from "date-fns";
import prisma from "../../../lib/prisma.js";
import notificationService from "../notifications/notification.service.js";

const createAppointment = async (customerId, appointment) => {
  const day = new Date(appointment.date);
  const savedDay = format(day, "yyyy-MM-dd");
  const section = String(day.getHours());
  return await prisma.appointment.create({
    data: {
      customer: { connect: { id: customerId } },
      date: appointment.date,
      day: savedDay,
      section: section,
      type: appointment.type,
      serviceType: appointment.serviceType,
      note: appointment.note,
      requiredTags: appointment.requiredTags || [],
      status: "PENDING",
    },
    include: {
      customer: true,
    },
  });
};

const createNewUserAppointment = async ({ customer, appointment }) => {
  const newCustomer = await prisma.customer.create({
    data: {
      line_display_name: customer.line_display_name,
      fullname: customer.fullname,
      phone: customer.phone,
      line_user_id: customer.line_user_id,
      email: customer.email,
      picture_url: customer.lineProfilePicUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      appointments: [],
    },
  });

  if (!newCustomer) {
    throw new Error("Failed to create new customer");
  }

  const newAppointment = await prisma.appointment.create({
    data: {
      ...appointment,
      customerId: newCustomer.id,
    },
  });

  return {
    customer: newCustomer,
    appointment: newAppointment,
  };
};

const getAvailabilityByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const employeeCapacityToday = {
    REFINANCE: 2,
    ENGINEER: 1,
    GENERAL: 5,
  };

  const activeAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: {
        notIn: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"],
      },
    },
    select: { date: true, type: true, requiredTags: true, note: true },
  });

  const offsiteRefinanceJobsToday = activeAppointments.filter(
    (apt) => apt.type === "OFFSITE" && apt.requiredTags.includes("REFINANCE")
  ).length;

  const adjustedRefinanceStaff = employeeCapacityToday.REFINANCE - offsiteRefinanceJobsToday;

  const appointmentsByHour = {};
  const HOURS = Array.from({ length: 9 }, (_, i) => 11 + i);
  HOURS.forEach((hour) => {
    appointmentsByHour[hour] = [];
  });
  activeAppointments.forEach((apt) => {
    const hour = new Date(apt.date).getHours();
    if (appointmentsByHour[hour]) {
      appointmentsByHour[hour].push(apt);
    }
  });

  // ========================================================================
  // ส่วนที่ 3: การคำนวณ Slot ในแต่ละชั่วโมง โดยใช้ Capacity ที่ปรับแล้ว
  // ========================================================================
  const slots = {};

  HOURS.forEach((hour) => {
    const jobsInHour = appointmentsByHour[hour];

    // --- คำนวณคิว Refinance โดยใช้ `adjustedRefinanceStaff` ---
    const refinanceJobs = jobsInHour.filter((j) => j.requiredTags.includes("REFINANCE"));
    const onlineRefinanceJobs = refinanceJobs.filter((j) => j.type === "ONLINE").length;
    const onsiteRefinanceJobs = refinanceJobs.filter((j) => j.type === "ONSITE").length;

    let refinanceCap = 0;
    if (adjustedRefinanceStaff === 1) {
      refinanceCap = onlineRefinanceJobs > 0 ? 0 : 3;
    } else if (adjustedRefinanceStaff > 1) {
      refinanceCap = 3;
    }
    const onlineCap = adjustedRefinanceStaff >= 2 ? 1 : 0;

    // --- คำนวณคิวซ่อม (Maintenance) ---
    const engineerJobs = jobsInHour.filter((j) => j.requiredTags.includes("ENGINEER"));
    const hasHighPriorityJob = engineerJobs.some((j) => j.note?.toUpperCase().includes("PRIORITY:HIGH"));
    const engineerCap = hasHighPriorityJob ? 0 : employeeCapacityToday.ENGINEER;

    // --- คำนวณคิวทั่วไป ---
    const generalJobs = jobsInHour.filter(
      (j) => j.requiredTags.includes("GENERAL") || j.requiredTags.length === 0
    ).length;
    const generalCap = employeeCapacityToday.GENERAL;

    slots[hour] = {
      REFINANCE: { used: onsiteRefinanceJobs, cap: refinanceCap },
      REFINANCE_ONLINE: { used: onlineRefinanceJobs, cap: onlineCap },
      ENGINEER: { used: engineerJobs.length, cap: engineerCap },
      GENERAL: { used: generalJobs, cap: generalCap },
    };
  });

  // (สำคัญ) เพิ่มข้อมูลสรุปของทั้งวันเข้าไปในผลลัพธ์
  slots.summary = {
    OFFSITE_REFINANCE: { used: offsiteRefinanceJobsToday, cap: 1 },
  };

  return slots;
};

const findAppointmentsByDateRange = async (filters) => {
  const whereClause = {
    date: {
      gte: startOfDay(filters.startDate),
      lte: endOfDay(filters.endDate),
    },
  };

  if (filters.customerId) {
    whereClause.customerId = filters.customerId;
  }

  if (filters.query) {
    whereClause.OR = [
      { note: { contains: filters.query, mode: "insensitive" } },
      { customer: { fullname: { contains: filters.query, mode: "insensitive" } } },
    ];
  }

  return await prisma.appointment.findMany({
    where: whereClause,
    include: {
      customer: true,
    },
    orderBy: {
      date: "asc",
    },
  });
};

const findAppointmentsByCustomerId = async (customerId) => {
  return await prisma.appointment.findFirst({
    where: {
      customerId: customerId,
    },
    orderBy: {
      date: "asc",
    },
  });
};

const findAppointmentDetailsByLineId = async (line_user_id) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      customer: {
        line_user_id,
      },
      status: {
        in: [
          "PENDING",
          "ACCEPTED_BY_EMPLOYEE",
          "OFFERED",
          "CONFIRMED",
          "WAITING_FOR_PAYMENT",
          "PAYMENT_RECEIVED",
          "PAYMENT_CONFIRMED",
          "PAYMENT_INVALID",
        ],
      },
    },
  });
  if (!appointment) return null;
  return appointment;
};

const findAppointmentsByLineId = async (line_user_id) => {
  return await prisma.appointment.findMany({
    where: {
      customer: {
        line_user_id,
      },
    },
  });
};

const findAppointmentsByTags = async (tags, employeeAdminId) => {
  // ไม่ต้องกรอง Tag อีกต่อไป เพราะ Schema เป็น String[] แล้ว
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    tags = []; // ถ้าไม่มี tag มา ให้เป็น array ว่าง
  }

  return await prisma.appointment.findMany({
    where: {
      OR: [
        { status: "PENDING", requiredTags: { hasSome: tags } },
        {
          adminInfo: {
            adminId: {
              contains: employeeAdminId,
            },
          },
        },
      ],
    },
    include: {
      customer: true,
    },
    orderBy: {
      date: "asc",
    },
  });
};

const updateAppointmentById = async (id, data) => {
  // Check if the appointment exists before attempting to update
  const existingAppointment = await prisma.appointment.findUnique({ where: { id: id } });
  if (!existingAppointment) {
    return null;
  }

  return await prisma.appointment.update({
    where: {
      id: id,
    },
    data: data,
    include: {
      customer: true,
    },
  });
};

const updateAppointmentStatusByEmployee = async (appointmentId, employeeInfoString, action, offerDate) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true }, // Include customer for notification
  });
  if (!appointment) return null;

  let dataToUpdate = {};

  switch (action.toUpperCase()) {
    case "ACCEPT":
      // ================== NEW CONDITIONAL LOGIC ==================
      // Check if the service is OFFSITE REFINANCE
      if (appointment.serviceType === "รีไฟแนนซ์" && appointment.type === "OFFSITE") {
        // If so, move to waiting for payment instead of confirming directly
        dataToUpdate = { adminInfo: employeeInfoString, status: "WAITING_FOR_PAYMENT" };
      } else {
        // Original logic for all other services
        dataToUpdate = { adminInfo: employeeInfoString, status: "ACCEPTED_BY_EMPLOYEE" };
      }
      // ===========================================================
      break;
    case "REJECT":
      dataToUpdate = { adminInfo: employeeInfoString, status: "REJECTED_BY_EMPLOYEE" };
      break;
    case "OFFER":
      dataToUpdate = { adminInfo: employeeInfoString, status: "OFFERED", offerDate };
      break;
    // ================== NEW ACTION FOR FINAL CONFIRMATION ==================
    case "CONFIRM_BOOKING":
      // This action is for the employee to finally confirm after payment is verified
      if (appointment.status !== "PAYMENT_CONFIRMED") {
        throw new Error("Cannot confirm booking. Payment not confirmed yet.");
      }
      dataToUpdate = { status: "CONFIRMED" };
      break;
    // =======================================================================
    default:
      throw new Error("Invalid action");
  }

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: dataToUpdate,
  });

  // --- Notification Logic ---
  // (This part can be expanded with more specific notifications)
  if (action.toUpperCase() === "ACCEPT") {
    if (updatedAppointment.status === "WAITING_FOR_PAYMENT") {
      // TODO: Create a specific notification for "Waiting for Payment"
      // For now, we can reuse the accept notification
      await notificationService.createAcceptAppointmentNotification(updatedAppointment.id);
    } else {
      await notificationService.createAcceptAppointmentNotification(updatedAppointment.id);
    }
  } else if (action.toUpperCase() === "REJECT") {
    await notificationService.createRejectAppointmentNotification(updatedAppointment.id);
  } else if (action.toUpperCase() === "OFFER") {
    await notificationService.createOfferedAppointmentNofitication(updatedAppointment.id);
  } else if (action.toUpperCase() === "CONFIRM_BOOKING") {
    // TODO: Create a notification to inform the customer that their booking is fully confirmed
  }

  return updatedAppointment;
};

const submitPaymentSlip = async (appointmentId, slipUrl) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  // Ensure payment is currently required
  if (appointment.status !== "WAITING_FOR_PAYMENT" && appointment.status !== "PAYMENT_INVALID") {
    throw new Error("Payment is not currently required for this appointment.");
  }

  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      slipUrl: slipUrl,
      status: "PAYMENT_RECEIVED",
    },
  });
};

// NEW FUNCTION: verifyPayment
const verifyPayment = async (appointmentId, isValid) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  // Ensure the appointment is in the correct state for verification
  if (appointment.status !== "PAYMENT_RECEIVED") {
    throw new Error("This appointment is not awaiting payment verification.");
  }

  const newStatus = isValid ? "PAYMENT_CONFIRMED" : "PAYMENT_INVALID";

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
    },
  });

  // --- Trigger Notifications ---
  if (isValid) {
    // TODO: Notify the employee that payment is confirmed and they can proceed
    // await notificationService.createPaymentConfirmedNotificationToEmployee(updatedAppointment.id);
  } else {
    // TODO: Notify the customer that their payment was invalid and they need to re-upload
    // await notificationService.createPaymentInvalidNotificationToCustomer(updatedAppointment.id);
  }

  return updatedAppointment;
};

const cancelAppointment = async (appointmentId) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
    },
  });

  return appointment;
};

const deleteAppointmentById = async (id) => {
  const existingAppointment = await prisma.appointment.findUnique({ where: { id: id } });
  if (!existingAppointment) {
    return null;
  }

  await prisma.appointment.delete({
    where: {
      id: id,
    },
  });

  return { success: true };
};

const deleteAppointmentsByCustomerId = async (customerId) => {
  return await prisma.appointment.deleteMany({
    where: {
      customerId: customerId,
    },
  });
};

const getDisplayAppointment = async (customerId) => {
  if (!customerId) throw new Error("Customer ID is required");
  const appointment = await prisma.appointment.findFirst({
    where: {
      customerId: customerId,
      status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"] },
    },
  });
  return appointment;
};

const acceptAppointmentTimeOffer = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true },
  });

  if (!appointment) {
    return null;
  }

  if (appointment.status !== "OFFERED" || !appointment.offerDate) {
    throw new Error("Appointment is not in OFFERED status or has no offer date");
  }

  // Update appointment with the offered date and time
  const offerDate = new Date(appointment.offerDate);
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      date: offerDate,
      day: format(offerDate, "yyyy-MM-dd"),
      section: String(offerDate.getHours()),
      status: "CONFIRMED",
      offerDate: null, // Clear the offer date since it's been accepted
    },
    include: { customer: true },
  });

  return updatedAppointment;
};

const rejectAppointmentTimeOffer = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true },
  });

  if (!appointment) {
    return null;
  }

  if (appointment.status !== "OFFERED") {
    throw new Error("Appointment is not in OFFERED status");
  }

  // Cancel the appointment since the customer rejected the offer
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
      offerDate: null, // Clear the offer date since it's been rejected
    },
    include: { customer: true },
  });

  return updatedAppointment;
};

export default {
  createAppointment,
  createNewUserAppointment,
  getDisplayAppointment,
  getAvailabilityByDate,
  findAppointmentsByDateRange,
  findAppointmentsByCustomerId,
  findAppointmentsByTags,
  findAppointmentDetailsByLineId,
  findAppointmentsByLineId,
  updateAppointmentById,
  updateAppointmentStatusByEmployee,
  acceptAppointmentTimeOffer,
  rejectAppointmentTimeOffer,
  cancelAppointment,
  deleteAppointmentById,
  deleteAppointmentsByCustomerId,
  submitPaymentSlip,
  verifyPayment,
};
