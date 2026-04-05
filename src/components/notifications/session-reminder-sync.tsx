"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { triggerPendingSessionRemindersAction } from "@/actions/training";

type SessionReminderSyncProps = {
  enabled: boolean;
};

export function SessionReminderSync({ enabled }: SessionReminderSyncProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || isPending || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;

    startTransition(async () => {
      try {
        const createdCount = await triggerPendingSessionRemindersAction();
        if (createdCount > 0) {
          router.refresh();
        }
      } finally {
        inFlightRef.current = false;
      }
    });
  }, [enabled, isPending, pathname, router]);

  return null;
}
