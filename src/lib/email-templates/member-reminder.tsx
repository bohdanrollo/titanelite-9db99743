import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  kind?: 'dose' | 'checkin'
  items?: string[]
  dashboardUrl?: string
}

const MemberReminderEmail = ({ kind = 'dose', items = [], dashboardUrl }: Props) => {
  const url = dashboardUrl || 'https://peplog.io/dashboard?tab=' + (kind === 'dose' ? 'mystack' : 'progress')
  const isDose = kind === 'dose'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isDose ? "Today's stack is ready to log." : 'Time for your weekly check-in.'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>PEPLOG</Text>
          <Heading style={h1}>{isDose ? "Today's stack" : 'Weekly check-in'}</Heading>
          <Section>
            {isDose ? (
              <>
                <Text style={p}>Here's what's on your schedule today:</Text>
                {items.map((i) => <Text key={i} style={item}>• {i}</Text>)}
              </>
            ) : (
              <Text style={p}>Take a minute to log your weight, measurements and how you're feeling this week.</Text>
            )}
          </Section>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={url} style={button}>{isDose ? 'Log doses' : 'Log check-in'}</Button>
          </Section>
          <Text style={footer}>You can turn reminders off anytime from Profile in your dashboard. For research and educational purposes only.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MemberReminderEmail,
  subject: (d: Record<string, any>) => (d.kind === 'checkin' ? 'Your weekly PepLog check-in' : "Today's PepLog stack"),
  displayName: 'Client — Reminder',
  previewData: { kind: 'dose', items: ['Retatrutide · 1 mg · AM'] },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', color: '#0a0a0a', margin: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const eyebrow: React.CSSProperties = { fontSize: '11px', letterSpacing: '0.2em', margin: 0, fontWeight: 700 }
const h1: React.CSSProperties = { fontSize: '28px', margin: '8px 0 16px', fontWeight: 700 }
const p: React.CSSProperties = { fontSize: '15px', lineHeight: '1.6', margin: '0 0 10px' }
const item: React.CSSProperties = { fontSize: '15px', margin: '0 0 4px' }
const button: React.CSSProperties = { backgroundColor: '#0a0a0a', color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const footer: React.CSSProperties = { fontSize: '12px', color: '#6b6b6b', lineHeight: '1.6' }
