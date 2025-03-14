
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useSettings, useUI } from "../../context";

function AccountButton() {
  const { settings } = useSettings();
  const { openLogin } = useUI();

  return (
    <button
      className={`account-icon ${settings.theme === "dark" ? "dark-theme" : ""}`}
      onClick={openLogin}
      aria-label="Login"
    >
      <FaUserCircle />
    </button>
  );
}

export default AccountButton;
