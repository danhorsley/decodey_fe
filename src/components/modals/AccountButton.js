import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useAppContext } from "../../context/AppContext";
import { openLogin, closeLogin } from "../../pages/Game";

function AccountButton({ onClick }) {
  const { settings } = useAppContext();

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
