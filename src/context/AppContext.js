// src/context/AppContext.js
import React from "react";
import { useAppContext } from "./index";

// Create a context for backward compatibility
const AppContext = React.createContext(null);

// Export a provider that uses the new context system but exposes it through the old API
export const AppProvider = ({ children }) => {
  const contextValue = useAppContext();

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

// Export the old hook for backward compatibility
export const useAppContext = () => {
  return React.useContext(AppContext);
};

export default AppContext;
