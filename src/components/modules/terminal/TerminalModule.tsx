"use client";

import TerminalLayout from "@/components/terminal/TerminalLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function TerminalModule() {
  return (
    <ErrorBoundary name="Terminal">
      <div className="h-full overflow-auto" style={{ background: "#000" }}>
        <TerminalLayout />
      </div>
    </ErrorBoundary>
  );
}
