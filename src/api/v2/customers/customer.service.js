import { getDb } from "../../../lib/db.js";
import COLLECTIONS from "../../../utils/COLLECTIONS.js";
import toObjectIdSafe from "../../../utils/toObjectIdSafe.js";

async function createOrUpdateCustomer(data) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);
  const result = await col.findOneAndUpdate(
    { line_user_id: data.line_user_id },
    {
      $set: {
        line_display_name: data.line_display_name ?? null,
        fullname: data.fullname ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        note: data.note ?? null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  return result.value;
}

async function findCustomers(filters = {}) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);

  const query = {};
  if (filters.lineUserId) query.line_user_id = filters.lineUserId;
  if (filters.phone) query.phone = filters.phone;

  const items = await col.find(query).sort({ createdAt: -1 }).toArray();
  return items;
}

async function findCustomerById(id) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);
  if (!id) throw new Error("Customer ID is required");
  const oid = toObjectIdSafe(id);
  if (!oid) return null;
  return await col.findOne({ _id: oid });
}

async function findCustomerByLineUserIdWithAppointments(lineUserId) {
  const db = await getDb();
  const custCol = db.collection(COLLECTIONS.CUSTOMERS);
  const apptCol = db.collection(COLLECTIONS.APPOINTMENTS);

  const customer = await custCol.findOne({ line_user_id: lineUserId });
  if (!customer) return null;

  const apptFilter = {
    customerId: toObjectIdSafe(customer._id) || customer._id,
    status: { $nin: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"] },
  };

  const appointments = await apptCol.find(apptFilter).sort({ date: 1 }).toArray();
  // attach appointments to the returned object similar to v1 behavior
  return { ...customer, appointments };
}

async function updateCustomerById(id, data) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);
  const oid = toObjectIdSafe(id);
  if (!oid) return null;

  const update = {
    $set: {
      ...data,
      updatedAt: new Date(),
    },
  };

  const result = await col.findOneAndUpdate({ _id: oid }, update, { returnDocument: "after" });
  return result.value; // null if not found
}

async function deleteCustomerById(id) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);
  const oid = toObjectIdSafe(id);
  if (!oid) return null;

  const res = await col.deleteOne({ _id: oid });
  return res.deletedCount === 1 ? { success: true } : null;
}

export default {
  createOrUpdateCustomer,
  findCustomers,
  findCustomerById,
  findCustomerByLineUserIdWithAppointments,
  updateCustomerById,
};
