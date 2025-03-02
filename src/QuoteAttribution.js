import React, { useState, useEffect } from 'react';
import { formatMajorAttribution } from './utils';
import config from './config';

/**
 * Component to display quote attribution
 * @param {boolean} hasWon - Whether the game has been won
 * @param {string} theme - The current theme ('light' or 'dark')
 * @param {string} textColor - The text color theme ('default', 'scifi-blue', or 'retro-green')
 * @param {boolean} inline - Whether to display inline (for victory screen) or as a block
 */
const QuoteAttribution = ({ hasWon, theme, textColor, inline = false }) => {
  const [attribution, setAttribution] = useState({
    major: '',
    minor: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const DEBUG = config.DEBUG || true;

  // Fetch attribution data when the game is won
  useEffect(() => {
    if (hasWon) {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) console.log("Fetching attribution data...");
      
      // Get the game_id from localStorage
      const gameId = localStorage.getItem('uncrypt-game-id');
      
      // Add game_id as a query parameter if available
      const url = gameId 
        ? `${config.apiUrl}/get_attribution?game_id=${encodeURIComponent(gameId)}`
        : `${config.apiUrl}/get_attribution`;
      
      if (DEBUG) console.log("Fetching attribution from URL:", url);
      
      // Attempt to fetch attribution, but handle failure gracefully
      fetch(url, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            console.error(`HTTP error! Status: ${res.status}`);
            // Instead of throwing an error, we'll return a default/fallback value
            return { major_attribution: "", minor_attribution: "" };
          }
          return res.json();
        })
        .then(data => {
          if (DEBUG) console.log("Attribution data received:", data);
          
          setAttribution({
            major: formatMajorAttribution(data.major_attribution || ""),
            minor: data.minor_attribution || ""
          });
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching attribution:', err);
          // Set a default value instead of an error
          setAttribution({
            major: "",
            minor: ""
          });
          setIsLoading(false);
        });
    }
  }, [hasWon, DEBUG]);

  // If the game isn't won yet, don't render anything
  if (!hasWon) {
    return null;
  }

  // Use different rendering for inline mode vs block mode
  if (inline) {
    // For inline rendering in victory screen
    if (isLoading) {
      return <span>Loading...</span>;
    }
    
    if (error) {
      return <span className="error">{error}</span>;
    }
    
    if (!attribution.major && !attribution.minor) {
      return <span>Unknown</span>;
    }
    
    return (
      <span className={`attribution-inline text-${textColor}`}>
        <span className="major-attribution">{attribution.major}</span>
        {attribution.minor && (
          <span className="minor-attribution">, {attribution.minor}</span>
        )}
      </span>
    );
  } else {
    // Standard block rendering for the main screen
    if (isLoading) {
      return <div className="attribution-container">Loading attribution...</div>;
    }
  
    if (error) {
      return <div className="attribution-container error">{error}</div>;
    }
  
    if (!attribution.major && !attribution.minor) {
      return null;
    }
  
    return (
      <div className={`attribution-container ${theme === 'dark' ? 'dark-theme' : ''} text-${textColor}`}>
        <div className="attribution-content">
          <div className="attribution-text">
            <span className="major-attribution">{attribution.major}</span>
            {attribution.minor && (
              <>
                <span className="attribution-separator">—</span>
                <span className="minor-attribution">{attribution.minor}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
};

export default QuoteAttribution;