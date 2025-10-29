"use client";
import React from "react";

import Footer from "./components/common/Footer";
import Header from "./components/common/Header";

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header: hidden on md screens */}
   <Header isAdmin={false} />

      <main className="flex-grow">
        <h1 className="text-center mt-10">This is Home Page</h1>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
