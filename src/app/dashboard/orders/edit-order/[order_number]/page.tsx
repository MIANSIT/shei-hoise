"use client";

import { useParams } from "next/navigation";
import EditOrder from "@/app/components/admin/order/edit-order/EditOrder";

const EditOrderPage = () => {
  const params = useParams();
  const orderNumber = params.order_number as string;

  return <EditOrder orderNumber={orderNumber} />;
};

export default EditOrderPage;
