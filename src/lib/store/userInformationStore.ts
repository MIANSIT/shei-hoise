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
  // NEW: Track if user just created password during checkout
  justCreatedAccount: boolean;
  setJustCreatedAccount: (value: boolean) => void;
  // NEW: Track created account email
  createdAccountEmail: string | null;
  setCreatedAccountEmail: (email: string | null) => void;
  // NEW: Clear account creation flags
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
      
      setStoreSlug: (slug) => set({ storeSlug: slug }),
      
      setJustCreatedAccount: (value) => set({ justCreatedAccount: value }),
      
      setCreatedAccountEmail: (email) => set({ createdAccountEmail: email }),
      
      clearAccountCreationFlags: () => set({ 
        justCreatedAccount: false,
        createdAccountEmail: null,
      }),
    }),
    {
      name: 'user-information-storage',
    }
  )
);