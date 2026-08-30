import { OrderStatus } from "@/lib/types/enums";
import { toWhatsAppNumber } from "@/lib/utils/phoneNumber";

export interface OrderStatusNotifyParams {
  storeName: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  status: OrderStatus;
}

const STATUS_MESSAGE: Partial<Record<OrderStatus, (p: OrderStatusNotifyParams) => string>> = {
  [OrderStatus.PENDING]: (p) =>
    `Hi ${p.customerName}, we've received your order #${p.orderNumber} from ${p.storeName} and it's being processed.`,
  [OrderStatus.CONFIRMED]: (p) =>
    `Hi ${p.customerName}, your order #${p.orderNumber} from ${p.storeName} has been confirmed. We'll notify you once it ships.`,
  [OrderStatus.SHIPPED]: (p) =>
    `Hi ${p.customerName}, your order #${p.orderNumber} from ${p.storeName} is on its way!`,
  [OrderStatus.DELIVERED]: (p) =>
    `Hi ${p.customerName}, your order #${p.orderNumber} from ${p.storeName} has been delivered. Thank you for shopping with us!`,
  [OrderStatus.CANCELLED]: (p) =>
    `Hi ${p.customerName}, your order #${p.orderNumber} from ${p.storeName} has been cancelled. Please contact us if you have any questions.`,
};

/**
 * Builds the customer-facing status message for an order. Today this is
 * consumed only by the WhatsApp click-to-chat link below; a future SMS
 * provider can reuse the same message for the same statuses.
 */
export function buildOrderStatusMessage(params: OrderStatusNotifyParams): string | null {
  const build = STATUS_MESSAGE[params.status];
  return build ? build(params) : null;
}

/**
 * Returns a WhatsApp link pre-filled with the status message, or null if
 * there's no message for this status or no phone to send it to.
 *
 * On mobile, `whatsapp://send` hands off straight to the installed app.
 * `wa.me` also works on mobile, but on desktop it's the only option that
 * makes sense — `whatsapp://` has nothing registered to open it there — and
 * it routes through web.whatsapp.com (login/QR prompt if the owner isn't
 * already signed in there, same as opening WhatsApp Web directly).
 */
export function buildOrderStatusWhatsAppLink(
  params: OrderStatusNotifyParams,
  isMobile: boolean,
): string | null {
  if (!params.phone) return null;
  const message = buildOrderStatusMessage(params);
  if (!message) return null;
  const number = toWhatsAppNumber(params.phone);
  const encoded = encodeURIComponent(message);
  return isMobile
    ? `whatsapp://send?phone=${number}&text=${encoded}`
    : `https://wa.me/${number}?text=${encoded}`;
}
