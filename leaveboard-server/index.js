// Libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import wfhRoutes from './routes/wfhRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

import tenantRoutes from './routes/tenantRoutes.js';

// 1. Loads environment variables from a .env file into process.env
dotenv.config();

// 2. Initialize express app (creates an instances of the express application)
const app = express();

// Trust proxy for rate limiting to work correctly behind Docker/reverse proxy
app.set('trust proxy', 1);

// 3. Enable Cors - restrict to specific origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.VITE_BASE_URL,
  'http://localhost:7091',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 4. Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// 5. Middleware to parse JSON requests bodies
// without this middleware, the server cannot read JSON data sent in requests
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('server is running');
});

// 6. Middleware to handle routes
app.use('/api/auth', authRoutes); // Handles authentication routes like login and registration
app.use('/api/dashboard', dashboardRoutes); // Handles dashboard routes 
app.use('/api/wfh', wfhRoutes); // Handles work from home requests and approvals
app.use('/api/admin', adminRoutes); // Handles admin routes like user management
app.use('/api/calendar', calendarRoutes); // Handles calendar-related routes
app.use('/api/holidays', holidayRoutes); // Handles public holiday management
app.use('/api/settings', settingsRoutes); // Handles configurable settings such as WFH rules
app.use('/api/tenants', tenantRoutes); // Handles superadmin tenant CRUD

app.use((req, res, _next) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});



// Set the port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Start the server and listen on the specified port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
