"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, X } from "lucide-react";
import { ProfileFormData } from "@/lib/types/profile";
import { useTranslation } from "@/lib/hook/useTranslation";

// Update the schema to match ProfileFormData
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string(),
  email: z.string().email("Invalid email address"),
  date_of_birth: z.string(),
  gender: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

// Define common profile interface that works for both customer and admin profiles
interface CommonProfileData {
  id: string;
  date_of_birth: string | null;
  gender: string | null;
  address?: string | null;
  address_line_1?: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

interface EditProfileFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    profile?: CommonProfileData | null;
  };
  onCancel: () => void;
  onSave: (data: ProfileFormData) => Promise<void>;
}

export function EditProfileForm({
  user,
  onCancel,
  onSave,
}: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Initialize form with data when user changes
  useEffect(() => {
    if (user) {
      // Extract address from either address or address_line_1
      const address = user.profile?.address || user.profile?.address_line_1 || "";
      
      const defaultValues = {
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        date_of_birth: user.profile?.date_of_birth || "",
        gender: user.profile?.gender || "",
        address: address,
        city: user.profile?.city || "",
        state: user.profile?.state || "",
        postal_code: user.profile?.postal_code || "",
        country: user.profile?.country || "",
      };


      reset(defaultValues);
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error("Error saving profile:", error);
      throw error; // Re-throw to handle in parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t.admin.myProfileEditTitle}</CardTitle>
        <CardDescription>{t.admin.myProfileEditDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t.admin.myProfilePersonalInfoSection}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.admin.myProfileFullName}</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder={t.admin.myProfileFullNamePlaceholder}
                />
                {errors.name && (
                  <div className="text-sm text-red-600">
                    {errors.name.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.admin.myProfileEmailAddressLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder={t.admin.myProfileEmailPlaceholder}
                  disabled
                />
                <div className="text-xs text-gray-500">
                  {t.admin.myProfileEmailCannotChange}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t.admin.myProfilePhoneLabel}</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder={t.admin.myProfilePhonePlaceholder}
                />
                {errors.phone && (
                  <div className="text-sm text-red-600">
                    {errors.phone.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">{t.admin.myProfileDOBLabel}</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">{t.admin.myProfileGender}</Label>
              <select
                id="gender"
                {...register("gender")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t.admin.myProfileSelectGender}</option>
                <option value="male">{t.admin.myProfileMale}</option>
                <option value="female">{t.admin.myProfileFemale}</option>
                <option value="other">{t.admin.myProfileOther}</option>
                <option value="prefer_not_to_say">{t.admin.myProfilePreferNotToSay}</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t.admin.myProfileAddressInfoSection}</h3>

            <div className="space-y-2">
              <Label htmlFor="address">{t.admin.myProfileAddressLabel}</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder={t.admin.myProfileAddressPlaceholder}
              />
              {errors.address && (
                <div className="text-sm text-red-600">
                  {errors.address.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t.admin.myProfileCity}</Label>
                <Input id="city" {...register("city")} placeholder={t.admin.myProfileCityPlaceholder} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">{t.admin.myProfileState}</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder={t.admin.myProfileStatePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">{t.admin.myProfilePostalCode}</Label>
                <Input
                  id="postal_code"
                  {...register("postal_code")}
                  placeholder={t.admin.myProfilePostalPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t.admin.myProfileCountryLabel}</Label>
              <Input
                id="country"
                {...register("country")}
                placeholder={t.admin.myProfileCountryPlaceholder}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              variant="greenish"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? t.admin.myProfileSaving : t.admin.myProfileSaveChanges}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {t.admin.myProfileCancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}