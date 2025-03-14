const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Block WebSocket upgrade attempts
  app.use((req, res, next) => {
    if (req.headers.upgrade === "websocket") {
      console.log("Blocked WebSocket upgrade attempt");
      return res.status(400).end();
    }
    next();
  });

  // Create a single proxy middleware for all API endpoints
  // Get backend URL from environment variable or fallback to default
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    "https://7264097a-b4a2-42c7-988c-db8c0c9b107a-00-1lx57x7wg68m5.janeway.replit.dev";
  console.log(`[Proxy] Using backend URL: ${backendUrl}`);

  // Extract hostname from URL for headers
  const backendHostname = new URL(backendUrl).hostname;

  const apiProxy = createProxyMiddleware({
    target: backendUrl,
    changeOrigin: true,
    // Disable WebSocket upgrades
    ws: false,
    // Fix for "Invalid Host Header" error and CORS issues
    headers: {
      host: backendHostname,
      origin: backendUrl, // Match the target domain
    },
    secure: true,
    // Log request/response for debugging
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Proxy] Request: ${req.method} ${req.path}`);

      // Get the game ID from localStorage via a custom header
      const gameId = req.headers["x-game-id"] || "";
      if (gameId) {
        proxyReq.setHeader("X-Game-Id", gameId);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `[Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.path}`,
      );
    },
    // Make sure cookies are passed through
    cookieDomainRewrite: {
      "*": "",
    },
    withCredentials: true,
  });

  // Apply to all API endpoints
  app.use("/start", apiProxy);
  app.use("/longstart", apiProxy);
  app.use("/guess", apiProxy);
  app.use("/hint", apiProxy);
  app.use("/health", apiProxy);
  app.use("/get_attribution", apiProxy);
  app.use("/save_quote", apiProxy);
  app.use("/check-active-game", apiProxy);
  app.use("/continue-game", apiProxy);
};
