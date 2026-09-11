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
}

const SITE_URL = 'https://titanelite.org'

const WelcomeEmail = ({ name }: Props) => {
  const greeting = name ? `${name},` : 'Welcome,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to Titan Elite — your account is live.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TITAN ELITE</Text>
            <Heading style={h1}>Welcome in.</Heading>
          </Section>

          <Section>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Your Titan Elite account is live. Sign in any time to submit your intake,
              track doses, run lab analysis, log nutrition and workouts, build your
              peptide stack and browse the trusted-source directory.
            </Text>
            <Text style={paragraph}>
              Start with your intake — it's what we use to build your personalized
              protocol.
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={`${SITE_URL}/dashboard`} style={button}>
              Open Your Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Questions? Just reply to this email. Titan Elite content is for
            informational purposes and is not medical advice.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Titan Elite',
  displayName: 'Welcome',
  previewData: { name: 'Marcus' },
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
