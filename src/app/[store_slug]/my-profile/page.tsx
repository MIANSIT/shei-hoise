"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
// import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import { UserLoadingSkeleton } from "../../components/skeletons/UserLoadingSkeleton";
import UnderDevelopment from "../../components/common/UnderDevelopment";

export default function OrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();

  // === While checking auth ===
  if (userLoading) {
    return <UserLoadingSkeleton />;
  }

  // === If not logged in ===
  if (!user) {
    return (
      <>
        {/* <Header /> */}
        <div className=" flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-foreground">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              Please log in to access this page.
            </p>
          </div>
        </div>
      </>
    );
  }

  // === If logged in ===
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-4">
        <UnderDevelopment />
      </main>
      <Footer />
    </div>
  );
}
