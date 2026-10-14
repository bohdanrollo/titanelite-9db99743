import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Bell, CreditCard, LogOut, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import ReminderSettings from "@/components/ReminderSettings";

const TIER_LABEL: Record<string, string> = { limited: "Limited Access", full: "Full Access", elite: "Elite Access" };

export default function ProfileScreen({ tier, isAdmin, intakeStatus, onBack, onUpgrade, billing }: {
  tier: string | null; isAdmin: boolean; intakeStatus?: string; onBack: () => void; onUpgrade: () => void; billing: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const [calories, setCalories] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("nutrition_goals").select("calorie_goal").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setCalories(data?.calorie_goal ?? null));
  }, [user]);

  const name = user?.email?.split("@")[0] ?? "Member";
  return (
    <div className="mt-6 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted"><ArrowLeft size={16} /></button>
        <h2 className="text-xl font-medium">Profile</h2>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full tile tile-lilac grid place-items-center text-xl font-semibold">{name[0]?.toUpperCase()}</div>
        <div>
          <div className="text-lg font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="tile tile-mint p-4"><div className="text-xs opacity-70">Plan</div><div className="mt-2 font-medium">{isAdmin ? "Admin" : TIER_LABEL[tier ?? ""] ?? "None"}</div></div>
        <div className="tile tile-sky p-4"><div className="text-xs opacity-70">Intake</div><div className="mt-2 font-medium capitalize">{intakeStatus ?? "Not started"}</div></div>
        <div className="tile tile-peach p-4"><div className="text-xs opacity-70">Daily calories</div><div className="mt-2 font-medium">{calories ? `${calories.toLocaleString()} kcal` : "—"}</div></div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card divide-y divide-border">
        {tier !== "elite" && (
          <button onClick={onUpgrade} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted">
            <Sparkles size={18} /><span className="flex-1"><span className="block font-medium">Upgrade plan</span><span className="text-xs text-muted-foreground">Full or Elite Access</span></span><ChevronRight size={16} />
          </button>
        )}
        <div className="flex items-center gap-3 p-4">
          <CreditCard size={18} /><span className="flex-1"><span className="block font-medium">Plan & billing</span><span className="text-xs text-muted-foreground">Manage your subscription</span></span>{billing}
        </div>
        <div className="p-4"><div className="flex items-center gap-3"><Bell size={18} /><span className="font-medium">Reminders</span></div><ReminderSettings /></div>
        <button onClick={signOut} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted">
          <LogOut size={18} /><span className="flex-1 font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
