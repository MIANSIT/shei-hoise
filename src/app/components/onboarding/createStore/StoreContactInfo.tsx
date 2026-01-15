import { Input } from "antd";
import { Controller, Control } from "react-hook-form";
import { CreateUserType } from "@/lib/schema/onboarding/user.schema";
import { FormItemWrapper } from "./FormItemWrapper"; // adjust path if needed

interface Props {
  control: Control<CreateUserType>;
}

export default function StoreContactInfo({ control }: Props) {
  return (
    <>
      <h3 className="text-xl font-semibold mb-4">Store Business Info</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="store.contact_email"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label="Store Contact Email"
              required
              error={fieldState.error}
            >
              <Input {...field} />
            </FormItemWrapper>
          )}
        />

        <Controller
          name="store.contact_phone"
          control={control}
          rules={{ required: "Contact Phone is required" }}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label="Contact Phone"
              required
              error={fieldState.error}
            >
              <Input {...field} type="number" />
            </FormItemWrapper>
          )}
        />

        <Controller
          name="store.business_address"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper
              label="Business Address"
              required
              error={fieldState.error}
              className="md:col-span-2"
            >
              <Input {...field} />
            </FormItemWrapper>
          )}
        />

        <Controller
          name="store.business_license"
          control={control}
          render={({ field }) => (
            <FormItemWrapper label="Business License">
              <Input {...field} />
            </FormItemWrapper>
          )}
        />

        <Controller
          name="store.tax_id"
          control={control}
          render={({ field, fieldState }) => (
            <FormItemWrapper label="Tax ID" error={fieldState.error}>
              <Input {...field} />
            </FormItemWrapper>
          )}
        />
      </div>
    </>
  );
}
