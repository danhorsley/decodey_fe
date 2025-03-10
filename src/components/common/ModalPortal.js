// src/components/common/ModalPortal.js
import React from "react";
import ReactDOM from "react-dom";

const ModalPortal = ({ children, isOpen }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay">{children}</div>,
    document.body,
  );
};

export default ModalPortal;
