// components/sections/PageHeader.tsx
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  centered?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  centered = true,
}) => {
  const containerClass = centered ? "text-center" : "text-left";

  return (
    <div className={`mb-12 ${containerClass}`}>
      {subtitle && (
        <div className="inline-flex items-center px-4 py-2 rounded-full  border border-blue-100 mb-6">
          <span className=" text-sm font-medium">{subtitle}</span>
        </div>
      )}
      <h1 className="text-4xl md:text-5xl font-bold  mb-6 leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
