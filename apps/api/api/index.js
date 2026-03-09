// Pre-bundled Vercel serverless function
const handler = require('../dist/vercel.cjs');
module.exports = handler.default || handler;
