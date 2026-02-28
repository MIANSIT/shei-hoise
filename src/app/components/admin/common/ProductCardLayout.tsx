"use client";

import React, { ReactNode } from "react";

interface MobileCardProps {
  image?: ReactNode;
  title?: string;
  subtitle?: string;
  content?: ReactNode;
  actions?: ReactNode;
}

const ProductCardLayout: React.FC<MobileCardProps> = ({
  image,
  title,
  subtitle,
  content,
  actions,
}) => {
  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      {/* Top row: image, title/subtitle, actions */}
      <div className="flex justify-between items-center flex-wrap">
        <div className="flex gap-4 flex-1 items-center">
          {image && (
            <div
              className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0"
              style={{
                background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              }}
            >
              {image}
            </div>
          )}
          <div className="flex flex-col justify-center">
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && <p className="text-sm">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex gap-2 ml-4">{actions}</div>}
      </div>

      {/* Content below */}
      {content && <div className="mt-2">{content}</div>}
    </div>
  );
};

export default ProductCardLayout;
