
// Configuration for the app
const config = {
    // API base URL - change this to your deployed backend URL
    apiUrl: process.env.REACT_APP_API_URL || 'https://uncryptbe.replit.app',
    
    // Debug flag to control logging
    DEBUG: true,
    
    // Session management
    session: {
      // Function to get any custom headers needed for requests
      getHeaders: () => {
        // Get session ID from localStorage if it exists
        const sessionId = localStorage.getItem('uncrypt-session-id');
        
        // Return headers object with session ID if available
        return {
          ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
          'Origin': window.location.origin // Ensure consistent origin
        };
      },
      
      // Function to save session ID from response headers
      saveSession: (headers) => {
        // Check if the response includes a session ID header
        const sessionId = headers.get('X-Session-ID');
        if (sessionId) {
          localStorage.setItem('uncrypt-session-id', sessionId);
          if (config.DEBUG) console.log('Saved session ID:', sessionId);
        }
      }
    },
    
    // Deployment health check - simple function that will return true for root path
    healthCheck: async () => {
      return true;
    }
  };
  
  export default config;
