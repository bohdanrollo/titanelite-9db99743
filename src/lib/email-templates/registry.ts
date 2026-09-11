import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *    *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as protocolReadyTemplate } from './protocol-ready'
import { template as affiliateApprovedTemplate } from './affiliate-approved'
import { template as coachCallScheduledTemplate } from './coach-call-scheduled'
import { template as callApprovedTemplate } from './call-approved'
import { template as pephubDealTemplate } from './pephub-deal'
import { template as pephubSaleTemplate } from './pephub-sale'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'protocol-ready': protocolReadyTemplate,
  'affiliate-approved': affiliateApprovedTemplate,
  'coach-call-scheduled': coachCallScheduledTemplate,
  'call-approved': callApprovedTemplate,
  'pephub-deal': pephubDealTemplate,
  'pephub-sale': pephubSaleTemplate,
}

