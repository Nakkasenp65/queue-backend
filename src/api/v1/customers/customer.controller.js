import customerService from './customer.service.js';

async function createOrUpdateCustomerController(req, res) {
  try {
    const body = req.body;

    if (!body.line_user_id) {
      return res.json({ error: 'LINE User ID is required' }, 400); // Or NextResponse.json()
    }

    const customer = await customerService.createOrUpdateCustomer(body);
    return res.json(customer, 200); // Or NextResponse.json() - 200 OK for upsert
  } catch (error) {
    console.error('Controller Error (createOrUpdateCustomer):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500); // Or NextResponse.json()
  }
}

async function listCustomersController(req, res) {
  try {
    const { lineUserId, phone } = req.query;
    const customers = await customerService.findCustomers({ lineUserId, phone });
    if (lineUserId && customers.length > 0) {
      return res.json(customers[0]);
    }
    return res.json(customers);
  } catch (error) {
    console.error('Controller Error (listCustomers):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500);
  }
}

// For GET /api/customers/:id (Get specific customer by LINE User ID, from your original code)
async function getCustomerDetailsByLineIdController(req, res) {
  // Changed GET_BY_ID to a descriptive name
  try {
    const lineUserId = req.params.id; // Get parameter from path

    const customer = await customerService.findCustomerByLineUserIdWithAppointments(lineUserId);

    if (!customer) {
      return res.json({ success: false, message: 'Customer not found or not registered' }, 404);
    }
    return res.json(customer);
  } catch (error) {
    console.error('Controller Error (getCustomerDetailsByLineId):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500);
  }
}

// For PATCH /api/customers/:id (Update customer by DB ID)
async function updateCustomerController(req, res) {
  // Changed PATCH to a descriptive name
  try {
    const id = req.params.id; // Get parameter from path (this is the DB ID in your original code)
    const updatedCustomer = await customerService.updateCustomerById(id, req.body);

    if (!updatedCustomer) {
      return res.json({ success: false, message: 'Customer not found' }, 404);
    }

    return res.json(updatedCustomer);
  } catch (error) {
    console.error('Controller Error (updateCustomer):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500);
  }
}

// For DELETE /api/customers/:id (Delete customer by DB ID)
async function deleteCustomerController(req, res) {
  // Changed DELETE to a descriptive name
  try {
    const id = req.params.id; // Get parameter from path (this is the DB ID in your original code)
    const result = await customerService.deleteCustomerById(id);
    if (!result) {
      return res.json({ success: false, message: 'Customer not found' }, 404);
    }
    return res.json({ success: true, message: 'Customer deleted successfully' }, 200);
  } catch (error) {
    console.error('Controller Error (deleteCustomer):', error);
    return res.json({ success: false, message: 'Internal Server Error' }, 500);
  }
}

export default {
  createOrUpdateCustomerController,
  listCustomersController,
  getCustomerDetailsByLineIdController,
  updateCustomerController,
  deleteCustomerController,
};
