// components/auth/SignIn/form-fields.tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export function FormFields() {
  return (
    <>
      <div className="grid gap-4">
        <Label htmlFor="email" className="text-sm">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@example.com"
          required
          className="text-sm h-14" // Added h-14 and text-sm
        />
      </div>
      <div className="grid gap-4">
        <div className="flex items-center">
          <Label htmlFor="password" className="text-sm">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          placeholder=""
          required 
          className="text-sm h-14" // Added h-14 and text-sm
        />
      </div>
    </>
  )
}