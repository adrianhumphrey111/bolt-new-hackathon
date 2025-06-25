import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import "non.geist";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Remotion Captions",
  description: "Video Editor application using React and TypeScript",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}