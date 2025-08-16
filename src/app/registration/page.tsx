"use client"
import React, { useEffect, useState } from "react"
import { RegistrationFormMobile } from "../components/auth/RegistrationForm/RegistrationFormMobile"
import { RegistrationFormDesktop } from "../components/auth/RegistrationForm/RegistrationFormDesktop"

export default function RegisterPage() {
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile ? <RegistrationFormMobile /> : <RegistrationFormDesktop />
}
