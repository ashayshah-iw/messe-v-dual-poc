"use client";

import { useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  isTrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ParticipantTile } from "./ParticipantTile";
import { ConnectionStatus, VideoControls } from "./VideoControls";
import styles from "./video-call.module.css";

interface VideoCallRoomProps {
  token: string;
  serverUrl: string;
  identity: string;
  roomName: string;
  onLeave: () => void;
  onError: (message: string) => void;
}

export function VideoCallRoom({
  token,
  serverUrl,
  identity,
  roomName,
  onLeave,
  onError,
}: VideoCallRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      onDisconnected={onLeave}
      onError={(err) => {
        const msg = err?.message?.toLowerCase() ?? "";
        if (msg.includes("permission") || msg.includes("notallowed")) {
          onError(
            "Camera or microphone access was denied. Please allow access in your browser settings and try again.",
          );
        } else if (msg.includes("device")) {
          onError("Camera or microphone is unavailable on this device.");
        } else {
          onError(err?.message || "Could not connect to the video room.");
        }
      }}
      className={styles.roomShell}
      data-lk-theme="default"
    >
      <RoomChrome identity={identity} roomName={roomName} onLeave={onLeave} onError={onError} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function RoomChrome({
  identity,
  roomName,
  onLeave,
  onError,
}: {
  identity: string;
  roomName: string;
  onLeave: () => void;
  onError: (message: string) => void;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const tiles = useMemo(() => {
    return tracks.filter((t) => {
      if (!isTrackReference(t) && t.source === Track.Source.ScreenShare) return false;
      return true;
    });
  }, [tracks]);

  const count = Math.max(1, tiles.length);
  const gridClass =
    count === 1
      ? styles.gridOne
      : count === 2
        ? styles.gridTwo
        : count <= 4
          ? styles.gridFour
          : styles.gridMany;

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div>
          <p className="eyebrow">Room · {roomName}</p>
          <h2>Video Call</h2>
        </div>
        <div className={styles.roomHeaderRight}>
          <span className="chip">{tiles.length} on call</span>
          <ConnectionStatus />
        </div>
      </header>

      <div className={`${styles.grid} ${gridClass}`}>
        {tiles.map((trackRef) => {
          const isLocal = trackRef.participant.isLocal;
          const name =
            trackRef.participant.name ||
            trackRef.participant.identity ||
            (isLocal ? identity : "Guest");
          const screen = trackRef.source === Track.Source.ScreenShare;
          const key = `${trackRef.participant.identity}-${trackRef.source}`;
          return (
            <ParticipantTile
              key={key}
              trackRef={trackRef}
              label={screen ? `${name} · Screen` : name}
              isLocal={isLocal}
            />
          );
        })}
      </div>

      <VideoControls onLeave={onLeave} onError={onError} />
    </div>
  );
}
