// src/components/common/TestModal.js
import React from "react";
import ModalPortal from "./ModalPortal";
import "../../Styles/Modal.css";

const TestModal = ({ isOpen, onClose, title, children }) => {
  return (
    <ModalPortal isOpen={isOpen}>
      <div className={`modal-container`}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </ModalPortal>
  );
};
