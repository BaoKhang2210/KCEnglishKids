const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
require('./config/auth').jwtSecret();
const connectDB = require('./config/db');
const app = require('./app');

let server;

const shutdown = (code = 0) => {
  if (server) {
    server.close(() => process.exit(code));
  } else {
    process.exit(code);
  }
};

// Graceful restart for nodemon
process.once('SIGUSR2', () => {
  if (server) {
    server.close(() => process.kill(process.pid, 'SIGUSR2'));
  } else {
    process.kill(process.pid, 'SIGUSR2');
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled server error:', err);
  shutdown(1);
});

connectDB().then(() => {
  server = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
    console.log('KCEnglishKids API ready on port ' + (process.env.PORT || 5000));
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Lỗi] Cổng ${process.env.PORT || 5000} đang bị chiếm dụng bởi một tiến trình Node khác (EADDRINUSE).`);
      console.error('Máy chủ BE đã đang chạy ở chế độ nền. Bạn không cần chạy thêm tiến trình npm run dev thứ hai.');
    } else {
      console.error('[Lỗi khởi động server]:', err);
    }
    process.exit(1);
  });
}).catch(error => {
  console.error('[DB Error]:', error.message);
  process.exitCode = 1;
});
