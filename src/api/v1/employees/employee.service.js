import prisma from '../../../lib/prisma.js';

/**
 * ค้นหาหรือสร้างพนักงานในฐานข้อมูลจากข้อมูลที่ได้จาก Central Server (Upsert logic)
 * @param {object} centralData - ข้อมูลพนักงานที่ได้จาก Central Server API
 * @returns {Promise<object>} ข้อมูลพนักงานในฐานข้อมูลของเรา
 */
const findOrCreateEmployee = async (centralData) => {
  // ใช้ upsert เพื่อให้โค้ดกระชับขึ้น: ถ้าเจอ centralServerId ก็ update, ถ้าไม่เจอก็ create
  const employee = await prisma.employee.upsert({
    where: {
      centralServerId: centralData.adminId,
    },
    update: {
      fullname: centralData.fullName || centralData.username,
      staffId: centralData.staffId,
      centralRoles: centralData.roles || [],
      role: centralData.roles?.includes('admin') ? 'ADMIN' : 'STAFF',
    },
    create: {
      centralServerId: centralData.adminId,
      fullname: centralData.fullName || centralData.username,
      email: centralData.email || `${centralData.username}@default.com`,
      staffId: centralData.staffId,
      centralRoles: centralData.roles || [],
      role: centralData.roles?.includes('admin') ? 'ADMIN' : 'STAFF',
    },
  });
  return employee;
};

/**
 * ค้นหาพนักงานด้วย ID ของฐานข้อมูลเรา
 * @param {string} employeeId - ID ของพนักงานในฐานข้อมูลของเรา
 * @returns {Promise<object|null>} ข้อมูลพนักงาน หรือ null ถ้าไม่พบ
 */
const findEmployeeById = async (employeeId) => {
  return await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  });
};

/**
 * ค้นหางาน (Appointments) ที่ยังว่างและตรงกับทักษะ (Tags) ของพนักงาน
 * @param {string} employeeId - ID ของพนักงานที่ต้องการค้นหางาน
 * @returns {Promise<Array<object>>} รายการ Appointments ที่พนักงานคนนี้สามารถรับได้
 */
const findAvailableAppointmentsByTags = async (employeeId) => {
  // 1. ดึงข้อมูลพนักงานคนนั้นๆ เพื่อเอา centralRoles
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { centralRoles: true }, // ดึงมาแค่ field ที่ต้องการใช้
  });

  if (!employee || !employee.centralRoles || employee.centralRoles.length === 0) {
    // ถ้าไม่พบพนักงาน หรือพนักงานไม่มี role/tag เลย ก็คืนค่าว่างไป
    return [];
  }

  // 2. ค้นหา Appointments ที่ตรงเงื่อนไข
  return await prisma.appointment.findMany({
    where: {
      // เงื่อนไข 1: ต้องเป็นงานที่ยังไม่มีใครรับ (employeeId เป็น null)
      employeeId: null,
      // เงื่อนไข 2: ต้องเป็นงานที่รอการตอบรับจากพนักงาน (สถานะ PENDING)
      status: 'PENDING',
      // เงื่อนไข 3: (สำคัญที่สุด) requiredTags ของ Appointment ต้องมีอย่างน้อย 1 tag
      // ที่ตรงกับ centralRoles ของพนักงาน
      requiredTags: {
        hasSome: employee.centralRoles,
      },
    },
    include: {
      // ดึงข้อมูลลูกค้ามาด้วย เพื่อแสดงผลใน UI
      customer: true,
    },
    orderBy: {
      // เรียงตามวันที่นัดหมายจากเก่าไปใหม่
      date: 'asc',
    },
  });
};

/**
 * มอบหมาย Appointment ให้กับพนักงาน (พนักงานรับงาน)
 * @param {string} appointmentId - ID ของ Appointment ที่จะมอบหมาย
 * @param {string} employeeId - ID ของพนักงานที่จะรับงาน
 * @returns {Promise<object>} ข้อมูล Appointment ที่อัปเดตแล้ว
 */
const assignAppointmentToEmployee = async (appointmentId, employeeId) => {
  return await prisma.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      employeeId: employeeId,
      // เปลี่ยนสถานะเป็น 'ACCEPTED_BY_EMPLOYEE' หรือ 'CONFIRMED' ตาม Flow งานของคุณ
      status: 'ACCEPTED_BY_EMPLOYEE',
    },
  });
};

/**
 * (ฟังก์ชันที่เพิ่มใหม่) ค้นหาพนักงานด้วย Staff ID ที่ได้จาก Central Server
 * @param {string} staffId - Staff ID ของพนักงาน
 * @returns {Promise<object|null>} ข้อมูลพนักงาน หรือ null ถ้าไม่พบ
 */
const findEmployeeByStaffId = async (staffId) => {
  if (!staffId) {
    return null; // ถ้าไม่มี staffId ส่งมา ก็ไม่ต้องค้นหา
  }
  return await prisma.employee.findFirst({
    where: {
      staffId: staffId,
    },
  });
};

export default {
  findOrCreateEmployee,
  findEmployeeById,
  findAvailableAppointmentsByTags,
  assignAppointmentToEmployee,
  findEmployeeByStaffId,
};
