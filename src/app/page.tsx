"use client";
import React from "react";
import MobileHeader from "./components/common/MobileHeader";
import DesktopHeader from "./components/common/DesktopHeader";
import Footer from "./components/common/Footer";

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader />
      <DesktopHeader />

      <main className="flex-grow">
        <h1 className="text-center mt-10">This is Home Page</h1>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
