"use client";
import { SignUpContainer } from "../components/auth/SignUp/SignUpContainer";
import { useMediaQuery } from "../../lib/hook/use-media-query";

export default function SignUpPage() {
  const isMobile = useMediaQuery("(max-width: 768px)"); // Tailwind's md breakpoint

  return <SignUpContainer isMobile={isMobile} />;
}