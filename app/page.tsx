"use client";

import { useState } from "react";
import OptionWheel from "@/components/OptionWheel";
import HeroGeometric from "@/components/hero-geometric";

// 1. Define color themes for each genre
const genreColors: Record<string, { color1: string; color2: string }> = {
  Ambient: { color1: "#0f766e", color2: "#99f6e4" }, // Teal / Mint
  House: { color1: "#7c3aed", color2: "#ddd6fe" }, // Deep Violet / Lavender
  Techno: { color1: "#1e293b", color2: "#38bdf8" }, // Dark Slate / Neon Cyan
  "Lo-Fi": { color1: "#3b82f6", color2: "#f0f9ff" }, // Soft Blue / Pale Blue
  Synthwave: { color1: "#db2777", color2: "#fde047" }, // Hot Pink / Neon Yellow
  Jazz: { color1: "#b45309", color2: "#fef3c7" }, // Warm Amber / Cream
};

export default function Home() {
  const genres = ["Ambient", "House", "Techno", "Lo-Fi", "Synthwave", "Jazz"];
  const [activeGenre, setActiveGenre] = useState("Lo-Fi");

  // Get colors for the selected genre (fall back to Lo-Fi if not found)
  const currentTheme = genreColors[activeGenre] || genreColors["Lo-Fi"];

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-between p-12 text-white">
      {/* 1. Animated background receives the active genre's colors */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <HeroGeometric
          color1={currentTheme.color1}
          color2={currentTheme.color2}
        />
      </div>

      {/* 2. Left side Option Wheel sidebar controller */}
      <div className="w-[550px] h-[85vh] flex items-center justify-center relative -ml-12 z-10">
        <OptionWheel
          items={genres}
          onChange={(index, item) => setActiveGenre(item)}
        />
      </div>

      {/* 3. Right side content displaying the current active selection */}
      <div className="max-w-md text-right z-10">
        <h2 className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
          Current Vibe
        </h2>
        <h1 className="text-6xl font-black tracking-tight mb-4 transition-all duration-300">
          {activeGenre}
        </h1>
        <p className="text-neutral-300 text-lg">
          Now playing curated tracks for {activeGenre}.
        </p>
      </div>
    </main>
  );
}
