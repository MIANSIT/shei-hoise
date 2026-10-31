// Generated from docs/membership/membershipWelcome.template.html: the PawfectBD welcome email layout,
// with the store's own wording, colours and card put in place of the PawfectBD ones.
// Edit the wording in the store's "Card & email" tab, not here; change this only to change the layout.
export const MEMBERSHIP_WELCOME_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to {{store_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1e7;font-family:Arial,Helvetica,sans-serif;color:#173f30;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f1e7;margin:0;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:#fffdf5;border:1px solid #e3d3a9;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:30px 24px 22px;background-color:#fffaf0;border-bottom:3px solid {{color_gold}};">
              <div style="font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:{{color_primary}};">{{store_name}}</div>
              <div style="font-size:14px;letter-spacing:1.5px;color:{{color_deep}};margin-top:6px;">{{tagline}}</div>
              <h1 style="font-size:27px;line-height:1.3;color:{{color_deep}};margin:24px 0 8px;">Welcome to the {{store_name}} Family!</h1>
              <p style="font-size:15px;line-height:1.7;color:#6e542c;margin:0;">{{hero_line}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 10px;font-size:15px;line-height:1.8;color:#34483d;">
              <p style="margin:0 0 14px;">Dear <strong>{{customer_name}}</strong>,</p>
              <p style="margin:0 0 14px;">A big, warm welcome to the <strong>{{store_name}} family!</strong>{{emoji}} We're delighted to have you as a member of our <strong>{{program_name}}</strong>.</p>
              <p style="margin:0 0 14px;">{{intro_line}}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 22px 4px;">
{{card_section}}
              <p style="font-size:16px;font-weight:bold;color:{{color_deep}};margin:14px 0 4px;">Membership ID: {{membership_id}}</p>
              <p style="font-size:13px;color:#76613c;margin:0;">Please keep your membership card handy when shopping.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <h2 style="font-size:19px;color:{{color_deep}};text-align:center;margin:0 0 16px;">Your Exclusive Membership Benefits</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
{{benefit_rows}}
              </table>
              <p style="font-size:12px;line-height:1.7;color:#766b57;margin:12px 0 0;">Discounts apply to eligible products and are subject to {{store_name}} membership terms and conditions.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 28px;font-size:14px;line-height:1.8;color:#34483d;">
              <p style="margin:0 0 12px;">To claim your applicable discounts, please present your membership card or provide your membership ID when shopping at {{store_name}}.</p>
              <p style="margin:0 0 12px;">{{thanks_line}}</p>
              <p style="text-align:center;font-weight:bold;color:{{color_deep}};margin:20px 0 5px;">{{closing_line}}</p>
              <p style="text-align:center;margin:0;color:{{color_primary}};font-weight:bold;">With love,<br>Team {{store_name}}</p>
              <p style="text-align:center;margin:7px 0 0;font-size:12px;letter-spacing:1px;color:{{color_deep}};">{{tagline}}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 20px;background-color:{{color_deep}};color:#fffdf5;font-size:11px;line-height:1.6;">
              {{store_name}} · {{closing_plain}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/** Replaces {{card_section}} when the store has a card: the heading and the card picture. */
export const MEMBERSHIP_CARD_SECTION = `              <p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;font-weight:bold;color:#98631b;">{{card_heading}}</p>
              <img src="{{card_image_src}}" width="552" alt="{{card_alt}}" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:10px;">
`;
