import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Simulation Space",
  description: "Real-time global intelligence and simulation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
