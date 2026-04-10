import { BRAND } from '@/lib/brand';

export function HomepageDemoVideo() {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover object-[52.5%_44%]"
      autoPlay
      loop
      muted
      playsInline
      aria-label={BRAND.demoAlt}
    >
      <source src="/vein-spiral-demo.webm" type="video/webm" />
      <source src="/vein-spiral-demo.mp4" type="video/mp4" />
    </video>
  );
}
