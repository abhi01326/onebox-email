import pino from "pino";

// Initialize logger
const logger = pino({ name: "webhook-notifier", level: "info" });

interface EmailData {
  id: string;
  subject: string;
  from: string;
  to: string[];
  folder: string;
  accountId: string;
  date: string;
  aiCategory: string;
  body?: string;
  [key: string]: any; // For additional metadata
}

export async function triggerWebhook(emailData: EmailData) {
  // Ensure global fetch is available (Node 18+). If not, caller should polyfill.
  if (typeof fetch === "undefined") {
    logger.error(
      { emailId: emailData.id },
      "Global fetch is not available in this runtime. Please run on Node 18+ or polyfill fetch."
    );
    return;
  }
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const webhookUrl = process.env.WEBHOOK_SITE_URL;

  if (!slackUrl) {
    logger.error({ emailId: emailData.id }, "Missing SLACK_WEBHOOK_URL");
  }
  if (!webhookUrl) {
    logger.error({ emailId: emailData.id }, "Missing WEBHOOK_SITE_URL");
  }

  // --- 1. Send Slack Notification ---
  if (slackUrl) {
    try {
      const slackPayload = {
        text: `*New Interested Lead*\n*Subject:* ${emailData.subject}\n*From:* ${emailData.from}\n*Folder:* ${emailData.folder}\n*Account:* ${emailData.accountId}`,
        mrkdwn: true,
      };
      const res = await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
      });
      if (!res.ok) {
        throw new Error(`Slack webhook returned status ${res.status}`);
      }
      logger.info({ emailId: emailData.id }, "Slack notification sent");
    } catch (err: any) {
      logger.error(
        { err, emailId: emailData.id },
        "Failed to send Slack notification"
      );
    }
  }

  // --- 2. Send Generic Webhook ---
  if (webhookUrl) {
    try {
      const genericPayload = {
        event: "InterestedLead",
        email: emailData,
      };
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genericPayload),
      });
      if (!res.ok) {
        throw new Error(`Webhook returned status ${res.status}`);
      }
      logger.info({ emailId: emailData.id }, "Generic webhook triggered");
    } catch (err: any) {
      logger.error(
        { err, emailId: emailData.id },
        "Failed to trigger generic webhook"
      );
    }
  }
}
