"use client";

import { useVideo } from "@100mslive/react-sdk";
import type { HMSPeer } from "@100mslive/hms-video-store";
import styles from "@/components/video-call/video-call.module.css";

interface HmsParticipantTileProps {
  peer: HMSPeer;
  label: string;
}

export function HmsParticipantTile({ peer, label }: HmsParticipantTileProps) {
  if (peer.videoTrack) {
    return <HmsParticipantTileVideo peer={peer} label={label} />;
  }

  return (
    <div className={`${styles.tile} ${peer.isLocal ? styles.tileLocal : ""}`}>
      <div className={styles.tilePlaceholder}>Camera off</div>
      <div className={styles.tileMeta}>
        <span>
          {label}
          {peer.isLocal ? " · You" : ""}
        </span>
        <em>Cam off</em>
      </div>
    </div>
  );
}

function HmsParticipantTileVideo({ peer, label }: HmsParticipantTileProps) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack! });

  return (
    <div className={`${styles.tile} ${peer.isLocal ? styles.tileLocal : ""}`}>
      <video ref={videoRef} className={styles.tileVideo} autoPlay muted={peer.isLocal} playsInline />
      <div className={styles.tileMeta}>
        <span>
          {label}
          {peer.isLocal ? " · You" : ""}
        </span>
      </div>
    </div>
  );
}
