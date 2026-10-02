"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { VideoTrack, isTrackReference } from "@livekit/components-react";
import styles from "./video-call.module.css";

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  label: string;
  isLocal?: boolean;
}

export function ParticipantTile({ trackRef, label, isLocal }: ParticipantTileProps) {
  const muted =
    isTrackReference(trackRef) && trackRef.publication
      ? trackRef.publication.isMuted
      : true;

  return (
    <div className={`${styles.tile} ${isLocal ? styles.tileLocal : ""}`}>
      {isTrackReference(trackRef) ? (
        <VideoTrack trackRef={trackRef} className={styles.tileVideo} />
      ) : (
        <div className={styles.tilePlaceholder}>Camera off</div>
      )}
      <div className={styles.tileMeta}>
        <span>
          {label}
          {isLocal ? " · You" : ""}
        </span>
        {muted ? <em>Cam off</em> : null}
      </div>
    </div>
  );
}
