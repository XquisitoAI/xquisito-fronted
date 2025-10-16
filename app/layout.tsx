import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { TableProvider } from "./context/TableContext";
import { GuestProvider } from "./context/GuestContext";
import { PaymentProvider } from "./context/PaymentContext";
import { UserDataProvider } from "./context/UserDataContext";
import { RestaurantProvider } from "./context/RestaurantContext";
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import ClerkSessionProvider from "./components/ClerkSessionProvider";

const helveticaNeue = localFont({
  src: [
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueUltraLight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueUltraLightItalic.otf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueLightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueRoman.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueItalic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueMediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueHeavy.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueHeavyItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueBlack.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/helvetica-neue/HelveticaNeueBlackItalic.otf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-helvetica-neue",
});

export const metadata: Metadata = {
  title: "Xquisito",
  description: "Tu menú digital con un toque de NFC",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport:
    "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover",
  icons: {
    icon: [
      {
        url: "/logo-short-green.webp",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/iso-1-white.webp",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={esMX}
      signUpFallbackRedirectUrl=""
      signInFallbackRedirectUrl=""
    >
      <html lang="es">
        <head></head>
        <body
          className={`${helveticaNeue.variable} antialiased`}
          style={{ fontFamily: "var(--font-helvetica-neue)" }}
        >
          <ClerkSessionProvider>
            <RestaurantProvider>
              <CartProvider>
                <TableProvider>
                  <GuestProvider>
                    <PaymentProvider>
                      <UserDataProvider>{children}</UserDataProvider>
                    </PaymentProvider>
                  </GuestProvider>
                </TableProvider>
              </CartProvider>
            </RestaurantProvider>
          </ClerkSessionProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
