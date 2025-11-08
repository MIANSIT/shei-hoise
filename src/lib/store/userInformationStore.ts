// lib/store/checkoutStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerCheckoutFormValues } from '@/lib/schema/checkoutSchema'; // Import from your schema

interface CheckoutStore {
  formData: Partial<CustomerCheckoutFormValues>; // Use Partial since password might not be stored
  setFormData: (data: Partial<CustomerCheckoutFormValues>) => void;
  clearFormData: () => void;
}

const defaultFormData: Partial<CustomerCheckoutFormValues> = {
  email: '',
  phone: '',
  name: '',
  country: '',
  city: '',
  shippingAddress: '',
  postCode: '',
  // Don't include password in default for security reasons
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: defaultFormData,
      setFormData: (data) => set({ formData: data }),
      clearFormData: () => set({ formData: defaultFormData }),
    }),
    {
      name: 'userInformation-storage',
    }
  )
);