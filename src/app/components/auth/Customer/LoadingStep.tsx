"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SheiLoader } from "../../../components/ui/SheiLoader/loader";

interface LoadingStepProps {
  message?: string;
  description?: string;
}

export function LoadingStep({ 
  message = "Processing...", 
  description = "Please wait a moment" 
}: LoadingStepProps) {
  return (
    <Card className="shadow-lg border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto">
          <SheiLoader size="lg" loaderColor="primary" />
        </div>
        <CardTitle className="text-xl font-bold">
          {message}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-6">
        <p className="text-muted-foreground">
          {message.includes("Checking") 
            ? "Verifying your email in our system..." 
            : "Completing your request..."}
        </p>
      </CardContent>
    </Card>
  );
}