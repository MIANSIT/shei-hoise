"use client";

import { useParams, useSearchParams } from "next/navigation";
import EditOrder from "@/app/components/admin/order/edit-order/EditOrder";

const EditOrderPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = params.order_number as string;
  const returnUrl = searchParams.get("returnUrl") ?? undefined;

  return <EditOrder orderNumber={orderNumber} returnUrl={returnUrl} />;
};

export default EditOrderPage;
