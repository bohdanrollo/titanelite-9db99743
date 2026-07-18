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
  title?: string
  dashboardUrl?: string
}

const DASHBOARD_URL = 'https://titanelite.org/dashboard'

const ProtocolReadyEmail = ({ name, title, dashboardUrl }: Props) => {
  const url = dashboardUrl || DASHBOARD_URL
  const greeting = name ? `${name},` : 'Athlete,'
  const protocolTitle = title || 'Your Titan Elite Protocol'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Titan Elite protocol is ready to view.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TITAN ELITE</Text>
            <Heading style={h1}>Your protocol is ready.</Heading>
          </Section>

          <Section>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Your custom protocol — <strong>{protocolTitle}</strong> — has been finalized
              and delivered to your dashboard. Read every line before you touch a weight.
            </Text>
            <Text style={paragraph}>
              This is your blueprint for becoming the best version of yourself — stronger,
              sharper, and more disciplined than the person you were yesterday. Log in,
              lock in, and get to work.
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={url} style={button}>
              View Your Protocol
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Questions? Reply to this email or message us directly from your dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProtocolReadyEmail,
  subject: 'Your Titan Elite protocol is ready',
  displayName: 'Protocol Ready',
  previewData: { name: 'Marcus', title: 'Elite Protocol — Marcus R.' },
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
