import { UseFormReturn } from "react-hook-form";
import { SignUpFormValues } from "./formSchema";

export interface SignUpLayoutProps {
  form: UseFormReturn<SignUpFormValues>;
  onSubmit: (values: SignUpFormValues) => Promise<void>;
  isLoading: boolean;
  success: boolean;
  setSuccess: (value: boolean) => void;
}