import React, { useState } from 'react';
import config from './config';

/**
 * Component for saving a quote to the curated list
 */
const SaveButton = ({ hasWon, playSound }) => {
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const DEBUG = config.DEBUG || true;

  // Don't render if the game isn't won yet
  if (!hasWon) {
    return null;
  }

  const handleSaveQuote = () => {
    setIsLoading(true);
    setSaveStatus(null);
    
    if (DEBUG) console.log("Saving quote...");
    
    // Get the game_id from localStorage
    const gameId = localStorage.getItem('uncrypt-game-id');
    
    // Prepare request body
    const requestBody = {};
    if (gameId) {
      requestBody.game_id = gameId;
      if (DEBUG) console.log("Using game_id for save:", gameId);
    }
    
    fetch(`${config.apiUrl}/save_quote`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
      .then(res => {
        if (!res.ok) {
          console.error(`HTTP error! Status: ${res.status}`);
          throw new Error('Failed to save quote');
        }
        return res.json();
      })
      .then(data => {
        if (DEBUG) console.log("Save response:", data);
        
        setSaveStatus({ success: true, message: data.message });
        setIsLoading(false);
        // Play a success sound if available
        if (playSound) {
          playSound('correct');
        }
      })
      .catch(err => {
        console.error('Error saving quote:', err);
        setSaveStatus({ success: false, message: 'Failed to save quote' });
        setIsLoading(false);
      });
  };

  // Status message styling classes
  const statusClass = saveStatus 
    ? (saveStatus.success ? 'save-success' : 'save-error') 
    : '';

  return (
    <div className="save-quote-container">
      <button 
        className="save-button"
        onClick={handleSaveQuote}
        disabled={isLoading}
      >
        {isLoading ? 'Saving...' : 'Save to Curated List'}
      </button>
      
      {saveStatus && (
        <div className={`save-status ${statusClass}`}>
          {saveStatus.message}
        </div>
      )}
    </div>
  );
};

export default SaveButton;