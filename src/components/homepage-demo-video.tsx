'use client';

import { useEffect, useRef } from 'react';

function restartVideo(video: HTMLVideoElement | null) {
  if (!video) return;

  video.currentTime = 0;
  void video.play().catch(() => undefined);
}

export function HomepageDemoVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    function handleReplayRequest() {
      restartVideo(videoRef.current);
    }

    window.addEventListener('vs:homepage-demo-replay', handleReplayRequest);
    return () => window.removeEventListener('vs:homepage-demo-replay', handleReplayRequest);
  }, []);

  return (
    <video
      ref={videoRef}
      className="h-full w-full scale-[1.04] object-cover object-[center_16%]"
      src="/vein-spiral-demo.mp4"
      autoPlay
      muted
      playsInline
      preload="metadata"
    />
  );
}