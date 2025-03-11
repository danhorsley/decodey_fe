// src/components/AccountButtonWrapper.js
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import { useModalContext } from "./modals/ModalManager";

function AccountButtonWrapper() {
  // Get settings directly from context
  const { settings } = useSettings();

  // Get modal functions directly from context
  const { openLogin } = useModalContext();

  const handleClick = () => {
    console.log("Account button clicked");
    openLogin();
  };

  return (
    <button
      className={`account-icon ${settings?.theme === "dark" ? "dark-theme" : ""}`}
      onClick={handleClick}
      aria-label="Login"
    >
      <FaUserCircle />
    </button>
  );
}

export default AccountButtonWrapper;
