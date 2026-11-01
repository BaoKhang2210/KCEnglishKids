require('dotenv').config();
require('./config/auth').jwtSecret();
const connectDB = require('./config/db');
const app = require('./app');
let server;
connectDB().then(() => {
  server = app.listen(process.env.PORT || 5000, () => console.log('KCEnglishKids API ready.'));
}).catch(error => { console.error(error.message); process.exitCode = 1; });
process.on('unhandledRejection', () => {
  console.error('Unhandled server error.');
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});
