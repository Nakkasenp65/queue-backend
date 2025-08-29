import prisma from '../../../lib/prisma.js';

/**
 * Creates a new customer or updates an existing one based on their `line_user_id`.
 * This effectively acts as an "upsert" operation.
 * @param data The customer data to create or update.
 * @returns The created or updated customer record.
 */
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

/**
 * Retrieves customer(s) based on provided filters.
 * Includes the 5 most recent appointments for each customer.
 * @param filters An object containing optional `lineUserId` or `phone` to filter by.
 * @returns An array of customer records matching the criteria.
 */
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
      appointments: {
        orderBy: {
          date: 'desc',
        },
        take: 5, // Get only the 5 most recent appointments
      },
    },
  });
};

/**
 * Retrieves a single customer by their unique database ID.
 * This is assumed to be the primary `id` field, not `line_user_id`.
 * (Based on your PATCH/DELETE original code using `id: id`)
 * @param id The unique database ID of the customer.
 * @returns The customer record, or null if not found.
 */
const findCustomerById = async (id) => {
  return await prisma.customer.findUnique({
    where: { id: id },
  });
};

/**
 * Retrieves a single customer by their unique `line_user_id`.
 * Includes all appointments.
 * @param lineUserId The unique LINE User ID of the customer.
 * @returns The customer record with appointments, or null if not found.
 */
const findCustomerByLineUserIdWithAppointments = async (lineUserId) => {
  return await prisma.customer.findUnique({
    where: { line_user_id: lineUserId },
    include: {
      appointments: {
        orderBy: { date: 'desc' },
      },
    },
  });
};

/**
 * Updates an existing customer's data by their unique database ID.
 * @param id The unique database ID of the customer to update.
 * @param data The partial customer data to apply.
 * @returns The updated customer record, or null if the customer was not found.
 */
const updateCustomerById = async (id, data) => {
  // First, check if the customer exists to ensure we don't try to update a non-existent record
  const existingCustomer = await prisma.customer.findUnique({ where: { id: id } });
  if (!existingCustomer) {
    return null; // Indicate customer not found to the controller
  }

  return await prisma.customer.update({
    where: { id: id },
    data: data,
  });
};

/**
 * Deletes a customer by their unique database ID.
 * @param id The unique database ID of the customer to delete.
 * @returns A success indicator, or null if the customer was not found.
 */
const deleteCustomerById = async (id) => {
  // First, check if the customer exists
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
