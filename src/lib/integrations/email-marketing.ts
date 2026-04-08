/**
 * Email Marketing Integration Layer
 * 
 * This module provides an abstraction layer for email marketing platforms.
 * Currently supports: Mailchimp, ZeptoMail, Resend
 * 
 * To use a specific platform, set the EMAIL_MARKETING_PROVIDER environment variable
 * and provide the necessary API keys.
 */

export interface Subscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  templateId?: string;
  content?: string;
  listId: string;
  scheduledAt?: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

export interface EmailMarketingProvider {
  name: string;
  
  // Subscriber management
  addSubscriber(listId: string, subscriber: Subscriber): Promise<void>;
  removeSubscriber(listId: string, email: string): Promise<void>;
  updateSubscriber(listId: string, email: string, data: Partial<Subscriber>): Promise<void>;
  addTag(email: string, tag: string): Promise<void>;
  removeTag(email: string, tag: string): Promise<void>;
  
  // Transactional emails
  sendTransactionalEmail(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<void>;
  
  // Campaigns
  createCampaign(campaign: EmailCampaign): Promise<EmailCampaign>;
  sendCampaign(campaignId: string): Promise<void>;
}

// Mailchimp implementation stub
class MailchimpProvider implements EmailMarketingProvider {
  name = 'Mailchimp';
  private apiKey: string;
  private serverPrefix: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Extract server prefix from API key (e.g., us1, us2)
    this.serverPrefix = apiKey.split('-')[1] || 'us1';
  }

  async addSubscriber(listId: string, subscriber: Subscriber): Promise<void> {
    console.log('[Mailchimp] Adding subscriber:', subscriber.email, 'to list:', listId);
    // TODO: Implement Mailchimp API call
    // const response = await fetch(
    //   `https://${this.serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString('base64')}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       email_address: subscriber.email,
    //       status: 'subscribed',
    //       merge_fields: {
    //         FNAME: subscriber.firstName,
    //         LNAME: subscriber.lastName,
    //       },
    //       tags: subscriber.tags,
    //     }),
    //   }
    // );
  }

  async removeSubscriber(listId: string, email: string): Promise<void> {
    console.log('[Mailchimp] Removing subscriber:', email, 'from list:', listId);
  }

  async updateSubscriber(listId: string, email: string, data: Partial<Subscriber>): Promise<void> {
    console.log('[Mailchimp] Updating subscriber:', email, data);
  }

  async addTag(email: string, tag: string): Promise<void> {
    console.log('[Mailchimp] Adding tag:', tag, 'to:', email);
  }

  async removeTag(email: string, tag: string): Promise<void> {
    console.log('[Mailchimp] Removing tag:', tag, 'from:', email);
  }

  async sendTransactionalEmail(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log('[Mailchimp] Sending transactional email:', to, templateId);
  }

  async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    console.log('[Mailchimp] Creating campaign:', campaign.name);
    return { ...campaign, id: `mc_campaign_${Date.now()}` };
  }

  async sendCampaign(campaignId: string): Promise<void> {
    console.log('[Mailchimp] Sending campaign:', campaignId);
  }
}

// ZeptoMail implementation stub
class ZeptoMailProvider implements EmailMarketingProvider {
  name = 'ZeptoMail';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async addSubscriber(listId: string, subscriber: Subscriber): Promise<void> {
    console.log('[ZeptoMail] Adding subscriber:', subscriber.email, 'to list:', listId);
  }

  async removeSubscriber(listId: string, email: string): Promise<void> {
    console.log('[ZeptoMail] Removing subscriber:', email, 'from list:', listId);
  }

  async updateSubscriber(listId: string, email: string, data: Partial<Subscriber>): Promise<void> {
    console.log('[ZeptoMail] Updating subscriber:', email, data);
  }

  async addTag(email: string, tag: string): Promise<void> {
    console.log('[ZeptoMail] Adding tag:', tag, 'to:', email);
  }

  async removeTag(email: string, tag: string): Promise<void> {
    console.log('[ZeptoMail] Removing tag:', tag, 'from:', email);
  }

  async sendTransactionalEmail(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log('[ZeptoMail] Sending transactional email:', to, templateId);
    // TODO: Implement ZeptoMail API call
    // const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email: to }], dynamic_template_data: data }],
    //     from: { email: 'no-reply@puncto.com.br' },
    //     template_id: templateId,
    //   }),
    // });
  }

