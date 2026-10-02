"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { JoinCallForm } from "@/components/video-call/JoinCallForm";
import { VideoCallRoom } from "@/components/video-call/VideoCallRoom";
import styles from "@/components/video-call/video-call.module.css";

interface Session {
  token: string;
  url: string;
  identity: string;
  room: string;
}

export function VideoCallScreen() {
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
    async (identity: string, room: string) => {
      setBusy(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ identity, room });
        const res = await fetch(`/api/livekit-token?${qs.toString()}`);
        const data = (await res.json()) as { token?: string; url?: string; error?: string };
        if (!res.ok || !data.token || !data.url) {
          throw new Error(data.error || "Could not join the room.");
        }
        setSession({ token: data.token, url: data.url, identity, room });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not join the room. Check your LiveKit setup.";
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
          <JoinCallForm onJoin={join} busy={busy} error={error} />
        </div>
      ) : (
        <VideoCallRoom
          token={session.token}
          serverUrl={session.url}
          identity={session.identity}
          roomName={session.room}
          onLeave={leave}
          onError={onError}
        />
      )}
    </div>
  );
}
