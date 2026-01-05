"use client";

import AllStores from "@/app/components/landing/AllStore";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function StoresPage() {
  return (
    <>
      <Header />
      <div className=" bg-background ">
        <AllStores />
      </div>
      <Footer />
    </>
  );
}
