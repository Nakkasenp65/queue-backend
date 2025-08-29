import employeeService from './employee.service';

/**
 * Retrieves an employee by their staff ID.
 * @param {object} req The request object.
 * @param {object} res The response object.
 */
async function findEmployeeByStaffIdController(req, res) {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.json({ error: 'staffId is required' }, 400);
    }

    const employee = await employeeService.findEmployeeByStaffId(staffId);

    if (!employee) {
      return res.json({ success: false, message: 'Employee not found' }, 404);
    }

    return res.json({ success: true, data: employee });
  } catch (error) {
    console.error('Controller Error (findEmployeeByStaffIdController):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500);
  }
}

export default { findEmployeeByStaffIdController };
