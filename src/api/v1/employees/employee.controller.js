import employeeService from "./employee.service.js";

async function getAppointmentByTags(req, res) {
  const { tags } = req.query;
  console.log(tags);
  const appointment = await employeeService.getEmployeeAppointmentByTag(tags);
  res.status(200).json(appointment);
}

export default { getAppointmentByTags };
