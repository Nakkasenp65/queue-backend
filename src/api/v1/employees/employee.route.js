import express from 'express';
import employeeController from './employee.controller';

const employeeRouter = express.Router();

/**
 * @route   GET /api/v1/employees/:staffId
 * @desc    Get an employee by their staff ID
 * @example http://localhost:3000/api/v1/employees/EMP001
 */
employeeRouter.get('/:staffId', employeeController.findEmployeeByStaffIdController);

export default employeeRouter;
