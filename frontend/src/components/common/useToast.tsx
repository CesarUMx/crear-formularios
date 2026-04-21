import { useState, useCallback } from 'react';
import type { ToastType, ToastProps } from './Toast';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((type: ToastType, options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastProps = {
      id,
      type,
      title: options.title,
      message: options.message,
      duration: options.duration ?? 5000,
      onClose: (id) => removeToast(id)
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('success', { title, message, duration });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('error', { title, message, duration });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('warning', { title, message, duration });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast('info', { title, message, duration });
  }, [addToast]);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast
  };
}
