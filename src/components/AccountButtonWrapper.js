// src/components/AccountButtonWrapper.js
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useAppContext } from "../context/AppContext";
import { useModalContext } from "./modals/ModalManager";

function AccountButtonWrapper() {
  const { settings } = useAppContext();
  const { openLogin } = useModalContext();

  const handleClick = () => {
    console.log("Account button clicked");
    if (openLogin) {
      openLogin();
    } else {
      console.warn("openLogin function not available");
    }
  };

  return (
    <>
      <button
        className={`account-icon ${settings?.theme === "dark" ? "dark-theme" : ""}`}
        onClick={handleClick}
        aria-label="Login"
      >
        <FaUserCircle />
      </button>
    </>
  );
}

export default AccountButtonWrapper;
