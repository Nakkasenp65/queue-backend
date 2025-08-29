import express from 'express';
import customerController from './customer.controller.js';

const customerRouter = express.Router();

// POST /api/v1/customers (create or update)
customerRouter.post('/', customerController.createOrUpdateCustomerController);

// GET /api/v1/customers (list or filter)
customerRouter.get('/', customerController.listCustomersController);

// GET /api/v1/customers/:id (get by LINE User ID)
customerRouter.get('/:id', customerController.getCustomerDetailsByLineIdController);

// PATCH /api/v1/customers/:id (update by DB ID)
customerRouter.patch('/:id', customerController.updateCustomerController);

// DELETE /api/v1/customers/:id (delete by DB ID)
customerRouter.delete('/:id', customerController.deleteCustomerController);

export default customerRouter;
