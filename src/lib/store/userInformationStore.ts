// lib/store/checkoutStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CheckoutFormValues } from '@/lib/utils/formSchema';

interface CheckoutStore {
  formData: CheckoutFormValues;
  setFormData: (data: CheckoutFormValues) => void;
  clearFormData: () => void;
}

const defaultFormData: CheckoutFormValues = {
  email: '',
  phone: '',
  name: '',
  country: '',
  city: '',
  shippingAddress: '',
  postCode: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: defaultFormData,
      setFormData: (data) => set({ formData: data }),
      clearFormData: () => set({ formData: defaultFormData }),
    }),
    {
      name: 'userInformation-storage', // name of the item in the storage (must be unique)
    }
  )
);