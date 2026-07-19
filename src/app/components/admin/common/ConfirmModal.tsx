// components/ui/ConfirmModal.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info";
  confirmLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Continue",
  cancelText = "Cancel",
  type = "warning",
  confirmLoading = false,
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          confirmButton: "bg-red-600 hover:bg-red-700",
        };
      case "info":
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          confirmButton: "bg-blue-600 hover:bg-blue-700",
        };
      default:
        return {
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          confirmButton: "bg-yellow-600 hover:bg-yellow-700",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`${styles.iconBg} p-2 rounded-full`}>
              <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {typeof message === "string" ? (
            <p className="text-gray-700 dark:text-gray-300">{message}</p>
          ) : (
            message
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={confirmLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmLoading}
            className={`${styles.confirmButton} flex-1`}
          >
            {confirmLoading && (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmModal;
