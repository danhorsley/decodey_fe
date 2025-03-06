
import React, { useState } from "react";
import AccountButton from "./modals/AccountButton";

function AccountButtonWrapper() {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const handleAccountClick = () => {
    console.log("Account button clicked");
    // For now, just log the click since no links are needed yet
    // setIsAccountModalOpen(true);  // Uncomment this when you're ready to add a modal
  };

  return (
    <>
      <AccountButton onClick={handleAccountClick} />
      {/* Account modal can be added here later */}
    </>
  );
}

export default AccountButtonWrapper;
