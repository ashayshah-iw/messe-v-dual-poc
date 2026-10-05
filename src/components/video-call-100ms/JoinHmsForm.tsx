"use client";

import { useState, type FormEvent } from "react";
import styles from "@/components/video-call/video-call.module.css";

export interface JoinHmsFormProps {
  onJoin: (identity: string, room: string, role: string) => void;
  busy?: boolean;
  error?: string | null;
  defaultRole?: string;
}

export function JoinHmsForm({ onJoin, busy, error, defaultRole = "host" }: JoinHmsFormProps) {
  const [identity, setIdentity] = useState("");
  const [room, setRoom] = useState("demo-room");
  const [role, setRole] = useState(defaultRole);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = identity.trim();
    const roomName = room.trim();
    const joinRole = role.trim();
    if (!name || !roomName || !joinRole) return;
    onJoin(name, roomName, joinRole);
  };

  return (
    <form className={styles.joinCard} onSubmit={submit}>
      <p className="eyebrow">100ms · frontend POC</p>
      <h1>Video Calling POC</h1>
      <p className={styles.joinLead}>
        Same flow as LiveKit: two browsers, same room name, verify live audio and video.
        Role must exist in your 100ms template (e.g. host).
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

      <label className={styles.field}>
        <span>Role (100ms template)</span>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="host"
          maxLength={32}
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
