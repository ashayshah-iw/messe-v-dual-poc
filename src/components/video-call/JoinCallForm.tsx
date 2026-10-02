"use client";

import { useState, type FormEvent } from "react";
import styles from "./video-call.module.css";

export interface JoinCallFormProps {
  onJoin: (identity: string, room: string) => void;
  busy?: boolean;
  error?: string | null;
}

export function JoinCallForm({ onJoin, busy, error }: JoinCallFormProps) {
  const [identity, setIdentity] = useState("");
  const [room, setRoom] = useState("demo-room");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = identity.trim();
    const roomName = room.trim();
    if (!name || !roomName) return;
    onJoin(name, roomName);
  };

  return (
    <form className={styles.joinCard} onSubmit={submit}>
      <p className="eyebrow">LiveKit · frontend POC</p>
      <h1>Video Calling POC</h1>
      <p className={styles.joinLead}>
        Join the same room from two browsers to verify live audio and video.
      </p>

      <label className={styles.field}>
        <span>Participant Name</span>
        <input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="e.g. Alice"
          maxLength={64}
          autoComplete="nickname"
          required
          disabled={busy}
        />
      </label>

      <label className={styles.field}>
        <span>Room Name</span>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="demo-room"
          maxLength={64}
          required
          disabled={busy}
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className="btn" disabled={busy || !identity.trim() || !room.trim()}>
        {busy ? "Connecting…" : "Join Call"}
      </button>
    </form>
  );
}
