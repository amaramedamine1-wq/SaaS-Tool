"use client";

export default function AnimatedLiquidBackground() {
  return (
    <>
      <div className="liquid-wrap pointer-events-none absolute inset-0 overflow-hidden">
        <div className="liquid-orb liquid-orb-a" />
        <div className="liquid-orb liquid-orb-b" />
        <div className="liquid-orb liquid-orb-c" />
        <div className="liquid-orb liquid-orb-d" />
      </div>

      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <filter id="liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 24 -10
            "
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      <style jsx>{`
        .liquid-wrap {
          filter: url(#liquid-goo);
        }
        .liquid-orb {
          position: absolute;
          border-radius: 9999px;
          mix-blend-mode: multiply;
          opacity: 0.72;
          will-change: transform;
          filter: blur(10px);
        }
        .liquid-orb-a {
          width: 34rem;
          height: 34rem;
          left: -8rem;
          top: -10rem;
          background: radial-gradient(circle at 30% 30%, #f59e0b, #fb7185);
          animation: liquidA 14s ease-in-out infinite;
        }
        .liquid-orb-b {
          width: 30rem;
          height: 30rem;
          right: -8rem;
          top: -5rem;
          background: radial-gradient(circle at 70% 30%, #38bdf8, #60a5fa);
          animation: liquidB 16s ease-in-out infinite;
        }
        .liquid-orb-c {
          width: 38rem;
          height: 38rem;
          left: 20%;
          bottom: -14rem;
          background: radial-gradient(circle at 50% 50%, #22d3ee, #06b6d4);
          animation: liquidC 18s ease-in-out infinite;
        }
        .liquid-orb-d {
          width: 24rem;
          height: 24rem;
          left: 45%;
          top: 35%;
          background: radial-gradient(circle at 40% 60%, #facc15, #f97316);
          animation: liquidD 13s ease-in-out infinite;
        }
        @keyframes liquidA {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(4rem, 2rem, 0) scale(1.1);
          }
        }
        @keyframes liquidB {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-5rem, 3rem, 0) scale(1.12);
          }
        }
        @keyframes liquidC {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-2rem, -4rem, 0) scale(1.08);
          }
        }
        @keyframes liquidD {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(3rem, -2rem, 0) scale(1.15);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-orb-a,
          .liquid-orb-b,
          .liquid-orb-c,
          .liquid-orb-d {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
