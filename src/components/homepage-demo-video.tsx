import Image from 'next/image';
import { BRAND } from '@/lib/brand';

export function HomepageDemoVideo() {
  return (
    <Image
      className="object-cover object-[52.5%_44%]"
      src="/vein-spiral-demo.gif"
      alt={BRAND.demoAlt}
      fill
      priority
      unoptimized
      sizes="100vw"
    />
  );
}
