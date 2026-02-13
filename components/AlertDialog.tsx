
import React, { useEffect } from 'react';
import { Button, Modal } from './UI';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonLabel?: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title = "Aviso",
  message,
  buttonLabel = "Entendido"
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex justify-end pt-4">
          <Button variant="primary" onClick={onClose} autoFocus className="min-w-[100px]">
            {buttonLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AlertDialog;
