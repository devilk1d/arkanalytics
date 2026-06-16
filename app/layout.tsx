import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import { AppToastRegion } from "./components/ui/AppToast";
import { SessionTimeout } from "./components/auth/SessionTimeout";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arkanalytics",
  description: "Predict customer churn and uncover retention insights with AI-powered analytics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render the theme on the server from a cookie so data-theme is part of React's
  // tree. This keeps it under React's control (it survives hydration) and lets the
  // very first server-painted frame use the correct --bg, eliminating the white
  // flash that appeared in production when data-theme was only set imperatively.
  const cookieStore = await cookies();
  const theme = cookieStore.get('arka_theme')?.value === 'dark' ? 'dark' : 'light';

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Correct the server-rendered theme from localStorage before first paint,
          covering the case where the cookie is stale or missing (e.g. an existing
          user's first load after this change ships). */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t&&t!==document.documentElement.getAttribute('data-theme')){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionTimeout />
        {children}
        <AppToastRegion />
      </body>
    </html>
  );
}
