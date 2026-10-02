import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { HallScreen } from "@/components/hall/HallScreen";
import { ZonedHallScreen } from "@/components/hall/ZonedHallScreen";
import type { PocMode } from "@/types/expo";

interface HallPageProps {
  params: Promise<{ mode: string }>;
}

export default async function HallPage({ params }: HallPageProps) {
  const { mode: raw } = await params;
  if (raw !== "flat" && raw !== "threejs" && raw !== "zoned") notFound();

  if (raw === "zoned") {
    return (
      <>
        <Topbar routeLabel="Zoned hall" />
        <main className="stage">
          <ZonedHallScreen />
        </main>
      </>
    );
  }

  const mode = raw as PocMode;

  return (
    <>
      <Topbar routeLabel={mode === "threejs" ? "3JS hall" : "Hall"} />
      <main className="stage">
        <HallScreen mode={mode} />
      </main>
    </>
  );
}
