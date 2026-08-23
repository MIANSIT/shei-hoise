// ShippingLoadingState.tsx
export function ShippingLoadingState() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-12 sm:p-16 flex flex-col items-center justify-center gap-5">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-border" />
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          Loading configuration
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Preparing your shipping settings…
        </p>
      </div>
    </div>
  );
}
