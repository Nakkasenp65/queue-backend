import express from 'express';
import customerRouter from './customers/customer.route.js';
import appointmentRouter from './appointments/appointment.route.js';
import authRouter from './auth/auth.route.js';

// Combines all v1 routes
const v1Router = express.Router();

// Mount customer routes
v1Router.use('/customers', customerRouter);
v1Router.use('/appointments', appointmentRouter);
v1Router.use('/auth', authRouter);

export default v1Router;
