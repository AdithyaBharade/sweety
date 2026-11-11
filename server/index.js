// Entry point for Vercel's Express runtime: it needs a file that imports express
// and exports the app itself (Vercel handles the listening). Locally use `npm start`.
require('express');
const { createApp } = require('./src/app');

module.exports = createApp();
