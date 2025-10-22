// components/PaymentAnimation.tsx
"use client";

import { useEffect, useState } from "react";

interface PaymentAnimationProps {
  isActive: boolean;
  onAnimationComplete?: () => void;
}

export default function PaymentAnimation({
  isActive,
  onAnimationComplete,
}: PaymentAnimationProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setFadeOut(false);
      return;
    }

    // Start fade out immediately after checkmark animation completes (~1.3s)
    const fadeOutTimer = setTimeout(() => {
      console.log("🎬 PaymentAnimation: Starting fade out");
      setFadeOut(true);
    }, 1300);

    // Complete animation and call callback after fade out (~1.8s total)
    const completeTimer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      } else {
        console.warn("⚠️ PaymentAnimation: No callback provided");
      }
    }, 1800);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onAnimationComplete]);

  if (!isActive) return null;

  return (
    <>
      <div
        className={`fixed inset-0 overflow-hidden z-50 transition-opacity duration-700 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a8b9b] to-[#153f43]"></div>

        {/* Animated Checkmark SVG */}
        <div className="absolute inset-0 flex items-center justify-center m-0 p-0">
          <div className="relative m-0 p-0">
            {/* SVG Checkmark */}
            <div className="animated_checkmark m-0 p-0">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 130.2 130.2"
                className="m-0 p-0"
                style={{ width: "160px", height: "160px", display: "block" }}
              >
                <circle
                  className="path circle"
                  fill="none"
                  stroke="#eab3f4"
                  strokeWidth="6"
                  strokeMiterlimit="10"
                  cx="65.1"
                  cy="65.1"
                  r="62.1"
                />
                <polyline
                  className="path check"
                  fill="none"
                  stroke="#eab3f4"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeMiterlimit="10"
                  points="100.2,40.2 51.5,88.8 29.8,67.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Success text */}
        <div
          className="absolute bottom-24 left-0 right-0 text-center"
          style={{
            animation: "fadeInText 0.4s ease-out 0.9s both",
          }}
        >
          <h1 className="text-4xl font-medium text-white">¡Pago exitoso!</h1>
        </div>
      </div>
    </>
  );
}
