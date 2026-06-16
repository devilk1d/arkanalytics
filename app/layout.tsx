import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Prevent dark-mode flash: apply stored theme before first paint.
          suppressHydrationWarning on <html> tells React that data-theme may
          differ between server and client — this mismatch is intentional. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.background=t==='dark'?'#0C0C0C':'#FFFFFF';}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.background='#FFFFFF';}})();`,
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
