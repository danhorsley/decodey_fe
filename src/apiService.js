import config from './config';

const apiService = {
  // Function to check API health status
  checkHealth: async () => {
    try {
      const response = await fetch(`${config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          ...config.session.getHeaders()
        },
        credentials: 'include',
        mode: 'cors'
      });

      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Other API methods can be added here
  startGame: async (useLongQuotes = false) => {
    try {
      // Use longstart endpoint if useLongQuotes is true
      const endpoint = useLongQuotes ? '/longstart' : '/start';
      
      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...config.session.getHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      return await response.json();
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  },

  submitGuess: async (gameId, encryptedLetter, guessedLetter) => {
    try {
      const requestBody = {
        encrypted_letter: encryptedLetter,
        guessed_letter: guessedLetter.toUpperCase()
      };

      if (gameId) {
        requestBody.game_id = gameId;
      }

      const response = await fetch(`${config.apiUrl}/guess`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.session.getHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      return await response.json();
    } catch (error) {
      console.error('Error submitting guess:', error);
      throw error;
    }
  },
  getHint: async () => {
    try {
      const response = await fetch(`${config.apiUrl}/hint`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...config.session.getHeaders()
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      return await response.json();
    } catch (error) {
      console.error('Error getting hint:', error);
      throw error;
    }
  },
  getAttribution: async () => {
    // Get game ID from localStorage
    const gameId = localStorage.getItem('uncrypt-game-id');

    // Construct URL with game_id as a query parameter if available
    const endpoint = gameId
      ? `/get_attribution?game_id=${encodeURIComponent(gameId)}`
      : '/get_attribution';

    try {
      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          ...config.session.getHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      return await response.json();
    } catch (error) {
      console.error('Error fetching attribution:', error);
      // Return a default value on error to avoid breaking the UI
      return {
        major_attribution: '',
        minor_attribution: ''
      };
    }
  },
  saveQuote: async () => {
    try {
      const response = await fetch(`${config.apiUrl}/save_quote`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...config.session.getHeaders()
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Save session if applicable
      config.session.saveSession(response.headers);

      return await response.json();
    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    }
  }
};

export default apiService;