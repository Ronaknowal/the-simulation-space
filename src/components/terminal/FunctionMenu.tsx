"use client";

interface FunctionItem {
  key: string;
  label: string;
  fn: string;
  description: string;
}

const FUNCTIONS: FunctionItem[] = [
  { key: "GP", label: "F1", fn: "GP", description: "Graph Price" },
  { key: "DES", label: "F2", fn: "DES", description: "Description" },
  { key: "FA", label: "F3", fn: "FA", description: "Financials" },
  { key: "SPLC", label: "F4", fn: "SPLC", description: "Supply Chain" },
  { key: "OWN", label: "F5", fn: "OWN", description: "Ownership" },
  { key: "NEWS", label: "F6", fn: "NEWS", description: "News Feed" },
  { key: "COMP", label: "F7", fn: "COMP", description: "Comparables" },
];

interface Props {
  active: string;
  onSelect: (fn: string) => void;
}

export default function FunctionMenu({ active, onSelect }: Props) {
  return (
    <div className="flex flex-col border-r border-[#1c1c1c] bg-[#020202] w-[52px] shrink-0">
      <div className="flex flex-col items-center py-1 gap-0">
        {FUNCTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => onSelect(f.key)}
            title={f.description}
            className={`group relative flex flex-col items-center justify-center w-full py-3 gap-0.5 border-b border-[#111] transition-colors ${
              active === f.key
                ? "bg-[#d4952b] text-black"
                : "hover:bg-[#111] text-[#555] hover:text-[#d4952b]"
            }`}
          >
            <span className="font-mono text-[8px] font-bold tracking-wider" style={{ color: active === f.key ? '#000' : '#444' }}>
              {f.label}
            </span>
            <span className={`font-mono text-[9px] font-bold tracking-wider ${active === f.key ? 'text-black' : 'text-[#888]'}`}>
              {f.fn}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute left-full ml-1 z-50 hidden group-hover:flex items-center gap-0 pointer-events-none">
              <div className="border-y-4 border-y-transparent border-r-4 border-r-[#d4952b]" />
              <div className="bg-[#d4952b] text-black font-mono text-[9px] font-bold px-2 py-1 whitespace-nowrap">
                {f.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
