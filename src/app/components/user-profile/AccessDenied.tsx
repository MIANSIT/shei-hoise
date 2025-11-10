import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Home, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  showHomeButton?: boolean;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  showLoginButton = true,
  showHomeButton = true,
}: AccessDeniedProps) {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration to avoid hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isLoginActive = isHydrated && pathname === "/login";

  // Extract store slug from pathname (first segment after /)
  const getStoreHomeUrl = () => {
    if (!isHydrated) return "/"; // Fallback during SSR

    // Remove leading slash and split by slashes
    const pathSegments = pathname.replace(/^\//, "").split("/");

    // If we have at least one segment (store slug), return /slug_name
    if (pathSegments.length > 0 && pathSegments[0]) {
      return `/${pathSegments[0]}`;
    }

    return "/"; // Fallback if no segments found
  };

  // Create URLs
  const storeHomeUrl = getStoreHomeUrl();
  const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showHomeButton && (
              <Button
                asChild
                variant="outline"
                className="flex items-center gap-2"
              >
                <Link href={storeHomeUrl}>
                  <Home className="w-4 h-4" />
                  Go to Store
                </Link>
              </Button>
            )}
            {showLoginButton && (
              <Button
                asChild
                className={`flex items-center gap-2 ${
                  isLoginActive ? "bg-blue-600" : ""
                }`}
                variant={isLoginActive ? "default" : "default"}
              >
                <Link href={loginUrl}>
                  <LogIn className="w-4 h-4" />
                  {isLoginActive ? "Currently on Login" : "Log In"}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
