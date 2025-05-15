
import { toast as sonnerToast } from "sonner";
import { ToastActionElement } from "@/components/ui/toast";

// Define our custom toast types
type ToastProps = {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

// Re-export the original Sonner toast for direct usage
export const originalToast = sonnerToast;

// Create a wrapper function that adapts the shadcn/ui toast interface to Sonner
export const toast = ({
  title,
  description,
  variant = "default",
  ...props
}: ToastProps) => {
  if (variant === "destructive") {
    return sonnerToast.error(title, {
      description,
      ...props,
    });
  }
  
  return sonnerToast(title, {
    description,
    ...props,
  });
};

// Create a hook that provides our toast function
export const useToast = () => {
  return {
    toast,
  };
};
