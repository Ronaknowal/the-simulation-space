"use client";

import dynamic from "next/dynamic";

const WorkspaceShell = dynamic(
  () => import("@/components/workspace/WorkspaceShell"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-bg">
        <p className="text-text-disabled text-xs tracking-widest animate-pulse">
          INITIALIZING THE SIMULATION SPACE...
        </p>
      </div>
    ),
  }
);

export default function Home() {
  return <WorkspaceShell />;
}
