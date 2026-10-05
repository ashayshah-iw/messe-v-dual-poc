import { Topbar } from "@/components/layout/Topbar";
import { HmsVideoCallScreen } from "@/components/video-call-100ms/HmsVideoCallScreen";

export default function VideoCall100msPage() {
  return (
    <>
      <Topbar routeLabel="Video Call · 100ms POC" />
      <main className="stage">
        <HmsVideoCallScreen />
      </main>
    </>
  );
}
