import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useAppContext } from "../../context/AppContext";
// Login handlers
function AccountButton() {
  const { settings, openLogin } = useAppContext();

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
