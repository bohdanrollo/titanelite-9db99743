import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  vendor_name?: string
  sale_title?: string
  discount?: string
  coupon_code?: string
  sale_start?: string
  sale_end?: string
  promotion_url?: string
  pephub_url?: string
  detection_date?: string
}

const SITE_URL = 'https://titanelite.org'

const PepHubSaleEmail = ({
  vendor_name,
  sale_title,
  discount,
  coupon_code,
  sale_start,
  sale_end,
  promotion_url,
  pephub_url,
  detection_date,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {`${vendor_name || 'A PepHub source'} — ${discount || sale_title || 'promotion'}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={eyebrow}>TITAN ELITE / TRUSTED SOURCE ALERT</Text>
          <Heading style={h1}>{sale_title || 'Sale alert'}</Heading>
        </Section>

        <Section>
          <Text style={paragraph}>
            A source listed in PepHub appears to be running a promotion.
          </Text>
          <Text style={paragraph}>
            <strong>{vendor_name || 'Listed source'}</strong>
            {discount ? (
              <>
                {' — '}
                <strong style={{ color: '#8a0f1a' }}>{discount}</strong>
              </>
            ) : null}
          </Text>
          {coupon_code ? (
            <Text style={paragraph}>
              Coupon code: <strong style={{ color: '#8a0f1a' }}>{coupon_code}</strong>
            </Text>
          ) : null}
          {sale_start ? <Text style={paragraph}>Starts: {sale_start}</Text> : null}
          {sale_end ? <Text style={paragraph}>Ends: {sale_end}</Text> : null}
          {detection_date ? (
            <Text style={smallNote}>Detected {detection_date}. Details are set by the vendor and can change at any time.</Text>
          ) : null}
        </Section>

        {promotion_url ? (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={promotion_url} style={button}>
              View sale
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          You can find this source and the rest of the list inside PepHub at{' '}
          {pephub_url || `${SITE_URL}/pephub`}. You're getting this because you signed up for
          PepHub source alerts. Titan Elite does not sell or ship any product — these are
          independent third-party sources shared for research purposes only. To stop receiving
          these emails, use the unsubscribe link below.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PepHubSaleEmail,
  subject: (d: Record<string, unknown>) =>
    `🔥 New Trusted Source Sale — ${(d?.['discount'] as string) || (d?.['sale_title'] as string) || 'promotion live'}`,
  displayName: 'PepHub Trusted Source Sale',
  previewData: {
    vendor_name: 'Example Peptides',
    sale_title: 'Summer Sale',
    discount: '25% OFF',
    coupon_code: 'SUMMER25',
    sale_start: 'September 6, 2026',
    sale_end: 'September 10, 2026',
    promotion_url: 'https://example.com/sale',
    pephub_url: `${SITE_URL}/pephub`,
    detection_date: 'September 6, 2026',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
  color: '#0a0a0a',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const header: React.CSSProperties = { marginBottom: '24px' }
const eyebrow: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.2em',
  color: '#8a0f1a',
  margin: 0,
  fontWeight: 700,
}
const h1: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: '1.2',
  margin: '8px 0 0',
  color: '#0a0a0a',
  fontWeight: 700,
}
const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#1f1f1f',
  margin: '0 0 14px',
}
const smallNote: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#6b6b6b',
  margin: '0 0 14px',
}
const button: React.CSSProperties = {
  backgroundColor: '#8a0f1a',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '2px',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textDecoration: 'none',
  textTransform: 'uppercase',
  display: 'inline-block',
}
const hr: React.CSSProperties = { borderColor: '#e5e5e5', margin: '32px 0 16px' }
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b6b6b',
  lineHeight: '1.5',
  margin: 0,
}
