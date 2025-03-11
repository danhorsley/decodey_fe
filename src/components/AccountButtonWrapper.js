// src/components/AccountButtonWrapper.js
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useModalContext } from "./modals/ModalManager";

function AccountButtonWrapper() {
  // Get settings directly from context
  const { settings } = useSettings();

  // Get auth state directly from context
  const { isAuthenticated, user, logout } = useAuth();

  // Get modal functions directly from context
  const { openLogin } = useModalContext();

  const handleClick = () => {
    console.log("Account button clicked, auth state:", { isAuthenticated, username: user?.username });

    // If authenticated, log out, otherwise open login modal
    if (isAuthenticated) {
      if (confirm("Do you want to log out?")) {
        logout();
      }
    } else {
      openLogin();
    }
  }