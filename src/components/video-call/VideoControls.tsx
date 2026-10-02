"use client";

import { ConnectionState } from "livekit-client";
import { useConnectionState, useLocalParticipant } from "@livekit/components-react";
import styles from "./video-call.module.css";

const LABELS: Partial<Record<ConnectionState, string>> = {
  [ConnectionState.Connected]: "Connected",
  [ConnectionState.Connecting]: "Connecting…",
  [ConnectionState.Disconnected]: "Disconnected",
  [ConnectionState.Reconnecting]: "Reconnecting…",
  [ConnectionState.SignalReconnecting]: "Reconnecting…",
};

export function ConnectionStatus() {
  const state = useConnectionState();
  const tone =
    state === ConnectionState.Connected
      ? styles.statusOk
      : state === ConnectionState.Disconnected
        ? styles.statusBad
        : styles.statusWarn;

  return (
    <div className={`${styles.statusChip} ${tone}`} role="status">
      <span className={styles.statusDot} />
      {LABELS[state] ?? String(state)}
    </div>
  );
}

export function VideoControls({
  onLeave,
  onError,
}: {
  onLeave: () => void;
  onError?: (message: string) => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      onError?.(
        "Microphone access was denied. Please allow microphone access in your browser settings and try again.",
      );
    }
  };

  const toggleCam = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch {
      onError?.(
        "Camera access was denied. Please allow camera access in your browser settings and try again.",
      );
    }
  };

  const toggleScreen = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch {
      onError?.(
        "Screen sharing was cancelled or denied. You can try again when ready.",
      );
    }
  };

  return (
    <div className={styles.controls} role="toolbar" aria-label="Call controls">
      <button
        type="button"
        className={`${styles.ctrlBtn} ${!isMicrophoneEnabled ? styles.ctrlOff : ""}`}
        onClick={toggleMic}
        title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        <span aria-hidden>{isMicrophoneEnabled ? "🎤" : "🔇"}</span>
        {isMicrophoneEnabled ? "Mute" : "Unmute"}
      </button>
      <button
        type="button"
        className={`${styles.ctrlBtn} ${!isCameraEnabled ? styles.ctrlOff : ""}`}
        onClick={toggleCam}
        title={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
      >
        <span aria-hidden>{isCameraEnabled ? "📹" : "📷"}</span>
        {isCameraEnabled ? "Camera" : "Cam Off"}
      </button>
      <button
        type="button"
        className={`${styles.ctrlBtn} ${isScreenShareEnabled ? styles.ctrlActive : ""}`}
        onClick={toggleScreen}
        title={isScreenShareEnabled ? "Stop sharing" : "Share screen"}
      >
        <span aria-hidden>🖥️</span>
        {isScreenShareEnabled ? "Stop Share" : "Share"}
      </button>
      <button type="button" className={`${styles.ctrlBtn} ${styles.ctrlLeave}`} onClick={onLeave}>
        <span aria-hidden>📞</span>
        Leave
      </button>
    </div>
  );
}
