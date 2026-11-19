/**
 * Fariza's Territory — Vercel Serverless Function Bridge
 * Bridges Vercel serverless requests to the Express application engine.
 */
const { createApp } = require('../server.js');

const app = createApp({ enableOutboxWorker: false });

module.exports = app;