  async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    console.log('[ZeptoMail] Creating campaign:', campaign.name);
    return { ...campaign, id: `zepto_campaign_${Date.now()}` };
  }

  async sendCampaign(campaignId: string): Promise<void> {
    console.log('[ZeptoMail] Sending campaign:', campaignId);
  }
}

// Resend implementation stub
class ResendProvider implements EmailMarketingProvider {
  name = 'Resend';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async addSubscriber(listId: string, subscriber: Subscriber): Promise<void> {
    console.log('[Resend] Adding subscriber:', subscriber.email, 'to list:', listId);
  }

  async removeSubscriber(listId: string, email: string): Promise<void> {
    console.log('[Resend] Removing subscriber:', email, 'from list:', listId);
  }

  async updateSubscriber(listId: string, email: string, data: Partial<Subscriber>): Promise<void> {
    console.log('[Resend] Updating subscriber:', email, data);
  }

  async addTag(email: string, tag: string): Promise<void> {
    console.log('[Resend] Adding tag:', tag, 'to:', email);
  }

  async removeTag(email: string, tag: string): Promise<void> {
    console.log('[Resend] Removing tag:', tag, 'from:', email);
  }

  async sendTransactionalEmail(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log('[Resend] Sending transactional email:', to, templateId);
    // TODO: Implement Resend API call
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Puncto <no-reply@puncto.com.br>',
    //     to: [to],
    //     subject: 'Email Subject',
    //     html: '...',
    //   }),
    // });
  }

  async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    console.log('[Resend] Creating campaign:', campaign.name);
    return { ...campaign, id: `resend_campaign_${Date.now()}` };
  }

  async sendCampaign(campaignId: string): Promise<void> {
    console.log('[Resend] Sending campaign:', campaignId);
  }
}

// Null/No-op provider for when no email marketing platform is configured
class NullProvider implements EmailMarketingProvider {
  name = 'None';

  async addSubscriber(listId: string, subscriber: Subscriber): Promise<void> {
    console.log('[Email Marketing] No provider configured. Subscriber not synced:', subscriber.email);
  }

  async removeSubscriber(): Promise<void> {}
  async updateSubscriber(): Promise<void> {}
  async addTag(): Promise<void> {}
  async removeTag(): Promise<void> {}
  
  async sendTransactionalEmail(
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log('[Email Marketing] No provider configured. Email not sent to:', to);
  }

  async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    return { ...campaign, id: `local_campaign_${Date.now()}` };
  }

  async sendCampaign(): Promise<void> {}
}

// Factory function to get the configured email marketing provider
function getEmailMarketingProvider(): EmailMarketingProvider {
  const provider = process.env.EMAIL_MARKETING_PROVIDER?.toLowerCase();
  
  switch (provider) {
    case 'mailchimp':
      const mailchimpKey = process.env.MAILCHIMP_API_KEY;
      if (!mailchimpKey) {
        console.warn('MAILCHIMP_API_KEY not configured');
        return new NullProvider();
      }
      return new MailchimpProvider(mailchimpKey);
      
    case 'zeptomail':
      const zeptomailKey = process.env.ZEPTOMAIL_API_KEY;
      if (!zeptomailKey) {
        console.warn('ZEPTOMAIL_API_KEY not configured');
        return new NullProvider();
      }
      return new ZeptoMailProvider(zeptomailKey);
      
    case 'resend':
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.warn('RESEND_API_KEY not configured');
        return new NullProvider();
      }
      return new ResendProvider(resendKey);
      
    default:
      return new NullProvider();
  }
}

// Export singleton instance
export const emailMarketing = getEmailMarketingProvider();

// Default list ID for newsletter subscribers
const DEFAULT_LIST_ID = process.env.EMAIL_MARKETING_DEFAULT_LIST_ID || 'default';

// Convenience functions
export async function addNewsletterSubscriber(email: string, name?: string): Promise<void> {
  const [firstName, ...lastNameParts] = (name || '').split(' ');
  await emailMarketing.addSubscriber(DEFAULT_LIST_ID, {
    email,
    firstName: firstName || undefined,
    lastName: lastNameParts.join(' ') || undefined,
    tags: ['newsletter'],
  });
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  await emailMarketing.sendTransactionalEmail(email, 'welcome-email', {
    name: name || 'there',
  });
}

export async function sendDemoConfirmation(
  email: string,
  name: string,
  scheduledDate?: string
): Promise<void> {
  await emailMarketing.sendTransactionalEmail(email, 'demo-confirmation', {
    name,
    scheduledDate,
  });
}
