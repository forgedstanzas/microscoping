import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ModalType = 'alert' | 'confirm';

interface ModalState {
  isOpen: boolean;
  message: string;
  modalType: ModalType;
  onConfirm: (() => void) | null;
}

interface ModalContextType extends ModalState {
  showConfirm: (message: string, onConfirm: () => void) => void;
  showAlert: (message: string) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    message: '',
    modalType: 'alert',
    onConfirm: null,
  });

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setModalState({
      isOpen: true,
      message,
      modalType: 'confirm',
      onConfirm,
    });
  }, []);

  const showAlert = useCallback((message: string) => {
    setModalState({
      isOpen: true,
      message,
      modalType: 'alert',
      onConfirm: null,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prevState => ({ ...prevState, isOpen: false }));
  }, []);

  const value = { ...modalState, showConfirm, showAlert, hideModal };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
