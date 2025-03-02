const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Create a single proxy middleware for all API endpoints
  const apiProxy = createProxyMiddleware({
    target: 'https://uncryptbe.replit.app',
    changeOrigin: true,
    // Log request/response for debugging
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] Request: ${req.method} ${req.path}`);
      
      // Log request headers for debugging
      console.log('[Proxy] Request headers:', req.headers);
      
      // Get the game ID from localStorage via a custom header
      const gameId = localStorage.getItem('uncrypt-game-id');
      if (gameId) {
        proxyReq.setHeader('X-Game-Id', gameId);
        console.log('[Proxy] Added game ID to headers:', gameId);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.path}`);
      
      // Log response headers for debugging
      console.log('[Proxy] Response headers:', proxyRes.headers);
      
      // Check for Set-Cookie header and log it
      if (proxyRes.headers['set-cookie']) {
        console.log('[Proxy] Set-Cookie header:', proxyRes.headers['set-cookie']);
      }
    },
    // Make sure cookies are passed through
    cookieDomainRewrite: 'localhost',
    withCredentials: true,
  });

  // Apply to all API endpoints
  app.use('/start', apiProxy);
  app.use('/guess', apiProxy);
  app.use('/hint', apiProxy);
  app.use('/get_attribution', apiProxy);
  app.use('/save_quote', apiProxy);
};