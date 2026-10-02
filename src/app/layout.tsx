import type { Metadata } from "next";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { Curtain } from "@/components/ui/Curtain";
import "./globals.css";

export const metadata: Metadata = {
  title: "MESSE·V — Dual POC (Next.js)",
  description: "Virtual trade show dual POC — flat hall + Three.js booth",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app">
            {children}
            <Curtain />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
