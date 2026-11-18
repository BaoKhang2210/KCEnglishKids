const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
require('./config/auth').jwtSecret();
const connectDB = require('./config/db');
const app = require('./app');
let server;
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
}).catch(error => { console.error(error.message); process.exitCode = 1; });
process.on('unhandledRejection', (err) => {
  console.error('Unhandled server error:', err);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});
