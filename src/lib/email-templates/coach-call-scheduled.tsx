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
  coachName?: string
  clientName?: string
  clientEmail?: string
  when?: string
  callType?: string
  duration?: number
  notes?: string
  dashboardUrl?: string
}

const COACH_URL = 'https://titanelite.org/coach'

const CoachCallScheduledEmail = ({
  coachName,
  clientName,
  clientEmail,
  when,
  callType,
  duration,
  notes,
  dashboardUrl,
}: Props) => {
  const url = dashboardUrl || COACH_URL
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>A new coaching call has been added to your calendar.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TITAN ELITE</Text>
            <Heading style={h1}>New call on your calendar.</Heading>
          </Section>

          <Section>
            <Text style={paragraph}>{coachName ? `${coachName},` : 'Coach,'}</Text>
            <Text style={paragraph}>
              A session has been scheduled with you. Here are the details:
            </Text>
            <Text style={detail}><strong>Client:</strong> {clientName || clientEmail || 'Client'}</Text>
            {clientEmail && <Text style={detail}><strong>Email:</strong> {clientEmail}</Text>}
            <Text style={detail}><strong>When:</strong> {when || 'See your dashboard'}</Text>
            <Text style={detail}><strong>Type:</strong> {callType || 'Coaching call'}{duration ? ` · ${duration} min` : ''}</Text>
            {notes && <Text style={detail}><strong>Talking points:</strong> {notes}</Text>}
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={url} style={button}>
              Open Coach Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>Times shown in your coaching time zone.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CoachCallScheduledEmail,
  subject: 'New coaching call scheduled',
  displayName: 'Coach — Call Scheduled',
  previewData: {
    coachName: 'Alex',
    clientName: 'Marcus R.',
    clientEmail: 'marcus@example.com',
    when: 'Tue, Sep 8, 2026 at 10:00 AM',
    callType: 'Fitness',
    duration: 30,
    notes: 'Wants help structuring a push/pull split.',
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
