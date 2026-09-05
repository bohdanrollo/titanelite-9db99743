import { X } from "lucide-react";
import type { Appointment } from "@/lib/coaching.functions";
import { CALL_TYPE_LABEL, SPECIALTY_LABEL, STATUS_LABEL, formatDate, formatTime } from "@/lib/tz";

export type CallStatus = "upcoming" | "completed" | "cancelled" | "no_show";

const CALL_STATUS_CLASSES: Record<string, string> = {
  upcoming: "text-sky-700 border-sky-500/40 bg-sky-500/10",
  completed: "text-emerald-700 border-emerald-500/40 bg-emerald-500/10",
  cancelled: "text-muted-foreground border-foreground/20 bg-muted",
  no_show: "text-amber-700 border-amber-500/40 bg-amber-500/10",
};

const COACH_STATUS_CLASSES: Record<string, string> = {
  approved: "text-emerald-700 border-emerald-500/40 bg-emerald-500/10",
  pending: "text-amber-700 border-amber-500/40 bg-amber-500/10",
  suspended: "text-blood border-blood/40 bg-blood/10",
  inactive: "text-muted-foreground border-foreground/20 bg-muted",
};

export function StatusBadge({ status, kind = "call" }: { status: string; kind?: "call" | "coach" }) {
  const cls = (kind === "coach" ? COACH_STATUS_CLASSES : CALL_STATUS_CLASSES)[status] ?? "text-muted-foreground border-foreground/20 bg-muted";
  const label = kind === "coach" ? status.charAt(0).toUpperCase() + status.slice(1) : (STATUS_LABEL[status] ?? status);
  return (
    <span className={`inline-flex items-center border px-2 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}>
      {label}
    </span>
  );
}

export function CallDetailModal({
  call,
  tz,
  onClose,
  onStatus,
  extra,
}: {
  call: Appointment;
  tz: string;
  onClose: () => void;
  onStatus?: (status: CallStatus) => void | Promise<void>;
  extra?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-foreground/12 rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
          <div className="font-display text-2xl">Call details</div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <Row label="Status"><StatusBadge status={call.status} /></Row>
          <Row label="Client">{call.client_name || "—"}</Row>
          <Row label="Client email">{call.client_email || "—"}</Row>
          {call.coach_name && <Row label="Coach">{call.coach_name}</Row>}
          <Row label="Call type">{CALL_TYPE_LABEL[call.call_type] ?? call.call_type}</Row>
          <Row label="Coaching category">{SPECIALTY_LABEL[call.specialty] ?? call.specialty}</Row>
          <Row label="Date">{formatDate(call.start_time, tz)}</Row>
          <Row label="Time">{formatTime(call.start_time, tz)} – {formatTime(call.end_time, tz)} ({tz.replace("_", " ")})</Row>
          <Row label="Duration">{call.duration_minutes} minutes</Row>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
            <p className="mt-1 whitespace-pre-wrap">{call.notes || "—"}</p>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Created {formatDate(call.created_at, tz)} · Updated {formatDate(call.updated_at, tz)}
          </div>
          {extra}
        </div>
        {onStatus && (
          <div className="px-6 py-4 border-t border-foreground/10 flex flex-wrap gap-2">
            {(["upcoming", "completed", "no_show", "cancelled"] as CallStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onStatus(s)}
                disabled={call.status === s}
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] border border-foreground/15 rounded-full hover:bg-muted disabled:opacity-40"
              >
                Mark {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground pt-0.5">{label}</div>
      <div className="text-right">{children}</div>
    </div>
  );
}
