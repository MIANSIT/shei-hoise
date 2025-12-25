import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";
import type { StoreData } from "@/lib/types/store/store"; // Use correct path

interface ContactCardProps {
  store: StoreData;
}

export default function ContactCard({ store }: ContactCardProps) {
  return (
    <Card className="rounded-2xl border border-gray-200/70 bg-white hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Contact Details
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">
                {store.contact_email || "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">
                {store.contact_phone || "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Business Address</p>
              <p className="font-medium">
                {store.business_address || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
