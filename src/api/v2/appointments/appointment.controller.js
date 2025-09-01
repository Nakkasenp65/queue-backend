import appointmentService from "./appointment.service.js";

const getDashboardAppointments = async (req, res) => {
  const appointments = await appointmentService.getDashboardAppointments();
  res.status(200).json(appointments);
};

const getEmployeAppointmentsById = async (req, res) => {
  const { id } = req.params;
  const appointments = await appointmentService.getEmployeAppointmentsById(id);
  res.status(200).json(appointments);
};

export default {
  getDashboardAppointments,
  getEmployeAppointmentsById,
};
