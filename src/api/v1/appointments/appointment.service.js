// import prisma from '../../../lib/prisma.js';
import { startOfDay, endOfDay } from "date-fns";
import prisma from "../../../lib/prisma.js";

/**
 * Creates a new appointment.
 * Assumes customerId is validated and provided by the controller.
 * @param {object} data The appointment data.
 * @param {string} data.customerId The unique ID of the customer making the appointment.
 * @param {Date} data.date The full date and time of the appointment.
 * @param {string} data.day The date part of the appointment in 'yyyy-MM-dd' format.
 * @param {string} data.section The hour part of the appointment as a string.
 * @param {'ONSITE' | 'ONLINE' | 'OFFSITE'} data.type The type of the appointment.
 * @param {string} [data.note] An optional note for the appointment.
 * @param {Array<'ENGINEER' | 'REFINANCE' | 'GENERAL'>} [data.requiredTags] Optional tags for required employee skills.
 * @returns {Promise<object>} The newly created appointment record, including customer and employee details.
 */
const createAppointment = async (data) => {
  return await prisma.appointment.create({
    data: {
      customerId: data.customerId,
      date: data.date,
      day: data.day,
      section: data.section,
      type: data.type,
      note: data.note,
      requiredTags: data.requiredTags || [],
      status: "PENDING", // Default status on creation
    },
    include: {
      customer: true,
    },
  });
};

/**
 * (Final Version) ตรวจสอบและคำนวณ Slot ที่ว่างในแต่ละวัน
 * โดยใช้ Business Logic ที่ซับซ้อน รวมถึงการจองนอกสถานที่
 * @param {Date} date - วันที่ต้องการตรวจสอบ
 * @returns {Promise<object>} Object ที่มีข้อมูล Slot และข้อมูลสรุปของวัน
 */
const getAvailabilityByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // ========================================================================
  // ส่วนที่ 1: การจัดการ Capacity เริ่มต้นของพนักงาน
  // ========================================================================
  // TODO: นี่คือส่วนที่คุณจะนำข้อมูลการเข้ากะของพนักงาน (จาก CSV หรือ DB) มาใส่
  const employeeCapacityToday = {
    REFINANCE: 1,
    ENGINEER: 1,
    GENERAL: 5,
  };

  // ========================================================================
  // ส่วนที่ 2: การดึงข้อมูลและคำนวณล่วงหน้า (Pre-calculation)
  // ========================================================================
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: {
        notIn: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"],
      },
    },
    select: { date: true, type: true, requiredTags: true, note: true },
  });

  // (สำคัญ) คำนวณคิวนอกสถานที่ของ "ทั้งวัน" ก่อน
  const offsiteRefinanceJobsToday = activeAppointments.filter(
    (apt) => apt.type === "OFFSITE" && apt.requiredTags.includes("REFINANCE")
  ).length;

  // (สำคัญ) ปรับลด Capacity ของพนักงาน Refinance ตามจำนวนคิวนอกสถานที่
  const adjustedRefinanceStaff = employeeCapacityToday.REFINANCE - offsiteRefinanceJobsToday;

  // จัดกลุ่มนัดหมายตามชั่วโมงเพื่อการคำนวณที่ง่ายขึ้น
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
    const hasHighPriorityJob = engineerJobs.some((j) =>
      j.note?.toUpperCase().includes("PRIORITY:HIGH")
    );
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

/**
 * Retrieves all appointments within a given date range.
 * Can be filtered by customerId or a search query.
 * @param {object} filters The filtering criteria.
 * @param {Date} filters.startDate The start of the date range.
 * @param {Date} filters.endDate The end of the date range.
 * @param {string} [filters.customerId] Optional customer ID to filter appointments for.
 * @param {string} [filters.query] Optional search query to filter by note or customer name.
 * @returns {Promise<Array<object>>} A flat list of appointment records matching the criteria.
 */
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
      employee: true,
    },
    orderBy: {
      date: "asc",
    },
  });
};

/**
 * Retrieves all future appointments.
 * Used to get a list of all upcoming booked slots.
 * @returns {Promise<Array<object>>} A list of upcoming appointments with selected fields.
 */
const findUpcomingAppointments = async () => {
  return await prisma.appointment.findMany({
    where: {
      date: {
        gte: new Date(),
      },
    },
    select: {
      date: true,
      type: true,
    },
    orderBy: {
      date: "asc",
    },
  });
};

