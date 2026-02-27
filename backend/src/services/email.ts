// Email service using Resend
// https://resend.com/docs

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "GuardQuote <quotes@guardquote.vandine.us>";

interface QuoteEmailData {
  to: string;
  customerName: string;
  quoteId: number;
  price: number;
  priceRange: { low: number; high: number };
  eventType: string;
  location: string;
  guestCount: number;
  duration: number;
  date?: string;
}

export async function sendQuoteEmail(data: QuoteEmailData): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("[Email] RESEND_API_KEY not set, skipping email");
    return false;
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 24px;">🛡️ Your GuardQuote</h1>
        <p style="color: #94a3b8; margin: 8px 0 0 0;">Quote #${data.quoteId}</p>
      </div>
      
      <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 16px;">Hi ${data.customerName},</p>
        
        <p style="color: #334155;">Thank you for requesting a quote! Here's your estimated pricing:</p>
        
        <div style="background: #fff; border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Estimated Price</p>
          <p style="color: #1e293b; font-size: 36px; font-weight: bold; margin: 0;">$${data.price.toLocaleString()}</p>
          <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
            Typical range: $${data.priceRange.low.toLocaleString()} – $${data.priceRange.high.toLocaleString()}
          </p>
        </div>
        
        <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Quote Details</h3>
        <table style="width: 100%; color: #334155;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Event Type</td><td style="padding: 8px 0; text-align: right;">${data.eventType}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0; text-align: right;">${data.location}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Guests</td><td style="padding: 8px 0; text-align: right;">${data.guestCount}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Duration</td><td style="padding: 8px 0; text-align: right;">${data.duration} hours</td></tr>
          ${data.date ? `<tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>` : ""}
        </table>
        
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>What's next?</strong> A security consultant will call you within 24 hours to discuss your needs. No commitment required.
          </p>
        </div>
      </div>
      
      <div style="background: #1e293b; padding: 24px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #94a3b8; margin: 0; font-size: 14px;">
          Questions? Call us at <a href="tel:1-800-555-1234" style="color: #60a5fa;">1-800-555-1234</a>
        </p>
        <p style="color: #64748b; margin: 16px 0 0 0; font-size: 12px;">
          © 2026 GuardQuote. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: data.to,
        subject: `Your GuardQuote #${data.quoteId} - $${data.price.toLocaleString()} estimate`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend error:", err);
      return false;
    }

    const result = await res.json();
    console.log("[Email] Sent successfully:", result.id);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return false;
  }
}
