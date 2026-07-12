// ============================================================================
// Web push notifications — client helper + hook. Registers the service worker,
// manages the browser PushManager subscription, and syncs it to the backend
// (device_tokens) via server functions. iOS Safari supports web push only for
// home-screen PWAs; everything degrades gracefully when unsupported.
// ============================================================================
import { useCallback, useEffect, useState } from "react";

import {
  savePushSubscription,
  deletePushSubscription,
  VAPID_PUBLIC_KEY,
} from "@/lib/chat.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export function usePushNotifications() {
  const [supported] = useState(() => pushSupported());
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : "denied",
  );
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reflect the current subscription state on mount.
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    (async () => {
      try {
        const reg = await ensureRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (alive) setEnabled(!!sub);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [supported]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;
      const reg = await ensureRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }
      await savePushSubscription({ data: { subscription: sub.toJSON() as unknown } });
      setEnabled(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const disable = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await ensureRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        await deletePushSubscription({ data: { endpoint } }).catch(() => {});
      }
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, permission, enabled, loading, enable, disable };
}
