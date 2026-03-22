import Image from 'next/image';

export function HomepageDemoVideo() {
  return (
    <Image
      className="object-cover object-[52.5%_44%]"
      src="/vein-spiral-demo.gif"
      alt="베인스파이럴 서비스 데모 화면"
      fill
      priority
      unoptimized
      sizes="100vw"
    />
  );
}
