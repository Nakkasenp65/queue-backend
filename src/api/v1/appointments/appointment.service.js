// import prisma from '../../../lib/prisma.js';
import { startOfDay, endOfDay } from "date-fns";
import prisma from "../../../lib/prisma.js";
import { EmployeeAbilityTag } from "../../../generated/prisma/index.js";

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
      employee: true,
    },
  });
};

/**
 * ตรวจสอบและคำนวณ Slot ที่ว่างในแต่ละวันตามประเภทบริการ
 * @param {Date} date - วันที่ต้องการตรวจสอบ
 * @returns {Promise<object>} Object ที่มีข้อมูล Slot ที่ถูกจองไปแล้วในแต่ละชั่วโมง
 */
const getAvailabilityByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // ดึงนัดหมายทั้งหมดในวันนั้นๆ
  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      date: true,
      type: true,
      requiredTags: true,
    },
  });

  // TODO: เพิ่ม Logic การคำนวณคิวว่างที่ซับซ้อนของคุณที่นี่
  // เช่น การนับจำนวนพนักงานที่มี Tag "ENGINEER", "REFINANCE"
  // แล้วนำมาคำนวณกับ `appointments` ที่จองไปแล้ว
  // ในตัวอย่างนี้จะใช้ Logic แบบง่ายไปก่อน

  const slots = {};
  const HOURS = Array.from({ length: 9 }, (_, i) => 11 + i); // 11:00 - 19:00

  HOURS.forEach((hour) => {
    slots[hour] = {
      REFINANCE: { onsite: 0, online: 0, offsite: 0 },
      ENGINEER: { onsite: 0, online: 0, offsite: 0 },
      GENERAL: { onsite: 0, online: 0, offsite: 0 },
    };
  });

  appointments.forEach((apt) => {
    const hour = new Date(apt.date).getHours();
    if (slots[hour]) {
      const tag = apt.requiredTags[0] || "GENERAL"; // สมมติว่ามี 1 tag หลัก
      const type = apt.type.toLowerCase();
      if (slots[hour][tag] && slots[hour][tag][type] !== undefined) {
        slots[hour][tag][type]++;
      }
    }
  });

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
    include: {
      employee: true, // Customer details can be fetched separately if needed
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
 * ค้นหา Appointments ที่ยังว่าง (Pending) และตรงกับทักษะ (Tags) ที่ระบุ
 * @param {string[]} tags - Array ของ Tag ที่ต้องการค้นหา เช่น ["admin", "ENGINEER"]
 * @returns {Promise<Array<object>>} รายการ Appointments ที่ตรงเงื่อนไข
 */
const findAppointmentsByTags = async (tags) => {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return [];
  }

  // 2. กรอง Array 'tags' ให้เหลือเฉพาะค่าที่อยู่ใน Enum EmployeeAbilityTag เท่านั้น
  //    Object.values(EmployeeAbilityTag) จะได้ผลลัพธ์เป็น ["ENGINEER", "REFINANCE", "GENERAL"]
  const validTags = Object.values(EmployeeAbilityTag);
  const filteredTags = tags.filter((tag) => validTags.includes(tag.toUpperCase())); // ใช้ toUpperCase() เพื่อความแน่นอน

  // 3. (สำคัญ) ตรวจสอบว่าหลังกรองแล้วยังมี tag เหลืออยู่หรือไม่
  //    ถ้าพนักงานมีแค่ role "admin" อย่างเดียว filteredTags จะเป็น array ว่าง
  if (filteredTags.length === 0) {
    return []; // ไม่ต้องค้นหาต่อ เพราะไม่มี tag ที่ตรงกัน
  }

  const appointment = await prisma.appointment.findMany({
    where: {
      employeeId: null,
      status: "PENDING",
      requiredTags: {
        hasSome: filteredTags,
      },
    },
    include: {
      customer: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  console.log("appointment:", appointment);

  return appointment;
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
 * อัปเดตสถานะ Appointment โดยพนักงาน
 * @param {string} appointmentId - ID ของ Appointment
 * @param {string} employeeId - ID ของพนักงานที่กระทำ
 * @param {string} action - การกระทำ: 'ACCEPT', 'REJECT', 'OFFER'
 * @param {Date} [offerDate] - วันที่เสนอใหม่ (ถ้ามี)
 * @returns {Promise<object|null>} Appointment ที่อัปเดตแล้ว หรือ null ถ้าไม่พบ
 */
const updateAppointmentStatusByEmployee = async (appointmentId, employeeId, action, offerDate) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return null;

  let dataToUpdate = {};

  switch (action.toUpperCase()) {
    case "ACCEPT":
      dataToUpdate = { employeeId, status: "ACCEPTED_BY_EMPLOYEE" };
      break;
    case "REJECT":
      dataToUpdate = { status: "REJECTED_BY_EMPLOYEE" };
      break;
    case "OFFER":
      dataToUpdate = { status: "OFFERED", offerDate };
      break;
    default:
      throw new Error("Invalid action");
  }

  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: dataToUpdate,
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

export default {
  createAppointment,
  getAvailabilityByDate,
  findAppointmentsByDateRange,
  findUpcomingAppointments,
  findAppointmentsByCustomerId,
  findAppointmentById,
  findAppointmentsByTags,
  updateAppointmentById,
  updateAppointmentStatusByEmployee,
  deleteAppointmentById,
  deleteAppointmentsByCustomerId,
};
