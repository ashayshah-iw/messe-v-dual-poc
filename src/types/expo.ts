export type PocMode = "flat" | "threejs";

export interface Stall {
  id: string;
  code: string;
  company: string;
  color: string;
  live: number;
  x: number;
  y: number;
  w: number;
  h: number;
  about: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Avatar {
  id: string;
  label: string;
  name: string;
  color: string;
  me?: boolean;
  x: number;
  y: number;
  stallId: string | null;
  path: Point[];
  idle: number;
  walkSpeed?: number;
}

export interface FeedEvent {
  label: string;
  name: string;
  color: string;
  me?: boolean;
  action: string;
  when: string;
}

export interface HallView {
  scale: number;
  x: number;
  y: number;
}

export interface BoothHotspot {
  id: string;
  label: string;
  desc: string;
  color: string;
}

export interface PresenceUser {
  id: string;
  label: string;
  name: string;
  color: string;
  x: number;
  y: number;
  direction: string;
  stallId: string | null;
  me?: boolean;
}
