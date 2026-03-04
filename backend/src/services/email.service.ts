import nodemailer from "nodemailer";

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  /**
   * Send generic email
   */
  static async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Support Team" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      console.log("Email sent to:", to);
    } catch (error: any) {
      console.error("Email Error:", error.message);
      throw new Error("Failed to send email");
    }
  }

  /**
   * Send refund link email
   */
  static async sendRefundLinkEmail(
    customerEmail: string,
    refundLink: string
  ) {
    const html = `
      <h2>Refund Request Approved</h2>
      <p>Your refund request has been approved.</p>
      <p>Please click the link below to proceed:</p>
      <a href="${refundLink}" target="_blank">Complete Refund</a>
      <br/><br/>
      <p>If you did not request this, please contact support immediately.</p>
    `;

    await this.sendEmail(
      customerEmail,
      "Your Refund Link",
      html
    );
  }

  /**
   * Send escalation notification to internal team
   */
  static async notifyEscalation(
    agentEmail: string,
    ticketId: string
  ) {
    const html = `
      <h3>Ticket Escalated</h3>
      <p>Ticket ID: ${ticketId}</p>
      <p>This ticket requires urgent attention.</p>
    `;

    await this.sendEmail(
      agentEmail,
      "Escalated Ticket Alert",
      html
    );
  }
}