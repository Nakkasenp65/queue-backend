// import prisma from '../../../lib/prisma.js';
import { format } from "date-fns";
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

const getAppointmentById = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      customer: true,
    },
  });

  return appointment;
};

const getAvailabilityByDate = async (date) => {
  // ========================================================================
  // ส่วนที่ 1: การตั้งค่าเริ่มต้น และดึงข้อมูลนัดหมายที่ยังดำเนินการอยู่
  // ========================================================================

  // ตั้งค่าเวลาเริ่มต้นของวันที่ต้องการเช็คให้เป็น 00:00:00
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // ตั้งค่าเวลาสิ้นสุดของวันที่ต้องการเช็คให้เป็น 23:59:59
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // กำหนดจำนวนพนักงานสูงสุดสำหรับแต่ละประเภทของงานในวันนี้
  const employeeCapacityToday = {
    REFINANCE: 2,
    ENGINEER: 1,
    GENERAL: 5,
  };

  // ดึงข้อมูลนัดหมายทั้งหมดในวันที่ระบุ ที่ยังไม่เสร็จสิ้นหรือถูกยกเลิก
  // เพื่อนำมาคำนวณหาคิวที่ยังเหลืออยู่
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay }, // ค้นหานัดหมายในช่วงเวลา startOfDay ถึง endOfDay
      status: {
        notIn: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"], // ไม่เอานัดหมายที่มีสถานะเหล่านี้
      },
    },
    // เลือกเฉพาะข้อมูลที่จำเป็นเพื่อลดขนาดข้อมูลที่ดึงมา
    select: { date: true, type: true, requiredTags: true, note: true },
  });

  // ========================================================================
  // ส่วนที่ 2: การคำนวณพนักงาน Refinance ที่เหลืออยู่สำหรับงานในสาขา
  // ========================================================================

  // นับจำนวนนัดหมาย "Refinance" ที่เป็นประเภท "OFFSITE" (นอกสถานที่)
  const offsiteRefinanceJobsToday = activeAppointments.filter(
    (apt) => apt.type === "OFFSITE" && apt.requiredTags.includes("REFINANCE")
  ).length;

  // คำนวณหาจำนวนพนักงาน Refinance ที่เหลืออยู่เพื่อรองรับงานในสาขา (ONSITE และ ONLINE)
  // โดยหักจำนวนพนักงานที่ต้องออกไปทำงานนอกสถานที่
  const adjustedRefinanceStaff = employeeCapacityToday.REFINANCE - offsiteRefinanceJobsToday;

  // ========================================================================
  // ส่วนที่ 3: การจัดกลุ่มนัดหมายตามชั่วโมง
  // ========================================================================

  // สร้างอ็อบเจกต์เพื่อเก็บรายการนัดหมายในแต่ละชั่วโมง
  const appointmentsByHour = {};
  // กำหนดช่วงเวลาทำงานที่ต้องการตรวจสอบ (11:00 - 19:00)
  const HOURS = Array.from({ length: 9 }, (_, i) => 11 + i); // สร้าง array [11, 12, ..., 19]

  // สร้าง key เริ่มต้นสำหรับแต่ละชั่วโมงใน `appointmentsByHour` ให้มีค่าเป็น array ว่าง
  HOURS.forEach((hour) => {
    appointmentsByHour[hour] = [];
  });

  // วนลูปนัดหมายที่ดึงมาทั้งหมด เพื่อจัดกลุ่มลงในแต่ละชั่วโมงตามเวลาของนัดหมาย
  activeAppointments.forEach((apt) => {
    const hour = new Date(apt.date).getHours();
    // ถ้าชั่วโมงของนัดหมายอยู่ในช่วงเวลาทำงาน (11:00-19:00) ให้เพิ่มนัดหมายนั้นเข้าไป
    if (appointmentsByHour[hour]) {
      appointmentsByHour[hour].push(apt);
    }
  });

  // ========================================================================
  // ส่วนที่ 4: การคำนวณ Slot ที่ว่างในแต่ละชั่วโมง
  // ========================================================================
  const slots = {};

  // วนลูปในแต่ละชั่วโมงทำงานเพื่อคำนวณหาจำนวนคิว (slot) ที่ใช้ไปและที่ว่างอยู่
  HOURS.forEach((hour) => {
    const jobsInHour = appointmentsByHour[hour]; // ดึงนัดหมายทั้งหมดในชั่วโมงนั้นๆ

    // --- คำนวณคิว Refinance โดยใช้จำนวนพนักงานที่ปรับปรุงแล้ว (adjustedRefinanceStaff) ---
    const refinanceJobs = jobsInHour.filter((j) => j.requiredTags.includes("REFINANCE"));
    const onlineRefinanceJobs = refinanceJobs.filter((j) => j.type === "ONLINE").length;
    const onsiteRefinanceJobs = refinanceJobs.filter((j) => j.type === "ONSITE").length;

    let refinanceCap = 0; // ความจุของคิว Refinance ในสาขา (ONSITE)
    // ถ้าเหลือพนักงาน Refinance ในสาขา 1 คน
    if (adjustedRefinanceStaff === 1) {
      // และมีคิวออนไลน์อยู่แล้ว จะไม่สามารถรับคิวที่สาขาเพิ่มได้ (cap=0), ถ้าไม่มีคิวออนไลน์จะรับได้ 3 คิว
      refinanceCap = onlineRefinanceJobs > 0 ? 0 : 3;
    }
    // ถ้าเหลือพนักงาน Refinance ในสาขามากกว่า 1 คน จะรับคิวที่สาขาได้ 3 คิวเสมอ
    else if (adjustedRefinanceStaff > 1) {
      refinanceCap = 3;
    }

    // ความจุของคิว Refinance Online: จะรับได้ 1 คิวก็ต่อเมื่อมีพนักงานในสาขาอย่างน้อย 2 คน
    const onlineCap = adjustedRefinanceStaff >= 2 ? 1 : 0;

    // --- คำนวณคิวซ่อม (ENGINEER) ---
    const engineerJobs = jobsInHour.filter((j) => j.requiredTags.includes("ENGINEER"));
    // ตรวจสอบว่ามีงานซ่อมด่วน (PRIORITY:HIGH) ในชั่วโมงนั้นหรือไม่
    const hasHighPriorityJob = engineerJobs.some((j) => j.priority?.toUpperCase().includes("PRIORITY:HIGH"));
    // ถ้ามีงานด่วน ช่างจะไม่ว่างเลย (cap=0), ถ้าไม่มี จะมีความจุเท่ากับจำนวนช่างทั้งหมด
    const engineerCap = hasHighPriorityJob ? 0 : employeeCapacityToday.ENGINEER;

    // --- คำนวณคิวทั่วไป (GENERAL) ---
    const generalJobs = jobsInHour.filter(
      (j) => j.requiredTags.includes("GENERAL") || j.requiredTags.length === 0
    ).length;
    // ความจุของคิวทั่วไป จะเท่ากับจำนวนพนักงานทั่วไปทั้งหมด
    const generalCap = employeeCapacityToday.GENERAL;

    // เก็บผลลัพธ์การคำนวณของชั่วโมงนี้
    slots[hour] = {
      REFINANCE: { used: onsiteRefinanceJobs, cap: refinanceCap },
      REFINANCE_ONLINE: { used: onlineRefinanceJobs, cap: onlineCap },
      ENGINEER: { used: engineerJobs.length, cap: engineerCap },
      GENERAL: { used: generalJobs, cap: generalCap },
    };
  });

  // (สำคัญ) เพิ่มข้อมูลสรุปของทั้งวันเข้าไปในผลลัพธ์
  // เพื่อให้ client ทราบว่ามีพนักงาน Refinance ออกไปนอกสถานที่กี่คนแล้ว
  slots.summary = {
    OFFSITE_REFINANCE: { used: offsiteRefinanceJobsToday, cap: 2 }, // สมมติว่ารับงานนอกสถานที่ได้พร้อมกัน 1 ที่
  };

  // คืนค่าข้อมูลคิวทั้งหมด
  return slots;
};

