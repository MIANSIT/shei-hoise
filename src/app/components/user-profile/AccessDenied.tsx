import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Home, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  showHomeButton?: boolean;
  showSignupButton?: boolean;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  showLoginButton = true,
  showHomeButton = true,
  showSignupButton = false, // Add signup button option
}: AccessDeniedProps) {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration to avoid hydration mismatches
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isLoginActive = isHydrated && pathname.includes("/login");
  const isSignupActive = isHydrated && pathname.includes("/signup");

  // Extract store slug from pathname (first segment after /)
  const getStoreSlug = () => {
    if (!isHydrated) return null;

    // Remove leading slash and split by slashes
    const pathSegments = pathname.replace(/^\//, "").split("/");

    // If we have at least one segment (store slug), return it
    if (pathSegments.length > 0 && pathSegments[0]) {
      // Make sure it's not a reserved route
      const reservedRoutes = [
        "login", "signup", "sign-up", "register", "auth", 
        "admin", "dashboard", "api", "checkout", "order-status"
      ];
      
      if (!reservedRoutes.includes(pathSegments[0])) {
        return pathSegments[0];
      }
    }

    return null; // No store slug found
  };

  // Create URLs with store slug
  const storeSlug = getStoreSlug();
  const storeHomeUrl = storeSlug ? `/${storeSlug}` : "/";
  
  // Store-specific auth URLs
  const loginUrl = storeSlug 
    ? `/${storeSlug}/login?redirect=${encodeURIComponent(pathname)}`
    : `/login?redirect=${encodeURIComponent(pathname)}`;
  
  const signupUrl = storeSlug 
    ? `/${storeSlug}/signup?redirect=${encodeURIComponent(pathname)}`
    : `/signup?redirect=${encodeURIComponent(pathname)}`;

  // Get button text based on current page
  const getLoginButtonText = () => {
    if (isLoginActive) return "Currently on Login";
    if (storeSlug) return `Login`;
    return "Log In";
  };

  const getSignupButtonText = () => {
    if (isSignupActive) return "Currently on Sign Up";
    if (storeSlug) return `Join ${storeSlug}`;
    return "Sign Up";
  };

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
          <div className="flex flex-col gap-3 justify-center">
            {showHomeButton && (
              <Button
                asChild
                variant="outline"
                className="flex items-center gap-2"
              >
                <Link href={storeHomeUrl}>
                  <Home className="w-4 h-4" />
                  Go Back To Store
                </Link>
              </Button>
            )}
            
            {showLoginButton && (
              <Button
                asChild
                
                variant={isLoginActive ? "greenish" : "greenish"}
              >
                <Link href={loginUrl}>
                  <LogIn className="w-4 h-4" />
                  {getLoginButtonText()}
                </Link>
              </Button>
            )}
            
            {showSignupButton && (
              <Button
                asChild
                className={`flex items-center gap-2 ${
                  isSignupActive ? "bg-green-600" : "bg-green-500 hover:bg-green-600"
                }`}
                variant={isSignupActive ? "default" : "default"}
              >
                <Link href={signupUrl}>
                  <UserPlus className="w-4 h-4" />
                  {getSignupButtonText()}
                </Link>
              </Button>
            )}
          </div>
          
          {/* Help text */}
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>
              You need to be logged in to access this page. 
              {storeSlug && " Your account is specific to this store."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}