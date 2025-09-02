import { NotificationType } from "../../../generated/prisma/index.js";
import prisma from "../../../lib/prisma.js";

const createNewAppointmentNotification = async (
  notificationTitle,
  notificationDescription,
  notificationService,
  appointmentId
) => {
  const notification = await prisma.notificationLog.create({
    data: {
      title: notificationTitle,
      description: notificationDescription,
      type: NotificationType.NEW_BOOKING_REQUEST,
      appointment: { connect: { id: appointmentId } },
      service: notificationService,
    },
  });
  return notification;
};

const createAcceptAppointmentNotification = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
    },
  });

  const { customer } = appointment;

  const notification = await prisma.notificationLog.create({
    data: {
      title: "พนักงานอนุมัติการจองคิวแล้ว",
      type: NotificationType.BOOKING_CONFIRMED,
      appointment: {
        connect: {
          id: appointmentId,
        },
      },
      recipient: {
        connect: {
          id: customer.id,
        },
      },
    },
  });

  return notification;
};

const createRejectAppointmentNotification = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
    },
  });

  const { customer } = appointment;

  const notification = await prisma.notificationLog.create({
    data: {
      title: "พนักงานปฏิเสธการจองคิวแล้ว",
      description: "คำฮธิบายเหตุ",
      type: NotificationType.BOOKING_CANCELLED_BY_STAFF,
      appointment: {
        connect: {
          id: appointmentId,
        },
      },
      recipient: {
        connect: {
          id: customer.id,
        },
      },
    },
  });

  return notification;
};

const createOfferedAppointmentNofitication = async (appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
    },
  });

  const { customer } = appointment;

  const notification = await prisma.notificationLog.create({
    data: {
      title: "พนักงานเสนอเวลาบริการใหม่",
      description: "คำฮธิบายเหตุ",
      type: NotificationType.BOOKING_NEW_TIME_OFFER,
      appointment: {
        connect: {
          id: appointmentId,
        },
      },
      recipient: {
        connect: {
          id: customer.id,
        },
      },
    },
  });

  return notification;
};

const getNotificationByTags = async (tags) => {
  console.log(tags);
  const notifications = await prisma.notificationLog.findMany({
    where: {
      appointment: {
        requiredTags: {
          hasSome: tags,
        },
      },
    },
  });

  return notifications;
};

const getCustomerNotificationByLineId = async (line_user_id) => {
  const notifications = await prisma.notificationLog.findMany({
    where: {
      recipient: {
        line_user_id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      appointment: {
        select: { adminInfo: true, employeeResponse: true, status: true, note: true, serviceType: true },
      },
    },
  });

  return notifications;
};

export default {
  createNewAppointmentNotification,
  createAcceptAppointmentNotification,
  createRejectAppointmentNotification,
  createOfferedAppointmentNofitication,
  getCustomerNotificationByLineId,
  getNotificationByTags,
};
