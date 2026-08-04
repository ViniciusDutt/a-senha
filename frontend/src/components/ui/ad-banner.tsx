"use client"

import { cn } from "@/lib/utils"
import { useEffect } from "react"

type AdBannerProps = {
  dataAdSlot: string,
  dataAdFormat: string,
  dataFullWidthResponsive: boolean,
  className?: string
}

function AdBanner({ dataAdSlot, dataAdFormat, dataFullWidthResponsive, className }: AdBannerProps) {

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch (error: any) {
      console.log(error.message)
    }
  }, [])

  return (
    <ins
      className={cn("adsbygoogle block p-1 overflow-clip bg-gray-100", className)}
      data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID}
      data-ad-slot={dataAdSlot}
      data-ad-format={dataAdFormat}
      data-full-width-responsive={dataFullWidthResponsive.toString()}
    ></ins>
  )
}

export default AdBanner