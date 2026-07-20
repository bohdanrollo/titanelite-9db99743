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
  code?: string
  referralUrl?: string
}

const SITE_URL = 'https://titanelite.org'

const AffiliateApprovedEmail = ({ name, code, referralUrl }: Props) => {
  const greeting = name ? `${name},` : 'Partner,'
  const affiliateCode = code || 'YOURCODE'
  const link = referralUrl || `${SITE_URL}/?ref=${affiliateCode}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're approved as a Titan Elite affiliate.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TITAN ELITE</Text>
            <Heading style={h1}>You're in.</Heading>
          </Section>

          <Section>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Your affiliate application has been approved. You now earn{' '}
              <strong>$25 for every 5 people</strong> who sign up through your
              referral link.
            </Text>
            <Text style={paragraph}>
              Your code: <strong style={{ color: '#8a0f1a' }}>{affiliateCode}</strong>
            </Text>
            <Text style={paragraph}>
              Your referral link:
              <br />
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{link}</span>
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={`${SITE_URL}/affiliate`} style={button}>
              Open Affiliate Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Share your link anywhere — social, DMs, wherever your audience lives.
            Track your referrals and earnings anytime from your dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AffiliateApprovedEmail,
  subject: "You're approved — Titan Elite Affiliate",
  displayName: 'Affiliate Approved',
  previewData: { name: 'Marcus', code: 'MARCUS', referralUrl: 'https://titanelite.org/?ref=MARCUS' },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica, Arial, sans-serif',
  color: '#0a0a0a',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 24px',
}
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
const hr: React.CSSProperties = {
  borderColor: '#e5e5e5',
  margin: '32px 0 16px',
}
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b6b6b',
  lineHeight: '1.5',
  margin: 0,
}
