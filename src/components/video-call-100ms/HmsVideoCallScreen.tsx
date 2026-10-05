"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { JoinHmsForm } from "./JoinHmsForm";
import { HmsVideoCallRoom } from "./HmsVideoCallRoom";
import styles from "@/components/video-call/video-call.module.css";

interface Session {
  token: string;
  identity: string;
  room: string;
  role: string;
}

export function HmsVideoCallScreen() {
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback(
    (message: string) => {
      setError(message);
      showToast(message);
    },
    [showToast],
  );

  const join = useCallback(
    async (identity: string, room: string, role: string) => {
      setBusy(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ identity, room, role });
        const res = await fetch(`/api/hms-token?${qs.toString()}`);
        const data = (await res.json()) as { token?: string; error?: string };
        if (!res.ok || !data.token) {
          throw new Error(data.error || "Could not join the room.");
        }
        setSession({ token: data.token, identity, room, role });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not join the room. Check your 100ms setup.";
        onError(message);
      } finally {
        setBusy(false);
      }
    },
    [onError],
  );

  const leave = useCallback(() => {
    setSession(null);
    setError(null);
    showToast("Left the call");
  }, [showToast]);

  return (
    <div className={`screen ${styles.screen}`}>
      <div className={styles.bg} aria-hidden />
      {!session ? (
        <div className={styles.joinWrap}>
          <JoinHmsForm onJoin={join} busy={busy} error={error} />
        </div>
      ) : (
        <HmsVideoCallRoom
          authToken={session.token}
          userName={session.identity}
          roomName={session.room}
          onLeave={leave}
          onError={onError}
        />
      )}
    </div>
  );
}
