
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useAppContext } from "../../context/AppContext";

function AccountButton({ onClick }) {
  const { settings } = useAppContext();
  
  return (
    <button
      className={`account-icon ${settings.theme === "dark" ? "dark-theme" : ""}`}
      onClick={onClick}
      aria-label="Account"
    >
      <FaUserCircle />
    </button>
  );
}

export default AccountButton;
