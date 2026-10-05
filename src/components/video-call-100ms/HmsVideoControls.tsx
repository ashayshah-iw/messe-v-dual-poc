"use client";

import { useAVToggle, useHMSActions, useHMSStore } from "@100mslive/react-sdk";
import { selectIsConnectedToRoom } from "@100mslive/hms-video-store";
import { useScreenShare } from "@100mslive/react-sdk";
import styles from "@/components/video-call/video-call.module.css";

export function HmsConnectionStatus() {
  const connected = useHMSStore(selectIsConnectedToRoom);
  const tone = connected ? styles.statusOk : styles.statusWarn;

  return (
    <div className={`${styles.statusChip} ${tone}`} role="status">
      <span className={styles.statusDot} />
      {connected ? "Connected" : "Connecting…"}
    </div>
  );
}

export function HmsVideoControls({
  onLeave,
  onError,
}: {
  onLeave: () => void;
  onError?: (message: string) => void;
}) {
  const hmsActions = useHMSActions();
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } = useAVToggle();
  const { amIScreenSharing, toggleScreenShare } = useScreenShare();

  const leave = async () => {
    try {
      await hmsActions.leave();
    } catch {
      /* already left */
    }
    onLeave();
  };

  const onToggleAudio = async () => {
    if (!toggleAudio) return;
    try {
      toggleAudio();
    } catch {
      onError?.(
        "Microphone access was denied. Please allow microphone access in your browser settings and try again.",
      );
    }
  };

  const onToggleVideo = async () => {
    if (!toggleVideo) return;
    try {
      toggleVideo();
    } catch {
      onError?.(
        "Camera access was denied. Please allow camera access in your browser settings and try again.",
      );
    }
  };

  const onToggleScreen = async () => {
    if (!toggleScreenShare) return;
    try {
      await toggleScreenShare();
    } catch {
      onError?.("Screen sharing was cancelled or denied. You can try again when ready.");
    }
  };

  return (
    <div className={styles.controls} role="toolbar" aria-label="Call controls">
      <button
        type="button"
        className={`${styles.ctrlBtn} ${!isLocalAudioEnabled ? styles.ctrlOff : ""}`}
        onClick={onToggleAudio}
      >
        <span aria-hidden>{isLocalAudioEnabled ? "🎤" : "🔇"}</span>
        {isLocalAudioEnabled ? "Mute" : "Unmute"}
      </button>
      <button
        type="button"
        className={`${styles.ctrlBtn} ${!isLocalVideoEnabled ? styles.ctrlOff : ""}`}
        onClick={onToggleVideo}
      >
        <span aria-hidden>{isLocalVideoEnabled ? "📹" : "📷"}</span>
        {isLocalVideoEnabled ? "Camera" : "Cam Off"}
      </button>
      <button
        type="button"
        className={`${styles.ctrlBtn} ${amIScreenSharing ? styles.ctrlActive : ""}`}
        onClick={onToggleScreen}
      >
        <span aria-hidden>🖥️</span>
        {amIScreenSharing ? "Stop Share" : "Share"}
      </button>
      <button type="button" className={`${styles.ctrlBtn} ${styles.ctrlLeave}`} onClick={leave}>
        <span aria-hidden>📞</span>
        Leave
      </button>
    </div>
  );
}