const getAppointmentDetailsByLineId = async (line_user_id) => {
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

const getAppointmentsByLineId = async (line_user_id) => {
  return await prisma.appointment.findMany({
    where: {
      customer: {
        line_user_id,
      },
    },
  });
};

const getAppointmentsByTags = async (tags, status) => {
  let whereClause = {};

  if (tags && tags.length > 0) {
    whereClause.requiredTags = {
      hasSome: tags,
    };
  }

  if (status) {
    whereClause.status = status;
  }

  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      customer: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  return appointments;
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

  if (appointment.status !== "WAITING_FOR_PAYMENT" && appointment.status !== "PAYMENT_INVALID") {
    throw new Error("Payment is not currently required for this appointment.");
  }

  // เปลี่ยนสถานะเป็นได้รับ payment แล้ว
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      slipUrl: slipUrl,
      status: "PAYMENT_RECEIVED",
    },
  });
};

const verifyPayment = async (appointmentId, isValid) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  // ตรวจเสร็จแล้วส่งมาที่นี่ เพื่อเปลี่ยนสถานะเป็น PAYMENT_CONFIRMED หรือ IN_VALID
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
  getAppointmentsByTags,
  getAppointmentById,
  getAppointmentDetailsByLineId,
  getAppointmentsByLineId,
  updateAppointmentById,
  updateAppointmentStatusByEmployee,
  acceptAppointmentTimeOffer,
  rejectAppointmentTimeOffer,
  cancelAppointment,
  deleteAppointmentById,
  submitPaymentSlip,
  verifyPayment,
};
