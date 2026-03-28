"use client";

export function CommandBar() {
  return (
    <input
      type="text"
      placeholder="Search ticker, simulate event, toggle layers..."
      className="flex-1 max-w-[480px] bg-card border border-border text-text-secondary text-[9px] px-2 py-1 outline-none placeholder:text-text-disabled focus:border-accent/30 transition-colors"
    />
  );
}

export default CommandBar;
