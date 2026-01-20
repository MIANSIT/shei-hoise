export function ShippingLoadingState() {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-12 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-400 mb-2">
            Loading Shipping Configuration
          </h3>
          <p className="text-gray-600">
            Preparing your shipping management dashboard...
          </p>
        </div>
      </div>
    </div>
  );
}