/**
 * Retrieves all appointments for a specific customer.
 * @param {string} customerId The unique ID of the customer.
 * @returns {Promise<Array<object>>} A list of appointments for the specified customer.
 */
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

/**
 * Retrieves a single appointment by its unique ID.
 * @param {string} id The unique database ID of the appointment.
 * @returns {Promise<object|null>} The appointment record, or null if not found.
 */
const findAppointmentById = async (id) => {
  const appointment = await prisma.appointment.findUnique({
    where: {
      id: id,
    },
    include: {
      customer: true,
      employee: true,
    },
  });
  return appointment;
};

/**
 * (อัปเกรด) ค้นหา Appointments ทั้งหมดที่เกี่ยวข้องกับพนักงาน
 * @param {string[]} tags - Array ของ Tag ที่พนักงานมี
 * @param {string} employeeAdminId - Admin ID ของพนักงานจาก Central Server
 * @returns {Promise<Array<object>>} รายการ Appointments
 */
const findAppointmentsByTags = async (tags, employeeAdminId) => {
  // ไม่ต้องกรอง Tag อีกต่อไป เพราะ Schema เป็น String[] แล้ว
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    tags = []; // ถ้าไม่มี tag มา ให้เป็น array ว่าง
  }

  return await prisma.appointment.findMany({
    where: {
      OR: [
        // 1. งานที่ยังว่าง (PENDING) และตรงกับทักษะ
        { status: "PENDING", requiredTags: { hasSome: tags } },
        // 2. งานที่เราเป็นคนรับผิดชอบ (ค้นหาใน String)
        { adminId: employeeAdminId },
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

/**
 * Updates an existing appointment's data by its unique ID.
 * @param {string} id The unique database ID of the appointment to update.
 * @param {object} data The partial appointment data to apply.
 * @returns {Promise<object|null>} The updated appointment record, or null if not found.
 */
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
      employee: true,
    },
  });
};

/**
 * (อัปเกรด) อัปเดตสถานะ Appointment โดยพนักงาน
 * @param {string} appointmentId - ID ของ Appointment
 * @param {string} employeeInfoString - ข้อมูลพนักงานในรูปแบบ JSON String
 * @param {string} action - การกระทำ: 'ACCEPT', 'REJECT', 'OFFER'
 * @param {Date} [offerDate] - วันที่เสนอใหม่ (ถ้ามี)
 * @returns {Promise<object|null>} Appointment ที่อัปเดตแล้ว
 */
const updateAppointmentStatusByEmployee = async (
  appointmentId,
  employeeInfoString,
  action,
  offerDate
) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return null;

  let dataToUpdate = {};

  switch (action.toUpperCase()) {
    case "ACCEPT":
      // (สำคัญ) บันทึกข้อมูลพนักงานที่เป็น String ลงไปเลย
      dataToUpdate = { adminId: employeeInfoString.adminId, status: "ACCEPTED_BY_EMPLOYEE" };
      break;
    case "REJECT":
      dataToUpdate = { adminId: employeeInfoString.adminId, status: "REJECTED_BY_EMPLOYEE" };
      break;
    case "OFFER":
      dataToUpdate = { adminId: employeeInfoString.adminId, status: "OFFERED", offerDate };
      break;
    default:
      throw new Error("Invalid action");
  }

  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: dataToUpdate,
  });
};

const cancelAppointment = async (appointmentId) => {
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
    },
  });
};

/**
 * Deletes a single appointment by its unique ID.
 * @param {string} id The unique database ID of the appointment to delete.
 * @returns {Promise<{success: boolean}|null>} A success indicator, or null if the appointment was not found.
 */
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

/**
 * Deletes all appointments associated with a specific customer ID.
 * @param {string} customerId The unique ID of the customer whose appointments should be deleted.
 * @returns {Promise<{count: number}>} An object containing the count of deleted appointments.
 */
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

export default {
  createAppointment,
  getDisplayAppointment,
  getAvailabilityByDate,
  findAppointmentsByDateRange,
  findUpcomingAppointments,
  findAppointmentsByCustomerId,
  findAppointmentById,
  findAppointmentsByTags,
  updateAppointmentById,
  updateAppointmentStatusByEmployee,
  cancelAppointment,
  deleteAppointmentById,
  deleteAppointmentsByCustomerId,
};
