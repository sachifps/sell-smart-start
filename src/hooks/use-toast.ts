
import { toast } from "sonner";
import { useToast as useShadcnToast } from "@/components/ui/toast";

// Re-export the toast function from sonner
export { toast };

// Re-export the useToast hook from shadcn/ui
export const useToast = useShadcnToast;
