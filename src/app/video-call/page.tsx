import { Topbar } from "@/components/layout/Topbar";
import { VideoCallScreen } from "@/components/video-call/VideoCallScreen";

export default function VideoCallPage() {
  return (
    <>
      <Topbar routeLabel="Video Call POC" />
      <main className="stage">
        <VideoCallScreen />
      </main>
    </>
  );
}
