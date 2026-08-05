"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type AdSenseCommand = Record<string, unknown>;

declare global {
  interface Window {
    adsbygoogle?: AdSenseCommand[];
  }
}

type AdBannerProps = {
  dataAdSlot: string;
  dataAdFormat: string;
  dataFullWidthResponsive: boolean;
  className?: string;
};

function AdBanner({
  dataAdSlot,
  dataAdFormat,
  dataFullWidthResponsive,
  className,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);

  return (
    <ins
      ref={adRef}
      className={cn("adsbygoogle block overflow-hidden", className)}
      style={{ display: "block" }}
      data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID}
      data-ad-slot={dataAdSlot}
      data-ad-format={dataAdFormat}
      data-full-width-responsive={dataFullWidthResponsive.toString()}
    />
  );
}

export default AdBanner;
