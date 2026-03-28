"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import type { AlertPriority } from "@/types/store";

/**
 * Alert engine — watches enabled layer data and fires alerts based on signals.
 * Runs as an invisible effect, de-duplicating within 10-minute windows.
 */
export function useAlertEngine() {
  const processedSignals = useRef(new Set<string>());
  const addAlert = useStore((s) => s.addAlert);

  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const alerts: Array<{ priority: AlertPriority; source: string; title: string; body: string }> = [];

      // ── FRED signals ──
      const fredData = state.layers["markets.fred"]?.enabled ? state.layers["markets.fred"]?.data : null;
      if (fredData?.signals?.length) {
        for (const sig of fredData.signals) {
          const key = `fred:${sig}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({
              priority: sig.includes("INVERTED") || sig.includes("EXTREME") ? "FLASH" : "PRIORITY",
              source: "FRED",
              title: sig,
              body: "Federal Reserve Economic Data signal detected",
            });
          }
        }
      }

      // ── EIA signals ──
      const eiaData = state.layers["markets.eia"]?.enabled ? state.layers["markets.eia"]?.data : null;
      if (eiaData?.signals?.length) {
        for (const sig of eiaData.signals) {
          const key = `eia:${sig}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({ priority: "PRIORITY", source: "EIA", title: sig, body: "Energy price or inventory signal from EIA" });
          }
        }
      }

      // ── BLS signals ──
      const blsData = state.layers["markets.bls"]?.enabled ? state.layers["markets.bls"]?.data : null;
      if (blsData?.signals?.length) {
        for (const sig of blsData.signals) {
          const key = `bls:${sig}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({ priority: "PRIORITY", source: "BLS", title: sig, body: "Bureau of Labor Statistics employment data signal" });
          }
        }
      }

      // ── GSCPI signals ──
      const gscpiData = state.layers["markets.gscpi"]?.enabled ? state.layers["markets.gscpi"]?.data : null;
      if (gscpiData?.signals?.length) {
        for (const sig of gscpiData.signals) {
          const key = `gscpi:${sig}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({ priority: sig.includes("extremely") ? "FLASH" : "PRIORITY", source: "NY Fed GSCPI", title: sig, body: "Global Supply Chain Pressure Index signal" });
          }
        }
      }

      // ── WHO outbreak alerts ──
      const whoData = state.layers["health.who-alerts"]?.enabled ? state.layers["health.who-alerts"]?.data : null;
      if (whoData?.diseaseOutbreakNews?.length) {
        const recent = whoData.diseaseOutbreakNews.slice(0, 3);
        for (const item of recent) {
          const key = `who:${item.donId || item.title}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({
              priority: "PRIORITY",
              source: "WHO",
              title: item.title || "Disease Outbreak News",
              body: item.summary || "New WHO disease outbreak notification",
            });
          }
        }
      }

      // ── ReliefWeb disasters ──
      const rwData = state.layers["health.reliefweb"]?.enabled ? state.layers["health.reliefweb"]?.data : null;
      if (rwData?.activeDisasters?.length) {
        for (const disaster of rwData.activeDisasters.slice(0, 3)) {
          const key = `reliefweb:${disaster.name}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({
              priority: "ROUTINE",
              source: "ReliefWeb",
              title: disaster.name || "Active Disaster",
              body: `Status: ${disaster.status} | Countries: ${disaster.countries?.join(", ") || "Unknown"}`,
            });
          }
        }
      }

      // ── Telegram urgent posts ──
      const telegramData = state.layers["social.telegram"]?.enabled ? state.layers["social.telegram"]?.data : null;
      if (telegramData?.urgentPosts?.length) {
        for (const post of telegramData.urgentPosts.slice(0, 5)) {
          if (post.text && post.urgentFlags?.length >= 2) {
            const key = `telegram:${post.postId}`;
            if (!processedSignals.current.has(key)) {
              processedSignals.current.add(key);
              alerts.push({
                priority: post.urgentFlags.includes("nuclear") || post.urgentFlags.includes("missile") ? "FLASH" : "PRIORITY",
                source: `Telegram/${post.channel}`,
                title: post.text.slice(0, 80) + (post.text.length > 80 ? "..." : ""),
                body: `Keywords: ${post.urgentFlags.slice(0, 4).join(", ")} | Views: ${post.views.toLocaleString()}`,
              });
            }
          }
        }
      }

      // ── KiwiSDR network signals ──
      const kiwisdrData = state.layers["signals.kiwisdr"]?.enabled ? state.layers["signals.kiwisdr"]?.data : null;
      if (kiwisdrData?.signals?.length) {
        for (const sig of kiwisdrData.signals) {
          const key = `kiwisdr:${sig}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({ priority: "ROUTINE", source: "KiwiSDR", title: sig, body: "HF radio network activity signal" });
          }
        }
      }

      // ── Patent watch signals ──
      const patentData = state.layers["signals.patents"]?.enabled ? state.layers["signals.patents"]?.data : null;
      if (patentData?.signals?.length) {
        for (const sig of patentData.signals) {
          if (sig !== "No unusual patent filing patterns detected") {
            const key = `patents:${sig}`;
            if (!processedSignals.current.has(key)) {
              processedSignals.current.add(key);
              alerts.push({ priority: "ROUTINE", source: "USPTO", title: sig, body: "Strategic technology patent filing detected" });
            }
          }
        }
      }

      // ── RSS news headlines ──
      const rssData = state.layers["news.rss-feeds"]?.enabled ? state.layers["news.rss-feeds"]?.data : null;
      if (rssData?.items?.length) {
        // Only surface breaking/urgent headlines (first 3 items sorted by date)
        for (const item of rssData.items.slice(0, 3)) {
          const key = `rss:${item.link || item.title}`;
          if (!processedSignals.current.has(key)) {
            processedSignals.current.add(key);
            alerts.push({
              priority: "ROUTINE",
              source: item.source || "News",
              title: item.title || "News Headline",
              body: item.description || "",
            });
          }
        }
      }

      // Fire all new alerts
      for (const alert of alerts) {
        addAlert({ ...alert, timestamp: Date.now() });
      }
    });

    // Reset processed signals every 10 minutes to allow re-alerting
    const resetInterval = setInterval(() => {
      processedSignals.current.clear();
    }, 10 * 60_000);

    return () => {
      unsub();
      clearInterval(resetInterval);
    };
  }, [addAlert]);
}
