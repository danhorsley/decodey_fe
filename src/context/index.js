// src/context/index.js
import React, { useEffect } from "react";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { UIProvider, useUI } from "./UIContext";
import { GameStateProvider, useGameState } from "./GameStateContext";

/**
 * Combined provider that wraps all individual context providers
 * This component also manages interactions between different contexts
 */
const AppProviders = ({ children }) => {
  // We'll add a child component that can access all contexts to handle interactions
  return (
    <SettingsProvider>
      <AuthProvider>
        <UIProvider>
          <GameStateProvider>
            <ContextInteractions>{children}</ContextInteractions>
          </GameStateProvider>
        </UIProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

/**
 * Component to handle interactions between contexts
 */
const ContextInteractions = ({ children }) => {
  const { settings } = useSettings();
  const { updateMobileMode } = useUI();
  const { startGame } = useGameState();

  // Update mobile mode when settings change
  useEffect(() => {
    updateMobileMode(settings.mobileMode);
  }, [settings.mobileMode, updateMobileMode]);

  // Add more cross-context interactions here as needed

  return children;
};

/**
 * Legacy compatibility hook that combines all contexts
 * This allows existing components to continue using useAppContext
 * while we gradually migrate to more specific hooks
 */
const useAppContext = () => {
  const settings = useSettings();
  const auth = useAuth();
  const ui = useUI();
  const gameState = useGameState();

  // Combine all contexts into a single object that matches
  // the structure of the original AppContext
  return {
    ...settings,
    ...auth,
    ...ui,
    ...gameState,
  };
};

export {
  AppProviders,
  useSettings,
  useAuth,
  useUI,
  useGameState,
  useAppContext,
};
