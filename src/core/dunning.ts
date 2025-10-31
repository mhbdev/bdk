import { BaseEntity } from "./interfaces";

export interface DunningCampaign extends BaseEntity {
  name: string;
  steps: DunningStep[];
  enabled: boolean;
}

export interface DunningStep {
  dayOffset: number;
  action: 'retry_payment' | 'send_email' | 'send_sms' | 'webhook';
  config: Record<string, any>;
}

export interface DunningCampaignConfig {
  name: string;
  steps: DunningStep[];
  maxAttempts?: number;
  giveUpAfterDays?: number;
}

export interface DunningAttempt extends BaseEntity {
  subscriptionId: string;
  paymentId: string;
  attemptNumber: number;
  scheduledAt: Date;
  executedAt?: Date;
  status: 'scheduled' | 'succeeded' | 'failed' | 'skipped';
  result?: string;
}

