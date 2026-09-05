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
  when?: string
  callType?: string
  duration?: number
  coachName?: string
  adminNote?: string
  dashboardUrl?: string
}

const DASHBOARD_URL = 'https://titanelite.org/dashboard'

const CallApprovedEmail = ({
  name,
  when,
  callType,
  duration,
  coachName,
  adminNote,
  dashboardUrl,
}: Props) => {
  const url = dashboardUrl || DASHBOARD_URL
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your coaching call is confirmed.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TITAN ELITE</Text>
            <Heading style={h1}>Your call is confirmed.</Heading>
          </Section>

          <Section>
            <Text style={paragraph}>{name ? `${name},` : 'Athlete,'}</Text>
            <Text style={paragraph}>
              Good news — your coaching call has been approved. Put it on your calendar
              and come ready with your questions.
            </Text>
            <Text style={detail}><strong>When:</strong> {when || 'See your dashboard'}</Text>
            <Text style={detail}><strong>Topic:</strong> {callType || 'Coaching call'}{duration ? ` · ${duration} min` : ''}</Text>
            {coachName && <Text style={detail}><strong>Coach:</strong> {coachName}</Text>}
            {adminNote && <Text style={detail}><strong>Note from your coach:</strong> {adminNote}</Text>}
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={url} style={button}>
              View In Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Need to change the time? Cancel from your dashboard and request a new slot.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CallApprovedEmail,
  subject: 'Your Titan Elite coaching call is confirmed',
  displayName: 'Client — Call Approved',
  previewData: {
    name: 'Marcus',
    when: 'Tue, Sep 8, 2026 at 10:00 AM',
    callType: 'Fitness',
    duration: 30,
    coachName: 'Alex T.',
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
const detail: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#1f1f1f',
  margin: '0 0 6px',
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
const hr: React.CSSProperties = { borderColor: '#e5e5e5', margin: '28px 0' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#6b6b6b', lineHeight: '1.6' }
