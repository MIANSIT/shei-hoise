import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ExternalLink } from "lucide-react";
import Link from "next/link";

interface StoreInfoCardProps {
  storeSlug?: string | null;
  storeName?: string | null;
}

export function StoreInfoCard({ storeSlug, storeName }: StoreInfoCardProps) {
  if (!storeSlug) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Store className="w-5 h-5" />
          Store Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {storeName && (
            <div>
              <div className="text-sm font-medium text-foreground">
                Store Name
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {storeName}
              </div>
            </div>
          )}
          {storeSlug && (
            <div>
              <div className="text-sm font-medium text-foreground">
                Store URL
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
                  {storeSlug}
                </div>
                <Link
                  href={`/${storeSlug}`} // Change this to your actual base URL if needed, e.g., `https://example.com/${storeSlug}`
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 text-gray-400 cursor-pointer" />
                </Link>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Your store&apos;s unique web address
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
