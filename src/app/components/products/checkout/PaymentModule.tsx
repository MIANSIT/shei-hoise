"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FaMoneyBillAlt, FaMobileAlt, FaCommentDollar } from "react-icons/fa";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useRouter } from "next/navigation";

interface PaymentModuleProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentModule = ({ amount, onSuccess, onCancel }: PaymentModuleProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const notify = useSheiNotification();
  const router = useRouter();

  const handlePayment = () => {
    setIsProcessing(true);
    if (
      (selectedMethod === "bkash" || selectedMethod === "nagad") &&
      !transactionId.trim()
    ) {
      notify.warning("Please enter your Transaction ID");
      setIsProcessing(false);
      return;
    }

    setTimeout(() => {
      setIsProcessing(false);
      notify.success("Payment successful! Your order has been confirmed.");
      onSuccess();
      setTimeout(() => {
        router.push("/shop");
      }, 1000);
    }, 2000);
  };

  const paymentMethods = [
    {
      id: "cash",
      name: "Cash",
      icon: FaMoneyBillAlt,
      title: "Cash on Delivery",
      description:
        "Please have exact change ready. Our delivery executive will collect payment when your order is delivered.",
      instructions:
        "No additional steps needed. Just have your payment ready when the order arrives.",
      color: "bg-blue-500",
    },
    {
      id: "bkash",
      name: "bKash",
      icon: FaMobileAlt,
      title: "Pay with bKash",
      description:
        "Send money via bKash to complete your payment quickly and securely.",
      instructions:
        "Open your bKash app → Send Money → Merchant: 01XXXXXXXX → Amount: $AMOUNT → Use Transaction ID as reference.",
      color: "bg-pink-500",
    },
    {
      id: "nagad",
      name: "Nagad",
      icon: FaCommentDollar,
      title: "Pay with Nagad",
      description:
        "Send money via Nagad for a fast and convenient payment experience.",
      instructions:
        "Open your Nagad app → Send Money → Merchant: 01XXXXXXXX → Amount: $AMOUNT → Use Transaction ID as reference.",
      color: "bg-green-500",
    },
  ];

  const selectedMethodData = paymentMethods.find(
    (method) => method.id === selectedMethod
  );
  const needsTransactionId =
    selectedMethod === "bkash" || selectedMethod === "nagad";

  return (
    <div className="flex flex-col space-y-4 text-foreground overflow-y-none">
      {/* Payment method selection */}
      <div className="flex justify-between mb-4">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon;
          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg cursor-pointer transition-all text-center w-24 ${
                selectedMethod === method.id
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-primary-foreground font-bold"
                  : "bg-secondary hover:bg-accent"
              }`}
              onClick={() => {
                setSelectedMethod(method.id);
                setTransactionId(""); 
              }}
            >
              <IconComponent className="mx-auto mb-1" />
              <div className="text-xs font-medium">{method.name}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main payment card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMethod}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-card-foreground">
                  {selectedMethodData?.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-full ${selectedMethodData?.color}`}
                >
                  {selectedMethodData &&
                    React.createElement(selectedMethodData.icon, {
                      className: "w-4 h-4",
                    })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedMethodData?.description}
              </p>

              <div className="bg-muted p-3 rounded-lg">
                <h3 className="font-medium mb-2 text-yellow-400 text-sm">
                  Instructions:
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedMethodData?.instructions.replace(
                    "$AMOUNT",
                    amount.toFixed(2)
                  )}
                </p>

                {/* Transaction ID Input for bKash and Nagad */}
                {needsTransactionId && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-yellow-400 mb-1">
                      Transaction ID
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please enter the transaction ID from your payment
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm">Total Payment</span>
                <span className="text-xl font-bold text-yellow-400">
                  ${amount.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Buttons */}
      <div className="flex space-x-3 pt-2">
        <Button
          onClick={handlePayment}
          disabled={
            isProcessing || (needsTransactionId && !transactionId.trim())
          }
          className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-primary-foreground font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Confirm Order"
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentModule;