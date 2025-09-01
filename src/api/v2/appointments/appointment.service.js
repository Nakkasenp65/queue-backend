import { getDb } from "../../../lib/db.js";
import COLLECTIONS from "../../../utils/COLLECTIONS.js";

async function getDashboardAppointments() {
  const db = await getDb();
  const appointmentCollection = db.collection(COLLECTIONS.APPOINTMENTS);
  const appointments = await appointmentCollection.find().toArray();
  return appointments;
}

async function getEmployeAppointmentsById(id) {
  const db = await getDb();
  const appointmentCollection = db.collection(COLLECTIONS.APPOINTMENTS);
  const appointments = await appointmentCollection
    .aggregate([
      {
        $match: { "adminInfo.adminId": { $eq: id } },
      },
      {
        $lookup: {
          from: COLLECTIONS.CUSTOMERS,
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
    ])
    .toArray();
  return appointments;
}

async function createNewUserAppointment(newCustomerAppointmentData) {
  const db = await getDb();
  const customerCollection = db.collection(COLLECTIONS.CUSTOMERS);
  const appointmentCollection = db.collection(COLLECTIONS.APPOINTMENTS);
  const newCustomer = await customerCollection.insertOne({
    line_display_name: newCustomerAppointmentData.customer.line_display_name,
    fullname: newCustomerAppointmentData.customer.fullname,
    phone: newCustomerAppointmentData.customer.phone,
    line_user_id: newCustomerAppointmentData.customer.line_user_id,
    email: newCustomerAppointmentData.customer.email,
    picture_url: newCustomerAppointmentData.customer.picture_url,
    createdAt: new Date(),
    updatedAt: new Date(),
    appointments: [],
  });

  if (!newCustomer) {
    throw new Error("Failed to create new customer");
  }

  const result = await appointmentCollection.insertOne({
    ...newCustomerAppointmentData.appointmentData,
    customerId: newCustomer.insertedId.toString(), // Store as string to match Prisma schema
  });

  // Return the created appointment with its ID
  return {
    ...newCustomerAppointmentData.appointmentData,
    customerId: newCustomer.insertedId.toString(),
    _id: result.insertedId,
  };
}

export default {
  getDashboardAppointments,
  getEmployeAppointmentsById,
  createNewUserAppointment,
};
