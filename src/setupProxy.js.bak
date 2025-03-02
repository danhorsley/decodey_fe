const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/start',
    createProxyMiddleware({
      target: 'https://uncryptbe.replit.app',
      changeOrigin: true,
    })
  );
  app.use(
    '/guess',
    createProxyMiddleware({
      target: 'https://uncryptbe.replit.app',
      changeOrigin: true,
    })
  );
  app.use(
    '/hint',
    createProxyMiddleware({
      target: 'https://uncryptbe.replit.app',
      changeOrigin: true,
    })
  );
};