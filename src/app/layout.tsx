import type { Metadata } from "next";
import { Maven_Pro } from "next/font/google";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import "./globals.css";

const mavenPro = Maven_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-maven-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Duston Project Tracker",
  description: "Enterprise project, action item, and cross-subsidiary tracking for Duston Group",
  icons: {
    icon: "/logo-duston-group.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mavenPro.variable} suppressHydrationWarning>
      <body className="bg-duston-bg text-duston-text font-sans antialiased min-h-screen" suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
