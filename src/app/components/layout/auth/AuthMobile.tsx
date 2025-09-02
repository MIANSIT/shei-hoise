export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-60px)] w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}