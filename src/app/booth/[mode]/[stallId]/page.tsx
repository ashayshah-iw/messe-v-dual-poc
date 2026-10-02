import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { BoothScreen } from "@/components/booth/BoothScreen";
import { getStallById } from "@/data/stalls";
import type { PocMode } from "@/types/expo";

interface BoothPageProps {
  params: Promise<{ mode: string; stallId: string }>;
}

export default async function BoothPage({ params }: BoothPageProps) {
  const { mode: raw, stallId } = await params;
  if (raw !== "flat" && raw !== "threejs") notFound();
  if (!getStallById(stallId)) notFound();
  const mode = raw as PocMode;

  return (
    <>
      <Topbar routeLabel={`Booth · ${stallId}`} />
      <main className="stage">
        <BoothScreen mode={mode} stallId={stallId} />
      </main>
    </>
  );
}
