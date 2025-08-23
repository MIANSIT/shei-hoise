import { signUpSchema, SignUpFormValues } from "@/lib/utils/formSchema";
import { UserForm } from "../../common/UserForm";

export function SignUpForm() {
  const defaultValues: SignUpFormValues = { name: "", email: "", password: "" };

  const handleSubmit = async (values: SignUpFormValues) => {
    console.log("Signup values:", values);
    await new Promise((res) => setTimeout(res, 1000)); // simulate API call
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-left text-white">
          Create Account
        </h1>
        <p className="mt-2 text-gray-400 text-left">
          Enter your details to create your account
        </p>
      </div>
      <UserForm
        schema={signUpSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Create Account"
        footer={{
          text: "Already have an account?",
          linkText: "Sign in",
          linkUrl: "/login",
        }}
      />
    </div>
  );
}
