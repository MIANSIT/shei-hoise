// components/sections/ContentSection.tsx
import React from "react";
import { Section } from "@/lib/types/content.types";

interface ContentSectionProps {
  section: Section;
  index: number;
  showNumber?: boolean;
}

const ContentSection: React.FC<ContentSectionProps> = ({
  section,
  index,
  showNumber = true,
}) => {
  return (
    <section className="mb-10 scroll-mt-20" id={section.id}>
      <div className="flex items-start mb-6">
        {showNumber && (
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
            <span className=" font-semibold text-sm">{index + 1}</span>
          </div>
        )}
        <h2 className="text-2xl font-bold ">{section.title}</h2>
      </div>

      <div className=" rounded-xl border  p-7 shadow-sm hover:shadow-md transition-shadow duration-300">
        <p className="t leading-relaxed mb-4 text-lg">{section.content}</p>

        {section.items && section.items.length > 0 && (
          <ul className="space-y-3 mt-5">
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-start group">
                <div className="flex-shrink-0 w-6 h-6  rounded-full flex items-center justify-center mt-0.5 mr-4  transition-colors duration-200">
                  <svg
                    className="w-3 h-3 "
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className=" text-lg">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ContentSection;
