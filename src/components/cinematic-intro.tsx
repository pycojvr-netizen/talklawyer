"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const INTRO_KEY = "talklawyer-intro-v1";

export function CinematicIntro() {
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem(INTRO_KEY)) setVisible(false);
  }, []);

  function dismiss() {
    if (leaving) return;
    sessionStorage.setItem(INTRO_KEY, "seen");
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 750);
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    if (video.current) video.current.muted = next;
  }

  if (!visible) return null;
  return (
    <div className={`cinematic-intro ${leaving ? "cinematic-intro-leaving" : ""}`} role="dialog" aria-label="Abertura Talklawyer">
      <video ref={video} autoPlay muted={muted} playsInline preload="auto" onEnded={dismiss} onError={dismiss}>
        <source src="/media/talklawyer-transition.mp4" type="video/mp4" />
      </video>
      <div className="cinematic-shade" />
      <div className="cinematic-brand"><span>Talk</span>lawyer</div>
      <div className="cinematic-actions">
        <button type="button" className="cinematic-sound" onClick={toggleSound} aria-label={muted ? "Ativar som" : "Desativar som"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button type="button" className="cinematic-skip" onClick={dismiss}>Pular abertura</button>
      </div>
      <div className="cinematic-progress" />
    </div>
  );
}
