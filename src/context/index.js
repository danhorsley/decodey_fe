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
export const AppProviders = ({ children }) => {
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

  // Update mobile mode when settings change
  useEffect(() => {
    if (settings && updateMobileMode) {
      updateMobileMode(settings.mobileMode);
    }
  }, [settings, updateMobileMode]);

  return children;
};

/**
 * Legacy compatibility hook that combines all contexts
 * This allows existing components to continue using useAppContext
 * while we gradually migrate to more specific hooks
 */
export const useAppContext = () => {
  // Always call hooks unconditionally, regardless of their values
  const settings = useSettings();
  const auth = useAuth();
  const ui = useUI();
  const gameState = useGameState();

  // If any contexts are undefined (which shouldn't happen
  // if all providers are in the tree), return null
  if (!settings || !auth || !ui || !gameState) {
    console.warn("One or more contexts are undefined in useAppContext");
    return null;
  }

  // Combine all contexts into a single object that matches
  // the structure of the original AppContext
  return {
    ...settings,
    ...auth,
    ...ui,
    ...gameState,
  };
};

export { useSettings, useAuth, useUI, useGameState };
