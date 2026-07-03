interface StoreOfflineProps {
  storeName: string;
}

export function StoreOffline({ storeName }: StoreOfflineProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{storeName} is temporarily unavailable</h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          This store is currently paused. Please check back later.
        </p>
      </div>
    </div>
  );
}
