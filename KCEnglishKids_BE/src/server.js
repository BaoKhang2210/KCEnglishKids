const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server Running]: http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  server.close(() => process.exit(1));
});
