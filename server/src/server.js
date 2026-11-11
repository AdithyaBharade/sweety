const config = require('./config');
const { createApp } = require('./app');

// Express 5 passes listen errors (e.g. port already in use) to this callback.
createApp().listen(config.port, (err) => {
  if (err) {
    console.error(`Could not start the API on port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Sweety API running on http://localhost:${config.port}`);
});
