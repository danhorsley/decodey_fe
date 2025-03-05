
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Create a single proxy middleware for all API endpoints
  const apiProxy = createProxyMiddleware({
    target: 'https://uncryptbe.replit.app',
    changeOrigin: true,
    // Fix for "Invalid Host Header" error and CORS issues
    headers: {
      'host': 'uncryptbe.replit.app',
      'origin': 'https://uncryptbe.replit.app', // Match the target domain
    },
    secure: true,
    // Log request/response for debugging
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] Request: ${req.method} ${req.path}`);
      
      // Get the game ID from localStorage via a custom header
      const gameId = req.headers['x-game-id'] || '';
      if (gameId) {
        proxyReq.setHeader('X-Game-Id', gameId);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.path}`);
    },
    // Make sure cookies are passed through
    cookieDomainRewrite: { 
      '*': '' 
    },
    withCredentials: true,
  });

  // Apply to all API endpoints
  app.use('/start', apiProxy);
  app.use('/longstart', apiProxy);
  app.use('/guess', apiProxy);
  app.use('/hint', apiProxy);
  app.use('/health', apiProxy);
  app.use('/get_attribution', apiProxy);
  app.use('/save_quote', apiProxy);
}
