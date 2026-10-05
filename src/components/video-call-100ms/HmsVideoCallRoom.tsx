"use client";

import { useEffect, useMemo } from "react";
import { HMSRoomProvider, useHMSActions, useHMSStore } from "@100mslive/react-sdk";
import { selectPeers, selectIsConnectedToRoom } from "@100mslive/hms-video-store";
import { HmsParticipantTile } from "./HmsParticipantTile";
import { HmsConnectionStatus, HmsVideoControls } from "./HmsVideoControls";
import styles from "@/components/video-call/video-call.module.css";

interface HmsVideoCallRoomProps {
  authToken: string;
  userName: string;
  roomName: string;
  onLeave: () => void;
  onError: (message: string) => void;
}

export function HmsVideoCallRoom(props: HmsVideoCallRoomProps) {
  return (
    <HMSRoomProvider>
      <HmsRoomInner {...props} />
    </HMSRoomProvider>
  );
}

function HmsRoomInner({
  authToken,
  userName,
  roomName,
  onLeave,
  onError,
}: HmsVideoCallRoomProps) {
  const hmsActions = useHMSActions();
  const peers = useHMSStore(selectPeers);
  const connected = useHMSStore(selectIsConnectedToRoom);

  useEffect(() => {
    let cancelled = false;

    const join = async () => {
      try {
        await hmsActions.join({
          userName,
          authToken,
          settings: { isAudioMuted: false, isVideoMuted: false },
        });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not connect to the 100ms room.";
        onError(message);
        onLeave();
      }
    };

    void join();

    return () => {
      cancelled = true;
      void hmsActions.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per session token
  }, [authToken, userName]);

  const tilePeers = useMemo(() => peers, [peers]);
  const count = Math.max(1, tilePeers.length);
  const gridClass =
    count === 1
      ? styles.gridOne
      : count === 2
        ? styles.gridTwo
        : count <= 4
          ? styles.gridFour
          : styles.gridMany;

  if (!connected && tilePeers.length === 0) {
    return (
      <div className={styles.roomShell}>
        <div className={styles.joinWrap}>
          <p className={styles.joinLead}>Connecting to 100ms…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roomShell}>
      <div className={styles.room}>
        <header className={styles.roomHeader}>
          <div>
            <p className="eyebrow">Room · {roomName}</p>
            <h2>100ms Video Call</h2>
          </div>
          <div className={styles.roomHeaderRight}>
            <span className="chip">{tilePeers.length} on call</span>
            <HmsConnectionStatus />
          </div>
        </header>

        <div className={`${styles.grid} ${gridClass}`}>
          {tilePeers.map((peer) => (
            <HmsParticipantTile
              key={peer.id}
              peer={peer}
              label={peer.name || peer.customerUserId || "Guest"}
            />
          ))}
        </div>

        <HmsVideoControls onLeave={onLeave} onError={onError} />
      </div>
    </div>
  );
}
