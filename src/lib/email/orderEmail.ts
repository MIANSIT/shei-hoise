import nodemailer from "nodemailer";
import { OrderProduct, CustomerInfo } from "@/lib/types/order";

interface SendOrderEmailParams {
  toEmail: string;
  storeName: string;
  orderNumber: string;
  customerInfo: CustomerInfo;
  orderProducts: OrderProduct[];
  subtotal: number;
  discount: number;
  additionalCharges: number;
  deliveryCost: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  currency?: string;
  notes?: string;
  deliveryOption?: string;
}

function formatCurrency(amount: number, currency = "BDT"): string {
  return `${currency} ${amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildVariantLabel(product: OrderProduct): string {
  if (!product.variant_details) return "";
  const parts = Object.entries(product.variant_details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return parts ? ` (${parts})` : "";
}

function buildPlainText(params: SendOrderEmailParams): string {
  const { storeName, orderNumber, customerInfo, orderProducts, subtotal, discount, additionalCharges, deliveryCost, taxAmount, totalAmount, paymentMethod, paymentStatus, currency = "BDT", notes, deliveryOption } = params;

  const lines: string[] = [
    `NEW ORDER — ${storeName}`,
    `Order #${orderNumber}`,
    ``,
    `CUSTOMER`,
    `Name    : ${customerInfo.name}`,
    `Phone   : ${customerInfo.phone}`,
    customerInfo.email ? `Email   : ${customerInfo.email}` : "",
    `Address : ${customerInfo.address || "—"}`,
    `City    : ${customerInfo.city || "—"}`,
    ``,
    `PAYMENT`,
    `Method  : ${paymentMethod || "—"}`,
    `Status  : ${paymentStatus}`,
    deliveryOption ? `Delivery: ${deliveryOption}` : "",
    ``,
    `ORDER ITEMS`,
    ...orderProducts.map((p, i) =>
      `${i + 1}. ${p.product_name}${buildVariantLabel(p)}  x${p.quantity}  ${formatCurrency(p.unit_price, currency)} = ${formatCurrency(p.total_price, currency)}`
    ),
    ``,
    `Subtotal  : ${formatCurrency(subtotal, currency)}`,
    discount > 0 ? `Discount  : - ${formatCurrency(discount, currency)}` : "",
    additionalCharges > 0 ? `Extra     : ${formatCurrency(additionalCharges, currency)}` : "",
    `Delivery  : ${deliveryCost > 0 ? formatCurrency(deliveryCost, currency) : "Free"}`,
    taxAmount > 0 ? `Tax       : ${formatCurrency(taxAmount, currency)}` : "",
    `TOTAL     : ${formatCurrency(totalAmount, currency)}`,
    notes ? `\nCustomer note: ${notes}` : "",
    ``,
    `---`,
    `Order alert for ${params.storeName} | Powered by Shei Hoise`,
  ];

  return lines.filter((l) => l !== undefined && l !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

function buildEmailHTML(params: SendOrderEmailParams): string {
  const {
    storeName,
    orderNumber,
    customerInfo,
    orderProducts,
    subtotal,
    discount,
    additionalCharges,
    deliveryCost,
    taxAmount,
    totalAmount,
    paymentMethod,
    paymentStatus,
    currency = "BDT",
    notes,
    deliveryOption,
  } = params;

  const productRows = orderProducts
    .map(
      (p, i) => `
      <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">
          ${p.product_name}${buildVariantLabel(p)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${p.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">${formatCurrency(p.unit_price, currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:600;">${formatCurrency(p.total_price, currency)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>New Order #${orderNumber}</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f3f4f6;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;font-size:13px;color:#bbf7d0;letter-spacing:.05em;text-transform:uppercase;">Shei Hoise</p>
              <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">New Order Received</h1>
            </td>
          </tr>

          <!-- Order meta -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:50%;padding-bottom:8px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Store</span><br/>
                    <strong style="font-size:15px;">${storeName}</strong>
                  </td>
                  <td style="width:50%;padding-bottom:8px;text-align:right;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Order #</span><br/>
                    <strong style="font-size:15px;">${orderNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:4px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Payment</span><br/>
                    <span style="font-size:14px;">${paymentMethod || "—"}</span>
                  </td>
                  <td style="text-align:right;padding-bottom:4px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Payment Status</span><br/>
                    <span style="font-size:14px;text-transform:capitalize;">${paymentStatus}</span>
                  </td>
                </tr>
                ${deliveryOption ? `<tr>
                  <td colspan="2" style="padding-bottom:4px;">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Delivery Option</span><br/>
                    <span style="font-size:14px;text-transform:capitalize;">${deliveryOption}</span>
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>

          <tr><td style="padding:16px 32px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>

          <!-- Customer info -->
          <tr>
            <td style="padding:16px 32px 0;">
              <h2 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Customer</h2>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:2px 16px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap;">Name</td>
                  <td style="padding:2px 0;font-size:14px;font-weight:600;">${customerInfo.name}</td>
                </tr>
                <tr>
                  <td style="padding:2px 16px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap;">Phone</td>
                  <td style="padding:2px 0;font-size:14px;">${customerInfo.phone}</td>
                </tr>
                ${customerInfo.email ? `<tr>
                  <td style="padding:2px 16px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap;">Email</td>
                  <td style="padding:2px 0;font-size:14px;">${customerInfo.email}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:2px 16px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap;">Address</td>
                  <td style="padding:2px 0;font-size:14px;">${customerInfo.address || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:2px 16px 2px 0;font-size:13px;color:#6b7280;white-space:nowrap;">City</td>
                  <td style="padding:2px 0;font-size:14px;">${customerInfo.city || "—"}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="padding:16px 32px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>

          <!-- Products -->
          <tr>
            <td style="padding:16px 32px 0;">
              <h2 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;">Order Items</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Unit Price</th>
                    <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>${productRows}</tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:16px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:3px 0;font-size:14px;color:#374151;">Subtotal</td>
                  <td style="padding:3px 0;font-size:14px;text-align:right;">${formatCurrency(subtotal, currency)}</td>
                </tr>
                ${discount > 0 ? `<tr>
                  <td style="padding:3px 0;font-size:14px;color:#374151;">Discount</td>
                  <td style="padding:3px 0;font-size:14px;text-align:right;color:#dc2626;">- ${formatCurrency(discount, currency)}</td>
                </tr>` : ""}
                ${additionalCharges > 0 ? `<tr>
                  <td style="padding:3px 0;font-size:14px;color:#374151;">Additional Charges</td>
                  <td style="padding:3px 0;font-size:14px;text-align:right;">${formatCurrency(additionalCharges, currency)}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:3px 0;font-size:14px;color:#374151;">Delivery</td>
                  <td style="padding:3px 0;font-size:14px;text-align:right;">${deliveryCost > 0 ? formatCurrency(deliveryCost, currency) : "Free"}</td>
                </tr>
                ${taxAmount > 0 ? `<tr>
                  <td style="padding:3px 0;font-size:14px;color:#374151;">Tax</td>
                  <td style="padding:3px 0;font-size:14px;text-align:right;">${formatCurrency(taxAmount, currency)}</td>
                </tr>` : ""}
                <tr>
                  <td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"/></td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:16px;font-weight:700;">Total</td>
                  <td style="padding:4px 0;font-size:16px;font-weight:700;text-align:right;color:#16a34a;">${formatCurrency(totalAmount, currency)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${notes ? `<tr>
            <td style="padding:16px 32px 0;">
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#92400e;font-weight:600;">Customer Notes</span>
                <p style="margin:4px 0 0;font-size:14px;color:#78350f;">${notes}</p>
              </div>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Order alert for <strong>${storeName}</strong> &nbsp;|&nbsp; Powered by Shei Hoise
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderEmail(
  params: SendOrderEmailParams
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      "⚠️ Order email skipped: GMAIL_USER or GMAIL_APP_PASSWORD not set."
    );
    return;
  }

  if (!params.toEmail) {
    console.warn(
      `⚠️ Order email skipped: store has no contact_email (order #${params.orderNumber}).`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${params.storeName} via Shei Hoise" <${user}>`,
    to: params.toEmail,
    replyTo: params.toEmail,
    subject: `Order #${params.orderNumber} — ${params.customerInfo.name} — ${formatCurrency(params.totalAmount, params.currency)}`,
    text: buildPlainText(params),
    html: buildEmailHTML(params),
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      "Importance": "High",
    },
  });
}
