import { useId, type SVGProps } from "react";

/** Archery target on a stand, front view. Source: assets/illustrations/diana.svg */
export function Diana(props: SVGProps<SVGSVGElement>) {
  const uid = useId();
  const p = (n: number) => `${uid}-paint${n}`;

  return (
    <svg viewBox="0 0 151 150" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M80.8355 107.35H70.4669V134.35H80.8355V107.35Z"
        fill="#966844"
        stroke="#512B12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M45.5015 97.65L30.9049 142.05H42.6829L55.3669 104.05C52.0449 103.25 45.6022 97.65 45.5015 97.65Z"
        fill="#966844"
        stroke="#512B12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M105.7 97.25C104.492 98.25 100.566 100.55 95.8349 102.25L108.116 142.05H120.096L105.7 97.25Z"
        fill="#966844"
        stroke="#512B12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M49.9309 121.15L47.1122 129.55H103.888L101.17 121.15H49.9309Z"
        fill="#966844"
        stroke="#512B12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity={0.1}
        d="M44.0922 103.65C46.6089 105.25 50.4342 107.35 53.2529 108.35L55.0649 103.05L46.1055 98.05L44.0922 103.65Z"
        fill={`url(#${p(0)})`}
      />
      <path d="M95.9355 103.45L97.3449 108.65C100.667 107.55 105.298 104.95 106.808 103.75L105.298 97.25L95.9355 103.45Z" fill={`url(#${p(1)})`} />
      <path d="M70.4669 107.35V112.85C72.6815 113.15 79.2249 113.35 80.8355 113.05V107.35H70.4669Z" fill={`url(#${p(2)})`} />
      <path d="M53.0515 121.35L50.4342 129.35H48.1189L50.1322 121.75L53.0515 121.35Z" fill={`url(#${p(3)})`} />
      <path d="M98.1502 121.45L100.667 129.15H102.68L100.566 121.25" fill={`url(#${p(4)})`} />
      <path
        d="M75.8022 7.95C48.1189 7.95 23.8582 30.45 23.8582 57.55C23.7575 80.35 42.6829 107.25 75.8022 107.45C103.083 107.65 127.042 87.25 127.142 57.55C127.142 34.45 107.412 7.95 75.8022 7.95Z"
        fill="white"
        stroke="#512A12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75.8022 16.15C54.3602 16.15 33.2202 32.85 33.2202 57.05C33.2202 76.85 48.5215 97.55 75.8022 97.55C97.6469 97.65 117.579 81.65 117.68 57.05C117.78 36.65 100.768 16.15 75.8022 16.15Z"
        fill="#333335"
        stroke="#010101"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75.7015 24.45C59.2929 24.45 42.5822 37.05 42.5822 56.25C42.5822 70.95 54.0582 88.25 75.7015 88.25C91.9089 88.35 108.318 76.45 108.318 56.25C108.318 41.05 95.3315 24.45 75.7015 24.45Z"
        fill="#30ABE2"
        stroke="#010101"
        strokeWidth={1.8432}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75.8022 33.55C64.4269 33.55 52.3469 42.35 52.3469 56.05C52.3469 65.95 59.9975 78.85 75.8022 78.85C86.9762 78.95 98.6535 70.85 98.6535 56.05C98.6535 45.85 90.6002 33.55 75.8022 33.55Z"
        fill="#DF3C38"
        stroke="#512A12"
        strokeWidth={1.7778}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75.7015 42.45C69.1582 42.45 62.3129 47.65 62.3129 55.95C62.3129 61.95 66.7422 69.45 75.7015 69.45C82.3455 69.55 88.6875 64.65 88.6875 55.95C88.6875 49.75 83.9562 42.45 75.7015 42.45Z"
        fill="#DAA737"
        stroke="#512A12"
        strokeWidth={1.8794}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={p(0)} x1={48.5819} y1={104.65} x2={53.1937} y2={127.162} gradientUnits="userSpaceOnUse">
          <stop stopColor="#512B12" />
          <stop offset={1} stopColor="#512B12" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p(1)} x1={100.768} y1={103.15} x2={102.456} y2={129.651} gradientUnits="userSpaceOnUse">
          <stop stopColor="#512B12" />
          <stop offset={1} stopColor="#512B12" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p(2)} x1={75.6009} y1={108.55} x2={75.879} y2={113.25} gradientUnits="userSpaceOnUse">
          <stop stopColor="#512B12" />
          <stop offset={1} stopColor="#512B12" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p(3)} x1={49.0953} y1={125.55} x2={52.8603} y2={125.55} gradientUnits="userSpaceOnUse">
          <stop stopColor="#512B12" />
          <stop offset={1} stopColor="#512B12" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p(4)} x1={98.1904} y1={124.65} x2={102.68} y2={124.65} gradientUnits="userSpaceOnUse">
          <stop stopColor="#512B12" />
          <stop offset={1} stopColor="#512B12" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}
