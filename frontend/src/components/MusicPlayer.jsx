import { useEffect, useRef, useState } from "react";
import "../styles/MusicPlayer.css";

// Background music track (served from frontend/public/music/). Swap the file to
// change the song; see frontend/public/music/README.md.
const MUSIC_SRC = "/music/moonlight-haze.mp3";
const STORAGE_KEY = "musicEnabled";
const VOLUME = 0.01;

function SpeakerOnIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

export default function MusicPlayer() {
  const audioRef = useRef(null);
  // Default on; the user's last choice is remembered across visits.
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "false"
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = VOLUME;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled) {
      audio.pause();
      return;
    }

    // Browsers block audio autoplay until the user interacts with the page, so
    // try to play now and, if that's rejected, retry on the first gesture.
    const play = () => audio.play().catch(() => {});
    play();
    document.addEventListener("pointerdown", play, { once: true });
    document.addEventListener("keydown", play, { once: true });
    return () => {
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("keydown", play);
    };
  }, [enabled]);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
      <button
        type="button"
        className={`music-toggle${enabled ? " on" : ""}`}
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn music off" : "Turn music on"}
        title={enabled ? "Turn music off" : "Turn music on"}
      >
        {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
      </button>
    </>
  );
}
