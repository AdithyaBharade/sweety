const config = require('./config');
const prisma = require('./lib/prisma');
const { createApp } = require('./app');

// Express 5 passes listen errors (e.g. port already in use) to this callback.
const server = createApp().listen(config.port, (err) => {
  if (err) {
    console.error(`Could not start the API on port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Sweety API running on http://localhost:${config.port}`);
});

// Finish in-flight requests and close DB connections before exiting (e.g. on deploys).
function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
