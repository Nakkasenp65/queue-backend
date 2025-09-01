import prisma from "../../../lib/prisma.js";

const getEmployeeAppointmentByTag = async (tags = []) => {
  console.log("inside tags: ", tags);
  const appointments = await prisma.appointment.findMany({
    where: {
      requiredTags: {
        hasSome: tags,
      },
    },
    include: {
      customer: true,
    },
  });
  return appointments;
};

export default {
  getEmployeeAppointmentByTag,
};
