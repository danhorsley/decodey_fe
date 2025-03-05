
import config from '../config';

// Handle API requests
const apiService = {
  // Start a new game
  startGame: (useLongQuotes = false) => {
    return fetch(`${config.apiUrl}/start?long=${useLongQuotes ? 'true' : 'false'}`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        ...config.session.getHeaders(),
        'Accept': 'application/json'
      }
    })
    .then(response => {
      // Save session ID if present
      config.session.saveSession(response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response.json();
    });
  },
  
  // Submit a guess
  submitGuess: (requestBody) => {
    return fetch(`${config.apiUrl}/guess`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        ...config.session.getHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      // Save session ID if present
      config.session.saveSession(response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response.json();
    });
  },
  
  // Get a hint
  getHint: (requestBody) => {
    return fetch(`${config.apiUrl}/hint`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        ...config.session.getHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      // Save session ID if present
      config.session.saveSession(response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response.json();
    });
  }
};

export default apiService;
