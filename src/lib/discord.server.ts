/**
 * Best-effort Discord webhook notifications.
 * Never throws — a Discord outage must not break Stripe webhooks or admin actions.
 */

export type DiscordField = { name: string; value: string; inline?: boolean };

export async function sendDiscordNotification(opts: {
  title: string;
  description?: string;
  fields?: DiscordField[];
  color?: number;
}): Promise<void> {
  const url = process.env['DISCORD_WEBHOOK_URL'];
  if (!url) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        embeds: [
          {
            title: opts.title,
            description: opts.description,
            color: opts.color ?? 0xc1121f,
            fields: (opts.fields ?? []).filter((f) => f.value).slice(0, 25),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("[discord] webhook responded", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.warn("[discord] notification failed", e);
  }
}
