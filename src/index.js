import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser'; // 1. Import cookie-parser
import v1Routes from './api/v1/index.js';

const app = express();

// 2. กำหนดค่า CORS Options
const corsOptions = {
  // ระบุ Origin ของ Frontend ของคุณ
  origin: 'http://localhost:3001',
  // อนุญาตให้ส่ง Cookie ไปกับ Request
  credentials: true,
};

// Middleware
app.use(cors(corsOptions)); // 3. ใช้ corsOptions ที่กำหนดไว้
app.use(helmet());
app.use(express.json());
app.use(cookieParser()); // 4. เพิ่ม cookie-parser middleware
app.use(morgan('dev'));

// API routes
app.use('/api/v1', v1Routes);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Error handler (basic)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
