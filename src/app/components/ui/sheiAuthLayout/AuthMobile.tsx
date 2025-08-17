export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}
