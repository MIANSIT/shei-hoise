import React from "react";

const UnderDevelopment = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br  rounded-3xl shadow-2xl border border-blue-200 max-w-md mx-auto">
      {/* Animated Construction Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-500">
          <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center">
            <div className="w-2 h-8 bg-yellow-600 rounded-full animate-bounce"></div>
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
          <span className=" text-sm font-bold">!</span>
        </div>
      </div>

      {/* Content */}
      <h2 className="text-3xl font-bold  mb-2 text-center">
        Under Construction
      </h2>
      <p className=" text-center mb-6">
        Something amazing is coming soon! We&apos;re working hard to bring you
        new features.
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full animate-pulse"
          style={{ width: "75%" }}
        ></div>
      </div>

      {/* Animated Dots */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
        <div
          className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
    </div>
  );
};

export default UnderDevelopment;
