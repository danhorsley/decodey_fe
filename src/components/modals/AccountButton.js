
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import useSettingsStore from "../stores/settingsStore
import useUIStore from "../stores/uiStore";

function AccountButton() {
  const settings = useSettingsStore(state => state.settings);
  const openLogin = useAuthStore(state => state.openLogin);

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
