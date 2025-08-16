"use client";
import React from "react";
import MobileHeader from "./components/common/MobileHeader";
import DesktopHeader from "./components/common/DesktopHeader";

const Home = () => {
  return (
    <>
      <MobileHeader />
      <DesktopHeader />
      <h1>This is Home Page</h1>
    </>
  );
};

export default Home;
