"use client";
import { SignUpContainer } from "../components/auth/SignUp/SignUpContainer";
import { useEffect, useState } from "react";

export default function SignUprPage() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <SignUpContainer isMobile={isMobile} />;
}