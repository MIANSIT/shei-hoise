"use client";

import { Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  hint: string;
}

/** Full-page placeholder for a feature that's built but not yet verified/ready to expose to store owners. */
export default function ComingSoon({ title, hint }: ComingSoonProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center border border-border">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950">
          <Sparkles className="h-6 w-6 text-indigo-500" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">{title}</h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}
