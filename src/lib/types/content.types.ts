import { ReactElement } from "react";

// types/content.types.ts
export interface Section {
  id: string;
  title: string;
  content: string;
  items?: string[];
}

export interface PolicySection extends Section {
  subsections?: Section[];
}

export interface Feature {
  id: string;
  icon: string | ReactElement;
  title: string;
  description: string;
}

export interface CTASectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  variant?: "primary" | "secondary";
}
