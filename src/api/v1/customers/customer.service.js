import prisma from "../../../lib/prisma.js";

const createOrUpdateCustomer = async (data) => {
  return await prisma.customer.upsert({
    where: { line_user_id: data.line_user_id },
    update: {
      line_display_name: data.line_display_name,
      fullname: data.fullname,
      phone: data.phone,
      email: data.email,
      note: data.note,
    },
    create: {
      line_user_id: data.line_user_id,
      line_display_name: data.line_display_name,
      fullname: data.fullname,
      phone: data.phone,
      email: data.email,
      note: data.note,
    },
  });
};

const findCustomers = async (filters) => {
  const whereClause = {};

  if (filters.lineUserId) {
    whereClause.line_user_id = filters.lineUserId;
  }
  if (filters.phone) {
    whereClause.phone = filters.phone;
  }

  return await prisma.customer.findMany({
    where: whereClause,
    include: {
      appointments: true,
    },
  });
};

const findCustomerById = async (id) => {
  return await prisma.customer.findUnique({
    where: { id: id },
  });
};

const findCustomerByLineUserIdWithAppointments = async (lineUserId) => {
  return await prisma.customer.findUnique({
    where: { line_user_id: lineUserId },
  });
};

const updateCustomerById = async (id, data) => {
  const existingCustomer = await prisma.customer.findUnique({ where: { id: id } });
  if (!existingCustomer) {
    return null; // Indicate customer not found to the controller
  }

  return await prisma.customer.update({
    where: { id: id },
    data: data,
  });
};

const deleteCustomerById = async (id) => {
  const existingCustomer = await prisma.customer.findUnique({ where: { id: id } });
  if (!existingCustomer) {
    return null; // Indicate customer not found to the controller
  }

  await prisma.customer.delete({
    where: { id: id },
  });
  return { success: true };
};

export default {
  createOrUpdateCustomer,
  findCustomers,
  findCustomerById,
  findCustomerByLineUserIdWithAppointments,
  updateCustomerById,
  deleteCustomerById,
};
