import { toast as sonnerToast, ExternalToast } from "sonner";

const defaultOptions: ExternalToast = {
  duration: 4000,
  closeButton: true,
};

export const success = (message: string, options?: ExternalToast) =>
  sonnerToast.success(message, { ...defaultOptions, ...options });

export const error = (message: string, options?: ExternalToast) =>
  sonnerToast.error(message, { ...defaultOptions, duration: 6000, ...options });

export const warning = (message: string, options?: ExternalToast) =>
  sonnerToast.warning(message, { ...defaultOptions, duration: 5000, ...options });

export const info = (message: string, options?: ExternalToast) =>
  sonnerToast.info(message, { ...defaultOptions, duration: 3000, ...options });

export const userRejected = (message: string) =>
  sonnerToast.info(message, { duration: 2000, closeButton: false });

export { sonnerToast as toast };
