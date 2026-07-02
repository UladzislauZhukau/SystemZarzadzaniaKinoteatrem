import { useEffect, useState } from "react";
import "../styles/CurtainIntro.css";

// Plays once per browser session: red velvet curtains part to reveal the site.
const SESSION_KEY = "curtainPlayed";
const DURATION_MS = 3800; // keep in sync with the CSS animation timeline

export default function CurtainIntro() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return "hidden";
    const alreadyPlayed = sessionStorage.getItem(SESSION_KEY);
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    return alreadyPlayed || prefersReduced ? "hidden" : "playing";
  });

  useEffect(() => {
    if (state !== "playing") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    const timer = setTimeout(() => setState("hidden"), DURATION_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "hidden") return null;

  return (
    <div className="curtain-intro" aria-hidden="true">
      <div className="curtain-panel curtain-left" />
      <div className="curtain-panel curtain-right" />
    </div>
  );
}
