'use client';

import { useEffect, useState } from 'react';

export function HomepageDemoVideo() {
  const [replayToken, setReplayToken] = useState(0);

  useEffect(() => {
    function handleReplayRequest() {
      setReplayToken((current) => current + 1);
    }

    window.addEventListener('vs:homepage-demo-replay', handleReplayRequest);
    return () => window.removeEventListener('vs:homepage-demo-replay', handleReplayRequest);
  }, []);

  return (
    <img
      className="h-full w-full object-cover object-[52.5%_44%]"
      src={`/vein-spiral-demo.gif?replay=${replayToken}`}
      alt="베인스파이럴 서비스 데모 화면"
      loading="eager"
      decoding="async"
    />
  );
}
