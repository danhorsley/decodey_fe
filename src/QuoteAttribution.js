import React, { useState, useEffect } from 'react';
import { formatMajorAttribution } from './utils';
import config from './config';

/**
 * Component to display quote attribution
 */
const QuoteAttribution = ({ hasWon, theme, textColor }) => {
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
            throw new Error('Failed to fetch attribution');
          }
          return res.json();
        })
        .then(data => {
          if (DEBUG) console.log("Attribution data received:", data);
          
          setAttribution({
            major: formatMajorAttribution(data.major_attribution),
            minor: data.minor_attribution
          });
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching attribution:', err);
          setError('Could not load attribution');
          setIsLoading(false);
        });
    }
  }, [hasWon, DEBUG]);

  // If the game isn't won yet, don't render anything
  if (!hasWon) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return <div className="attribution-container">Loading attribution...</div>;
  }

  // Show error state
  if (error) {
    return <div className="attribution-container error">{error}</div>;
  }

  // Don't render if we don't have attribution data
  if (!attribution.major && !attribution.minor) {
    return null;
  }

  // Render the attribution
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
};

export default QuoteAttribution;