"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui";
import { startAttempt } from "@/lib/actions/problems";

export function StartButton({ problemKey, url, label, size = "md" }: { problemKey: string; url: string; label: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="primary"
      size={size}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
          await startAttempt(problemKey);
          window.open(url, "_blank", "noopener");
          router.push(`/problems/${problemKey}`);
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      ▶ {label}
    </Button>
  );
}
