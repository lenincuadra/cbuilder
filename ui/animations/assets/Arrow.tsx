import type { SVGProps } from "react";

/** Arrow illustration, horizontal, pointing right. Source: assets/illustrations/arrow.svg */
export function Arrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M23 14.35L25.9 20.05L19 14.55C16.2 14.35 12.9 14.25 9.29999 14.55C11 18.45 14.7 24.25 21.2 26.05L21.9 29.65H48.3C47.4 26.75 43.9 16.75 34.7 15.05C32.7 14.85 27.3 14.25 23 14.35Z"
        fill="#EE8B2A"
        stroke="#472811"
        strokeWidth={1.6856}
        strokeMiterlimit={10}
        strokeLinejoin="round"
      />
      <path
        d="M23 41.75L25.9 36.15L18.9 41.45C16.3 41.65 12.9 41.75 9.29999 41.45C11.1 37.85 14.5 32.05 21.2 30.15L21.9 29.65H48.4L50 30.25C47.9 32.75 44.7 39.85 35.4 41.15C32.7 41.45 27.4 41.85 23 41.75Z"
        fill="#EE8B2A"
        stroke="#472811"
        strokeWidth={1.6856}
        strokeMiterlimit={10}
        strokeLinejoin="round"
      />
      <path
        d="M33.3 19.55C34.6 20.45 38.4 25.15 38.4 25.85"
        stroke="#472811"
        strokeWidth={1.6856}
        strokeMiterlimit={10}
        strokeLinecap="round"
      />
      <path
        d="M33.2 36.55C34.6 35.45 38.2 30.95 38.4 30.05"
        stroke="#472811"
        strokeWidth={1.6856}
        strokeMiterlimit={10}
        strokeLinecap="round"
      />
      <path
        d="M121.3 13.65L126.9 28.25L121.1 42.35L150.1 28.25L121.3 13.65Z"
        fill="#EE8B2A"
        stroke="#472811"
        strokeWidth={1.6856}
        strokeMiterlimit={10}
        strokeLinejoin="round"
      />
      <path d="M124.2 15.45L147.8 28.25L125.9 19.25L127 25.65" fill="#F49D4C" />
      <path d="M122.9 40.65L127.8 28.25L125.9 19.25L147.8 28.35L122.9 40.65Z" fill="#FB660A" />
      <path
        d="M125.8 26.15H19.1C18.3 26.35 17.3 28.25 18.6 29.75L19.4 30.25H125.9L126.7 28.35L125.8 26.15Z"
        fill="#8E6442"
        stroke="#472811"
        strokeWidth={1.7762}
        strokeMiterlimit={10}
        strokeLinejoin="round"
      />
    </svg>
  );
}
