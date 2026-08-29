import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function AddToHomeScreenButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent;
    setIsIos(
      /iphone|ipad|ipod/i.test(ua) ||
        (ua.includes("Macintosh") && "ontouchend" in document)
    );
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } finally {
        setDeferred(null);
      }
      return;
    }
    // No native prompt available (iOS Safari, or Chrome before the event
    // fires) — show manual instructions instead.
    setShowHelp(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 text-muted-foreground hover:text-blood transition"
        title="Add Titan Elite to your home screen"
      >
        <Smartphone size={14} />
        <span className="hidden sm:inline">Add to home screen</span>
        <span className="sm:hidden">Home screen</span>
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm border border-foreground/15 bg-card p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="text-eyebrow">Stay logged in, one tap away</div>
            <h3 className="mt-2 font-display text-2xl">Add to home screen</h3>
            {isIos ? (
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-blood font-display">1.</span>
                  <span>
                    Tap the <strong className="text-foreground">Share</strong> button{" "}
                    <Share size={12} className="inline text-foreground" /> in Safari's toolbar (the square with an arrow).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blood font-display">2.</span>
                  <span>
                    Scroll and tap{" "}
                    <strong className="text-foreground">
                      Add to Home Screen <Plus size={12} className="inline" />
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blood font-display">3.</span>
                  <span>Tap Add. Titan Elite opens full-screen like an app, and you stay logged in.</span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-blood font-display">1.</span>
                  <span>
                    Open your browser menu (
                    <strong className="text-foreground">⋮</strong> on Android, or the install icon in the address bar on
                    desktop Chrome).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blood font-display">2.</span>
                  <span>
                    Tap{" "}
                    <strong className="text-foreground">
                      Add to Home screen <Plus size={12} className="inline" />
                    </strong>{" "}
                    (or "Install app").
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blood font-display">3.</span>
                  <span>Confirm. Titan Elite opens full-screen like an app, and you stay logged in.</span>
                </li>
              </ol>
            )}
            <button onClick={() => setShowHelp(false)} className="mt-6 w-full btn-blood hover:btn-blood-hover">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
