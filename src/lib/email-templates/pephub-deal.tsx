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
  name?: string
  sourceName?: string
  sourceUrl?: string
  headline?: string
  details?: string
  promoCode?: string
}

const SITE_URL = 'https://titanelite.org'

const PepHubDealEmail = ({ name, sourceName, sourceUrl, headline, details, promoCode }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{headline || 'A trusted PepHub source is running a sale.'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={eyebrow}>PEPHUB / TITAN ELITE</Text>
          <Heading style={h1}>{headline || 'Sale alert'}</Heading>
        </Section>

        <Section>
          <Text style={paragraph}>{name ? `${name},` : 'Hey,'}</Text>
          <Text style={paragraph}>
            <strong>{sourceName || 'One of our trusted sources'}</strong> is running a
            deal right now.
          </Text>
          {details ? <Text style={paragraph}>{details}</Text> : null}
          {promoCode ? (
            <Text style={paragraph}>
              Use code <strong style={{ color: '#8a0f1a' }}>{promoCode}</strong> at checkout.
            </Text>
          ) : null}
        </Section>

        {sourceUrl ? (
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={sourceUrl} style={button}>
              Shop {sourceName || 'the source'}
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          You're getting this because you signed up for PepHub source alerts at{' '}
          {SITE_URL}/pephub. Titan Elite does not sell or ship any product — these are
          independent third-party sources shared for research purposes only.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PepHubDealEmail,
  subject: (d: Record<string, unknown>) =>
    `PepHub deal: ${(d?.['sourceName'] as string) || 'trusted source'} sale`,
  displayName: 'PepHub Deal Alert',
  previewData: {
    name: 'Alex',
    sourceName: 'Powerbuilt Labs',
    sourceUrl: 'https://powerbuiltlabs.com',
    headline: '30% off site-wide this weekend',
    details: 'Ends Sunday at midnight.',
    promoCode: 'TITAN30',
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
