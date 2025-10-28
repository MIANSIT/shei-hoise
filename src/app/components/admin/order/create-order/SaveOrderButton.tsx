/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button, Modal, Space, Typography, App } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dataService from "@/lib/queries/dataService";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";

const { Text } = Typography;

interface SaveOrderButtonProps {
  storeId: string;
  orderId: string;
  orderProducts: OrderProduct[];
  customerInfo: CustomerInfo;
  subtotal: number;
  taxAmount: number;
  discount: number;
  deliveryCost: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  disabled?: boolean;
  onCustomerCreated?: () => void;
}

export default function SaveOrderButton({
  storeId,
  orderId,
  orderProducts,
  customerInfo,
  subtotal,
  taxAmount,
  discount,
  deliveryCost,
  totalAmount,
  status,
  paymentStatus,
  paymentMethod,
  disabled = false,
  onCustomerCreated,
}: SaveOrderButtonProps) {
  const { modal, notification } = App.useApp();
  const [isLoading, setIsLoading] = useState(false);

  const showConfirm = () => {
    modal.confirm({
      title: 'Confirm Order Creation',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical">
          <Text>Are you sure you want to create this order?</Text>
          <Text type="secondary">Order ID: {orderId}</Text>
          <Text type="secondary">Customer: {customerInfo.name}</Text>
          <Text type="secondary">Total Amount: ৳{totalAmount.toFixed(2)}</Text>
          {!customerInfo.customer_id && (
            <Text type="warning">
              A new customer account will be created automatically.
            </Text>
          )}
        </Space>
      ),
      okText: 'Yes, Create Order',
      cancelText: 'Cancel',
      onOk: handleSave,
    });
  };

  const handleSave = async () => {
    if (disabled) return;
    
    setIsLoading(true);
    try {
      console.log('Starting order creation process...');
      console.log('Order data:', {
        storeId,
        orderId,
        customerInfo,
        orderProductsCount: orderProducts.length,
        subtotal,
        totalAmount
      });

      const finalCustomerInfo = { ...customerInfo };
      let customerCreated = false;

      // If new customer (no customer_id), create customer first
      if (!customerInfo.customer_id) {
        try {
          console.log('Creating new customer...');
          
          // Validate required customer fields
          if (!customerInfo.name || !customerInfo.phone || !customerInfo.email || !customerInfo.password) {
            throw new Error('Customer name, phone, email, and password are required to create a customer account');
          }

          const newCustomer = await dataService.createCustomer({
            store_id: storeId,
            email: customerInfo.email,
            first_name: customerInfo.name,
            phone: customerInfo.phone,
            password: customerInfo.password,
            address_line_1: customerInfo.address,
            city: customerInfo.city,
            country: 'Bangladesh'
          });

          if (!newCustomer || !newCustomer.id) {
            throw new Error('Customer creation failed - no customer ID returned');
          }

          finalCustomerInfo.customer_id = newCustomer.id;
          customerCreated = true;
          
          console.log('New customer created successfully:', newCustomer.id);

          // Refresh customer list if callback provided
          if (onCustomerCreated) {
            onCustomerCreated();
          }

          // Show success notification for customer creation
          notification.success({
            message: 'Customer Created',
            description: 'New customer account created successfully.',
          });

        } catch (customerError: any) {
          console.error('Error creating customer:', customerError);
          
          // Show detailed error and ask if they want to continue
          const shouldContinue = await new Promise((resolve) => {
            modal.confirm({
              title: 'Customer Creation Failed',
              content: (
                <Space direction="vertical">
                  <Text>Failed to create customer account: {customerError.message}</Text>
                  <Text type="warning">
                    Do you want to create the order without linking it to a customer account?
                  </Text>
                  <Text type="secondary">
                    The order will be created but no customer account will be created.
                  </Text>
                </Space>
              ),
              okText: 'Continue Without Customer',
              cancelText: 'Cancel Order',
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });

          if (!shouldContinue) {
            setIsLoading(false);
            return; // Stop the process if user cancels
          }
          
          // Continue without customer_id
          console.log('Continuing order creation without customer account...');
        }
      }

      const orderData = {
        storeId,
        orderNumber: orderId,
        customerInfo: finalCustomerInfo,
        orderProducts,
        subtotal,
        taxAmount,
        discount,
        deliveryCost,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod,
        currency: "BDT" as const,
      };

      console.log('Creating order with final data:', orderData);

      const result = await dataService.createOrder(orderData);
      
      if (result.success) {
        console.log("Order saved with ID:", result.orderId);
        
        let successMessage = `Order ${orderId} has been created successfully.`;
        if (customerCreated) {
          successMessage += ' A new customer account was also created.';
        } else if (!customerInfo.customer_id) {
          successMessage += ' Note: No customer account was created.';
        }

        modal.success({
          title: 'Order Created Successfully',
          content: (
            <Space direction="vertical">
              <Text>{successMessage}</Text>
              <Text type="secondary">Order ID: {result.orderId}</Text>
              <Text strong>Total: ৳{totalAmount.toFixed(2)}</Text>
            </Space>
          ),
          onOk: () => window.location.reload(),
        });
      } else {
        console.error("Order creation failed:", result.error);
        throw new Error(result.error || "Failed to save order");
      }
    } catch (error: any) {
      console.error("Error saving order:", error);
      modal.error({
        title: 'Order Creation Failed',
        content: error.message || 'Unknown error occurred. Please check the console for details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      type="primary"
      size="large"
      loading={isLoading}
      disabled={disabled}
      onClick={showConfirm}
      style={{ minWidth: '120px' }}
    >
      {isLoading ? "Creating..." : "Create Order"}
    </Button>
  );
}