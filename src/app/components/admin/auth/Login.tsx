import { UserForm } from "../../common/UserForm";

export default function AdminLoginPage() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold text-left mb-6">Admin Login</h1>
      <UserForm
        submitText="Login as Admin"
        isAdmin={true} // Add this prop
      />
    </div>
  );
}