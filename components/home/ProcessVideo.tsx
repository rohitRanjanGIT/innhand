"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * The "Made by Hand" video. Shows the cover image with a play button; the video itself is only
 * requested after the click, so it costs nothing on first load. Fills its (relative) parent.
 */
export default function ProcessVideo({ video, poster }: { video: string; poster: string | null }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <video
        src={video}
        controls
        autoPlay
        playsInline
        preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#000" }}
      />
    );
  }

  return (
    <>
      {poster && (
        <Image src={poster} alt="" fill sizes="(max-width: 900px) 100vw, 780px" style={{ objectFit: "cover" }} />
      )}
      <button
        type="button"
        aria-label="Play the making-of video"
        className="ih-btn"
        onClick={() => setPlaying(true)}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 96,
          height: 96,
          borderRadius: 48,
          border: "1px solid rgba(42,34,56,.5)",
          background: "rgba(247,242,236,.85)",
          color: "#2A2238",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </button>
    </>
  );
}
