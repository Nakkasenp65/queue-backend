import { getDb } from "../../../lib/db.js";
import { ObjectId } from "mongodb";

const NOTIFICATION_TYPE = {
  NEW_BOOKING_REQUEST: "NEW_BOOKING_REQUEST",
  BOOKING_MODIFIED_BY_USER: "BOOKING_MODIFIED_BY_USER",
  BOOKING_CANCELLED_BY_USER_ALERT: "BOOKING_CANCELLED_BY_USER_ALERT",
  QUEUE_CHECK_IN: "QUEUE_CHECK_IN",
  BOOKING_RECEIVED: "BOOKING_RECEIVED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  BOOKING_MODIFIED_BY_STAFF: "BOOKING_MODIFIED_BY_STAFF",
  BOOKING_CANCELLED_BY_STAFF: "BOOKING_CANCELLED_BY_STAFF",
  BOOKING_CANCELLED_BY_USER: "BOOKING_CANCELLED_BY_USER",
  QUEUE_REMINDER_UPCOMING: "QUEUE_REMINDER_UPCOMING",
  QUEUE_REMINDER_IMMINENT: "QUEUE_REMINDER_IMMINENT",
  QUEUE_CALLED: "QUEUE_CALLED",
  QUEUE_SKIPPED: "QUEUE_SKIPPED",
  FEEDBACK_REQUEST: "FEEDBACK_REQUEST",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  PROMOTION_ALERT: "PROMOTION_ALERT",
  TEST: "TESTING_NOTIFICATION_TYPE",
  ERROR: "ERROR",
};

const COLLECTION_NAME = {
  NOTIFICATION: "Notification",
};

async function createNotification(notificationData) {
  const db = await getDb();
  const type = NOTIFICATION_TYPE[notificationData.notificationType];

  if (!type) {
    throw new Error("Invalid notification type");
  }

  const notificationDataForStaff = {
    notificationType: type,
    recipient: {
      type: notificationData.recipientType,
      id: new ObjectId(`${notificationData.recipientId}`),
    },
    title: notificationData.title,
    description: notificationData.description || null,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db
    .collection(COLLECTION_NAME.NOTIFICATION)
    .insertOne(notificationDataForStaff);
  return result.insertedId;
}

async function createCustomerNotification(
  notificationType,
  title,
  description,
  recipientType = "CUSTOMER",
  recipientId
) {
  const db = await getDb();
  const notificationDataForCustomer = {
    notificationType: NOTIFICATION_TYPE[notificationType] || NOTIFICATION_TYPE.ERROR,
    recipient: {
      type: recipientType,
      id: new ObjectId(`${recipientId}`),
    },
    title,
    description: description || null,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db
    .collection(COLLECTION_NAME.NOTIFICATION)
    .insertOne(notificationDataForCustomer);
  return result.insertedId;
}

async function createEmployeeNotification(
  notificationType,
  title,
  description,
  recipientType = "EMPLOYEE",
  recipientId
) {
  const db = await getDb();
  const notificationDataForEmployee = {
    notificationType: NOTIFICATION_TYPE[notificationType] || NOTIFICATION_TYPE.ERROR,
    recipient: {
      type: recipientType,
      id: new ObjectId(`${recipientId}`),
    },
    title,
    description: description || null,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db
    .collection(COLLECTION_NAME.NOTIFICATION)
    .insertOne(notificationDataForEmployee);
  return result.insertedId;
}

export default {
  createNotification,
  createCustomerNotification,
  createEmployeeNotification,
};
