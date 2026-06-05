import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Mail, MessageSquare, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Titan Elite" },
      { name: "description", content: "Get in touch with Titan Elite coaching." },
      { property: "og:title", content: "Contact — Titan Elite" },
      { property: "og:description", content: "Send a message." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="container-edge py-20 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="text-eyebrow">Contact</div>
          <h1 className="mt-4 text-6xl lg:text-7xl">Get in touch.</h1>
          <div className="mt-8 space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="text-blood mt-1" size={20} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Email</div>
                <div className="font-display text-xl">coach@titanelite.com</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="text-blood mt-1" size={20} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Response Time</div>
                <div className="font-display text-xl">Within 24 hours</div>
              </div>
            </div>
          </div>
        </div>
        <form
          className="lg:col-span-7 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => {
              setSending(false);
              toast.success("Message received. We'll be in touch within 24 hours.");
              (e.target as HTMLFormElement).reset();
            }, 700);
          }}
        >
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Subject" name="subject" />
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">Message</label>
            <textarea
              name="message"
              rows={6}
              required
              className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
            />
          </div>
          <button type="submit" disabled={sending} className="btn-blood hover:btn-blood-hover">
            {sending ? "Sending…" : <>Send Message <Send size={14} /></>}
          </button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-2">{label}{required && " *"}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full bg-background border border-foreground/20 px-4 py-3 focus:outline-none focus:border-blood transition"
      />
    </div>
  );
}
