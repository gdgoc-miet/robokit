"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 48, className = "" }: LogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} style={{ width: size, height: size }} />;
  }

  return (
    <Image
      src="/robokit.png"
      alt="RoboKit Logo"
      className={className}
      width={size}
      height={size}
      unoptimized
    />
  );
}
