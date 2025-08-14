import { LoginForm } from "../components/shadcn/LoginupForm"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-black p-6 md:p-10">
      {/* Centered header text */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Sign In</h1>
        <p className="mt-2 text-gray-400">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Login form container */}
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}