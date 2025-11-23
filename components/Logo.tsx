"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 48, className = "" }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} style={{ width: size, height: size }} />;
  }

  const isDark = (resolvedTheme || theme) === "dark";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Robot body - hexagon shape */}
      <path
        d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
        fill={isDark ? "#5a9cf8" : "#4285f4"}
        opacity="0.9"
      />

      {/* Grid lines representing pathfinding */}
      <path
        d="M12 2V22M2 7L22 17M22 7L2 17"
        stroke={isDark ? "#e8eaed" : "white"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Center dot - robot position */}
      <circle cx="12" cy="12" r="2" fill={isDark ? "#fbbc04" : "#fbbc04"} />
    </svg>
  );
}
