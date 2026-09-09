// Vercel serverless entry point. Vercel serves everything under public/ as
// static assets directly; only /api/* and /admin are routed here (see
// vercel.json) and handled by the Express app.
module.exports = require('../server');
