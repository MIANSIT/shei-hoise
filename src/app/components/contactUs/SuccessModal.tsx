"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { CONTACT_INFO } from "@/lib/store/contact";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SuccessModal({ open, onClose }: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md bg-background rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 text-center border border-muted-foreground">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-14 sm:w-16 h-14 sm:h-16 text-green-500 animate-bounce" />
        </div>

        {/* Header */}
        <DialogHeader className="mb-3 sm:mb-4">
          <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            🎉 Message Sent Successfully!
          </DialogTitle>
        </DialogHeader>

        {/* Message */}
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-2 leading-relaxed">
          Thank you for reaching out to <strong>Shei Hoise</strong>. Our support
          team has received your message and will review it promptly.
        </p>

        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-3">
          You can expect a response within <br />
          <strong>{CONTACT_INFO.support.responseDay}</strong>.
        </p>

        <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-muted-foreground">
          For urgent matters, feel free to call us directly at <br />
          <br className="block sm:hidden" />
          <Link
            href={CONTACT_INFO.phoneHref}
            className="font-medium hover:text-ring hover:underline text-lg"
          >
            {CONTACT_INFO.phone}
          </Link>
        </p>

        <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-muted-foreground italic">
          We appreciate your trust in us and will get back to you as soon as
          possible!
        </p>

        {/* Footer button */}
        <DialogFooter className="mt-5 sm:mt-6">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 text-popover bg-green-500 hover:bg-green-600 rounded-full shadow-md transition-all text-sm sm:text-base"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
