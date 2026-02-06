// lib/store/userInformationStore.ts - PRODUCTION READY
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
  justCreatedAccount: boolean;
  setJustCreatedAccount: (value: boolean) => void;
  createdAccountEmail: string | null;
  setCreatedAccountEmail: (email: string | null) => void;
  clearAccountCreationFlags: () => void;
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
      justCreatedAccount: false,
      createdAccountEmail: null,
      
      setFormData: (data) => set((state) => ({ 
        formData: { ...state.formData, ...data } 
      })),
      
      clearFormData: () => set({ 
        formData: defaultFormData, 
        storeSlug: null,
        justCreatedAccount: false,
        createdAccountEmail: null,
      }),
      
      setStoreSlug: (slug: string) => set({ storeSlug: slug }),
      
      setJustCreatedAccount: (value: boolean) => set({ justCreatedAccount: value }),
      
      setCreatedAccountEmail: (email: string | null) => set({ createdAccountEmail: email }),
      
      clearAccountCreationFlags: () => set({ 
        justCreatedAccount: false,
        createdAccountEmail: null,
      }),
    }),
    {
      name: 'user-information-storage',
      // Add version for future migrations
      version: 1,
    }
  )
);