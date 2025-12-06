// lib/store/userInformationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInformation {
  email: string;
  phone: string;
  name: string;
  country: string;
  city: string;
  shippingAddress: string;
  postCode: string;
}

interface CheckoutStore {
  formData: Partial<UserInformation>;
  setFormData: (data: Partial<UserInformation>) => void;
  clearFormData: () => void;
  storeSlug: string | null;
  setStoreSlug: (slug: string) => void;
}

const defaultFormData: Partial<UserInformation> = {
  email: '',
  phone: '',
  name: '',
  country: 'Bangladesh',
  city: 'Dhaka',
  shippingAddress: '',
  postCode: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: defaultFormData,
      storeSlug: null,
      
      setFormData: (data) => set((state) => ({ 
        formData: { ...state.formData, ...data } 
      })),
      
      clearFormData: () => set({ formData: defaultFormData, storeSlug: null }),
      
      setStoreSlug: (slug) => set({ storeSlug: slug }),
    }),
    {
      name: 'user-information-storage', 
    }
  )
);