import { Topbar } from "@/components/layout/Topbar";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";

export default function HomePage() {
  return (
    <>
      <Topbar routeLabel="Lobby" />
      <main className="stage">
        <LobbyScreen />
      </main>
    </>
  );
}
