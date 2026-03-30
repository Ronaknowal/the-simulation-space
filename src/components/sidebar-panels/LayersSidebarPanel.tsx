"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { LAYER_REGISTRY } from "@/layers/registry";
import { LAYER_CATEGORIES } from "@/types/layers";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";

export default function LayersSidebarPanel() {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["markets", "news", "social"]));

  const toggleCategory = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Group layers by category
  const grouped = new Map<string, typeof LAYER_REGISTRY>();
  for (const layer of LAYER_REGISTRY) {
    const group = grouped.get(layer.category) || [];
    group.push(layer);
    grouped.set(layer.category, group);
  }

  return (
    <div className="flex flex-col">
      {LAYER_CATEGORIES.map((cat) => {
        const categoryLayers = grouped.get(cat.id);
        if (!categoryLayers?.length) return null;
        const isExpanded = expanded.has(cat.id);
        const enabledCount = categoryLayers.filter(
          (l) => layers[l.id]?.enabled
        ).length;

        return (
          <div key={cat.id}>
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent-subtle transition-colors border-b border-border-subtle"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span
                className="text-[9px] uppercase tracking-widest font-bold"
                style={{ color: cat.color }}
              >
                {cat.name}
              </span>
              {enabledCount > 0 && (
                <span className="ml-auto text-[8px] text-accent bg-accent-subtle px-1.5 rounded">
                  {enabledCount}
                </span>
              )}
            </button>
            {isExpanded && (
              <div className="bg-bg">
                {categoryLayers.map((layer) => {
                  const state = layers[layer.id];
                  const isEnabled = state?.enabled ?? false;
                  const isLoading = state?.loading ?? false;
                  const hasError = !!state?.error;

                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className="w-full flex items-center gap-2 px-4 py-1 hover:bg-surface transition-colors border-b border-border-subtle"
                    >
                      {/* Toggle indicator */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isEnabled ? "bg-accent" : "bg-border"
                        }`}
                      />
                      <span
                        className={`text-[9px] flex-1 text-left truncate ${
                          isEnabled ? "text-text-primary" : "text-text-disabled"
                        }`}
                      >
                        {layer.name}
                      </span>
                      {/* Status */}
                      {isLoading && (
                        <Loader2 size={10} className="text-accent animate-spin flex-shrink-0" />
                      )}
                      {hasError && (
                        <span className="text-[7px] text-negative flex-shrink-0">ERR</span>
                      )}
                      {isEnabled && !isLoading && !hasError && state?.data && (
                        <span className="text-[7px] text-positive flex-shrink-0">LIVE</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
