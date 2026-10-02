"use client";

import Link from "next/link";

interface TopbarProps {
  routeLabel: string;
}

export function Topbar({ routeLabel }: TopbarProps) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="mark" />
        <b>MESSE·V</b>
      </Link>
      <span className="eyebrow">{routeLabel}</span>
      <Link href="/hall/threejs" className="nav-3js">
        3JS path
      </Link>
    </header>
  );
}
