import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

/** The supplied mark, cropped and exported as optimized WebP. */
export default function BrandLogo({
  className = "h-9 w-9",
  priority = false,
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[#F6F3FB] p-1.5 ${className}`}
    >
      <Image
        src="/untold-diaries-logo.webp"
        alt=""
        aria-hidden="true"
        width={614}
        height={568}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
