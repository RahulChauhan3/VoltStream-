require('dotenv').config();
const createApp = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGODB_URI);
  const server = createApp().listen(PORT, () => console.log(`[server] VoltStream API on http://localhost:${PORT}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
