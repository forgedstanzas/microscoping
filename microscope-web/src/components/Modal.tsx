import React from 'react';
import { useModal } from '../context/ModalContext';
import styles from './Modal.module.css';
import clsx from 'clsx';

export const Modal: React.FC = () => {
  const { isOpen, message, modalType, onConfirm, hideModal } = useModal();

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    hideModal();
  };

  const handleCancel = () => {
    hideModal();
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className={styles.buttonGroup}>
          {modalType === 'confirm' && (
            <button className={styles.button} onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button
            className={clsx(styles.button, styles.confirmButton)}
            onClick={handleConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
