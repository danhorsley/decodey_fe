const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Create a single proxy middleware for all API endpoints
  const apiProxy = createProxyMiddleware({
    target: 'https://uncryptbe.replit.app',
    changeOrigin: true,
    // Fix for cross-origin issues
    headers: {
      'host': 'uncryptbe.replit.app',
      'origin': 'https://uncryptbe.replit.app',
    },
    // Disable automatic refreshing by controlling cache headers
    onProxyRes: (proxyRes, req, res) => {
      // Remove headers that might cause refreshing
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie']?.map(
        cookie => cookie.replace('SameSite=Lax', 'SameSite=None; Secure')
      );
      
      // Add cache control headers to prevent automatic refreshing
      proxyRes.headers['Cache-Control'] = 'no-store, max-age=0';
      
      console.log(`[Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.path}`);
    },
    // Make sure cookies are properly handled
    cookieDomainRewrite: '',
    secure: false,
    autoRewrite: true,
    protocolRewrite: 'https',
    selfHandleResponse: false,
    // Ensure all HTTP methods are allowed, not just POST
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Apply to all API endpoints
  app.use('/start', apiProxy);
  app.use('/longstart', apiProxy);
  app.use('/guess', apiProxy);
  app.use('/hint', apiProxy);
  app.use('/health', apiProxy);
  app.use('/get_attribution', apiProxy);
  app.use('/save_quote', apiProxy);
};