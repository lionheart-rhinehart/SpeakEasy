import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import StatusIndicator from "./StatusIndicator";

interface StatusPayload {
  recordingState: string;
  recordingStartTime: number | null;
}

interface OverlayStatePayload {
  state: string;
  recordingDurationMs?: number | null;
}

export default function StatusBarWindow() {
  // receive updates from main window (StatusIndicator reads from store directly)
  useEffect(() => {
    const unlistenPromise = listen<StatusPayload>("status_update", (_event) => {
      // StatusIndicator component reads from store, no local state needed
    });
    return () => {
      unlistenPromise.then((u) => u());
    };
  }, []);

  // hide when overlay active
  useEffect(() => {
    const overlayListener = listen<OverlayStatePayload>("overlay-state-change", (event) => {
      const state = event.payload?.state;
      if (state === "recording" || state === "processing") {
        // Hide while overlay showing
        invoke("set_status_bar_visibility", { show: false });
      } else {
        invoke("set_status_bar_visibility", { show: true });
      }
    });
    return () => {
      overlayListener.then((u) => u());
    };
  }, []);

  // enable click-through (windows/linux)
  useEffect(() => {
    invoke("enable_status_bar_click_through").catch(() => {/*ignore*/});
  }, []);

  return (
    <div className="pointer-events-none select-none p-2 rounded-xl shadow-lg bg-white/80 backdrop-blur">
      <StatusIndicator /* we pass state via store, so component reads directly */ />
    </div>
  );
}

