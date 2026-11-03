"use client";

import { useState, useEffect, useRef } from "react";
import OptionWheel from "@/components/OptionWheel";

export interface Track {
  id: string;
  title: string;
  artist: string;
  youtubeUrl: string;
  youtubeId: string;
}

export interface Mixtape {
  id: string;
  name: string;
  tracks: Track[];
}

const DEFAULT_MIXTAPES: Mixtape[] = [
  {
    id: "all",
    name: "All Mixtapes",
    tracks: [],
  },
  {
    id: "my-mixtape-1",
    name: "Tape_01",
    tracks: [
      {
        id: "default-lofi",
        title: "Lofi hip hop radio - beats to relax/study to",
        artist: "Lofi Girl",
        youtubeUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        youtubeId: "jfKfPfyJRdk",
      },
    ],
  },
];

function extractYouTubeId(url: string): string {
  const cleanUrl = url.replace(/^.*\b(https?:\/\/)/, '$1').trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}

export default function Home() {
  const [mixtapes, setMixtapes] = useState<Mixtape[]>(DEFAULT_MIXTAPES);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Browsing state (default to Tape_01 on load)
  const [activeMixtapeName, setActiveMixtapeName] = useState<string>("Tape_01");
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  // Active playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [playingMixtapeName, setPlayingMixtapeName] = useState<string>("Tape_01");
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number>(0);
  const [shuffledQueueIndices, setShuffledQueueIndices] = useState<number[]>([]);

  // YouTube IFrame API ref container for handling auto-advance queue
  const playerRef = useRef<any>(null);

  // Modals
  const [isMixtapeModalOpen, setIsMixtapeModalOpen] = useState(false);
  const [newMixtapeName, setNewMixtapeName] = useState("");

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [newTrackTitle, setNewTrackTitle] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMixtapeName, setEditMixtapeName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("user_mixtapes_universal");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMixtapes(parsed);
      } catch (e) {
        console.error("Failed to parse saved mixtapes", e);
      }
    }
    const savedTheme = localStorage.getItem("user_theme_mode");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  // Inject YouTube IFrame API script to listen to track endings
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const saveMixtapes = (updated: Mixtape[]) => {
    setMixtapes(updated);
    localStorage.setItem("user_mixtapes_universal", JSON.stringify(updated));
  };

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem("user_theme_mode", nextDark ? "dark" : "light");
  };

  const wheelItems = [...mixtapes.map((m) => m.name), "+ Add Mixtape"];

  // Currently viewed mixtape & tracks
  const activeMixtape =
    mixtapes.find((m) => m.name === activeMixtapeName) || mixtapes[1] || mixtapes[0];

  const activeTracks =
    activeMixtape?.id === "all"
      ? mixtapes.flatMap((m) => m.tracks)
      : activeMixtape?.tracks || [];

  const currentTrack = activeTracks[currentTrackIndex] || null;

  // Currently playing mixtape & tracks in the audio engine queue
  const playingMixtape =
    mixtapes.find((m) => m.name === playingMixtapeName) || mixtapes[1] || mixtapes[0];

  const playingTracks =
    playingMixtape?.id === "all"
      ? mixtapes.flatMap((m) => m.tracks)
      : playingMixtape?.tracks || [];

  const effectivePlayingIndex = isShuffle && shuffledQueueIndices.length > 0
    ? shuffledQueueIndices[playingTrackIndex] ?? 0
    : playingTrackIndex;

  const activePlayingTrack = playingTracks[effectivePlayingIndex] || null;

  // Handle queue progression when a track finishes
  const handlePlayerStateChange = (event: any) => {
    if (event.data === 0) {
      if (playingTrackIndex < playingTracks.length - 1) {
        setPlayingTrackIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }
  };

  // Mount YouTube iframe player via API when playing
  useEffect(() => {
    if (!isPlaying || !activePlayingTrack) return;

    let checkInterval: any = null;

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        if (playerRef.current) {
          try {
            playerRef.current.loadVideoById(activePlayingTrack.youtubeId);
            return;
          } catch (e) {
            // Recreate if instance failed
          }
        }
        playerRef.current = new window.YT.Player("youtube-hidden-player", {
          height: "0",
          width: "0",
          videoId: activePlayingTrack.youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
          },
          events: {
            onStateChange: handlePlayerStateChange,
          },
        });
      } else {
        checkInterval = setTimeout(initPlayer, 300);
      }
    };

    initPlayer();

    return () => {
      if (checkInterval) clearTimeout(checkInterval);
    };
  }, [isPlaying, playingTrackIndex, playingMixtapeName, activePlayingTrack?.youtubeId, isShuffle]);

  const handleWheelChange = (_index: number, item: string) => {
    if (item === "+ Add Mixtape") {
      setActiveMixtapeName("+ Add Mixtape");
    } else {
      setActiveMixtapeName(item);
      setCurrentTrackIndex(0);
    }
  };

  const handlePlay = () => {
    if (!currentTrack) return;
    setPlayingMixtapeName(activeMixtapeName);
    
    if (isShuffle) {
      const indices = activeTracks.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledQueueIndices(indices);
      const clickedTrackRealIndex = currentTrackIndex;
      const foundShufflePos = indices.indexOf(clickedTrackRealIndex);
      setPlayingTrackIndex(foundShufflePos !== -1 ? foundShufflePos : 0);
    } else {
      setPlayingTrackIndex(currentTrackIndex);
    }

    setIsPlaying(true);
  };

  const handlePlaySpecificTrack = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTrackIndex(idx);
    setPlayingMixtapeName(activeMixtapeName);

    if (isShuffle) {
      const indices = activeTracks.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledQueueIndices(indices);
      const foundShufflePos = indices.indexOf(idx);
      setPlayingTrackIndex(foundShufflePos !== -1 ? foundShufflePos : 0);
    } else {
      setPlayingTrackIndex(idx);
    }

    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
      playerRef.current.stopVideo();
    }
  };

  const toggleShuffle = () => {
    const nextShuffleState = !isShuffle;
    setIsShuffle(nextShuffleState);
    if (nextShuffleState && activeTracks.length > 0) {
      const indices = activeTracks.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledQueueIndices(indices);
    }
  };

  const handleCreateMixtape = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newMixtapeName.trim();
    if (!trimmedName) return;

    const finalName = trimmedName.length > 24 ? trimmedName.substring(0, 24) + "..." : trimmedName;

    const newTape: Mixtape = {
      id: Date.now().toString(),
      name: finalName,
      tracks: [],
    };

    const updated = [...mixtapes, newTape];
    saveMixtapes(updated);
    setActiveMixtapeName(newTape.name);
    setNewMixtapeName("");
    setIsMixtapeModalOpen(false);
  };

  const openEditModal = () => {
    if (activeMixtape.id === "all") return;
    setEditMixtapeName(activeMixtape.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateMixtape = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editMixtapeName.trim();
    if (!trimmedName) return;

    const finalName = trimmedName.length > 24 ? trimmedName.substring(0, 24) + "..." : trimmedName;

    const updated = mixtapes.map((m) => {
      if (m.id === activeMixtape.id) {
        return {
          ...m,
          name: finalName,
        };
      }
      return m;
    });

    saveMixtapes(updated);
    setActiveMixtapeName(finalName);
    if (playingMixtapeName === activeMixtape.name) {
      setPlayingMixtapeName(finalName);
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteMixtape = () => {
    if (activeMixtape.id === "all") return;
    if (playingMixtapeName === activeMixtape.name) {
      handleStop();
    }
    const updated = mixtapes.filter((m) => m.id !== activeMixtape.id);
    saveMixtapes(updated);
    setActiveMixtapeName("All Mixtapes");
    setIsEditModalOpen(false);
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const ytId = extractYouTubeId(newYoutubeUrl);
    if (!ytId) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    const titleFinal = newTrackTitle.trim() || `YouTube Track (${ytId.substring(0, 4)})`;

    const newTrack: Track = {
      id: Date.now().toString(),
      title: titleFinal,
      artist: "YouTube",
      youtubeUrl: newYoutubeUrl,
      youtubeId: ytId,
    };

    const updated = mixtapes.map((m) => {
      if (m.id === activeMixtape.id) {
        return { ...m, tracks: [...m.tracks, newTrack] };
      }
      return m;
    });

    saveMixtapes(updated);
    setNewYoutubeUrl("");
    setNewTrackTitle("");
    setIsTrackModalOpen(false);
  };

  const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = mixtapes.map((m) => {
      if (m.id === activeMixtape.id) {
        return { ...m, tracks: m.tracks.filter((t) => t.id !== trackId) };
      }
      return m;
    });
    saveMixtapes(updated);
    if (currentTrackIndex >= activeTracks.length - 1 && currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const isAddMode = activeMixtapeName === "+ Add Mixtape";

  const marqueeText = isPlaying && activePlayingTrack
    ? `NOW PLAYING: ${activePlayingTrack.title.toUpperCase()} — ${activePlayingTrack.artist.toUpperCase()} /// TAPE: ${playingMixtapeName.toUpperCase()} /// `
    : `CURRENT VIEW: ${activeMixtapeName.toUpperCase()} /// STATUS: IDLE /// `;

  return (
    <main className={`min-h-screen relative overflow-hidden flex flex-col justify-between p-12 pt-20 font-mono transition-colors ${
      isDarkMode ? "bg-neutral-950 text-white" : "bg-slate-100 text-neutral-900"
    }`}>
      
      {/* Top Scrolling Marquee Header Banner */}
      <header className={`fixed top-0 left-0 right-0 z-40 border-b-2 overflow-hidden py-1.5 shadow-md flex justify-between items-center px-6 ${
        isDarkMode ? "bg-white text-black border-white" : "bg-neutral-900 text-white border-neutral-900"
      }`}>
        <div className="whitespace-nowrap animate-marquee flex text-xs font-bold uppercase tracking-widest overflow-hidden flex-1 mr-4">
          <span className="mx-4">{marqueeText.repeat(4)}</span>
        </div>
        <button
          onClick={toggleTheme}
          className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider border shrink-0 transition-colors ${
            isDarkMode 
              ? "bg-black text-white border-black hover:bg-neutral-800" 
              : "bg-white text-neutral-900 border-white hover:bg-neutral-200"
          }`}
        >
          {isDarkMode ? "[MODE: LIGHT]" : "[MODE: DARK]"}
        </button>
      </header>

      {/* Dot Grid Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(${isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)'} 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* Ambient glow blur behind the card */}
      <div 
        className={`fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none opacity-15 ${
          isDarkMode ? "bg-white" : "bg-neutral-400"
        }`}
      />

      {/* Content Container */}
      <div className="flex-1 flex items-center justify-between w-full">
        {/* Left side Option Wheel - Fully Transparent & Unclipped */}
        <div className="w-[500px] h-[80vh] flex items-center justify-center relative -ml-8 z-10 overflow-visible [&_*]:bg-transparent">
          <OptionWheel items={wheelItems} onChange={handleWheelChange} />
        </div>

        {/* Right side: Brutalist Layout */}
        <div className="flex-1 flex flex-col items-center justify-center text-center z-10 pr-8 pl-12 max-w-lg mx-auto">
          
          {/* Standalone Play, Stop & Shuffle Action Buttons */}
          <div className="w-full max-w-md flex gap-3 mb-3">
            <button
              onClick={handlePlay}
              disabled={!currentTrack || isAddMode}
              className={`flex-1 py-2.5 border-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] ${
                isDarkMode 
                  ? "bg-neutral-900 border-white/30 text-white hover:border-white hover:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
                  : "bg-white border-neutral-400 text-neutral-900 hover:border-neutral-900 hover:bg-neutral-200"
              }`}
            >
              [▶ PLAY]
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying}
              className={`flex-1 py-2.5 border-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] ${
                isDarkMode 
                  ? "bg-neutral-900 border-white/30 text-white hover:border-white hover:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
                  : "bg-white border-neutral-400 text-neutral-900 hover:border-neutral-900 hover:bg-neutral-200"
              }`}
            >
              [■ STOP]
            </button>
            <button
              onClick={toggleShuffle}
              className={`px-4 py-2.5 border-2 text-xs font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] ${
                isShuffle
                  ? (isDarkMode ? "bg-white text-black border-white" : "bg-neutral-900 text-white border-neutral-900")
                  : (isDarkMode ? "bg-neutral-900 text-neutral-400 border-white/30 hover:border-white hover:text-white" : "bg-white text-neutral-600 border-neutral-400 hover:border-neutral-900 hover:text-neutral-900")
              }`}
            >
              {isShuffle ? "[SHUFFLE: ON]" : "[SHUFFLE: OFF]"}
            </button>
          </div>

          {/* Minimalist Cassette Card */}
          <div className={`w-full max-w-md border-2 p-5 flex flex-col justify-between relative mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] ${
            isDarkMode ? "bg-neutral-900 border-white/20 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] text-white" : "bg-white border-neutral-300 text-neutral-900"
          }`}>
            
            <div className={`flex justify-between items-center border-b pb-3 mb-3 text-xs tracking-widest uppercase ${
              isDarkMode ? "border-white/10 text-neutral-400" : "border-neutral-200 text-neutral-500"
            }`}>
              <span>[MIXTAPE_DATA]</span>
              <span>{isAddMode ? "0" : activeTracks.length} TRACKS</span>
            </div>

            <div className={`w-full p-4 border flex flex-col justify-between text-left relative overflow-hidden ${
              isDarkMode ? "border-white/20 bg-neutral-950" : "border-neutral-300 bg-slate-50"
            }`}>
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className={`text-xl font-bold tracking-wider truncate max-w-[240px] ${isDarkMode ? "text-white" : "text-neutral-900"}`}>
                  {activeMixtapeName}
                </span>
                {!isAddMode && activeMixtape.id !== "all" && (
                  <button
                    onClick={openEditModal}
                    className={`text-[10px] border px-2.5 py-1 transition-colors uppercase tracking-wider shrink-0 ${
                      isDarkMode 
                        ? "bg-black border-white/30 text-white hover:bg-white hover:text-black" 
                        : "bg-neutral-200 border-neutral-400 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className={`flex justify-between items-center mt-2 pt-2 border-t text-[10px] uppercase tracking-widest ${
                isDarkMode ? "border-white/10 text-neutral-400" : "border-neutral-200 text-neutral-500"
              }`}>
                <span>STATUS: {isPlaying ? "PLAYING" : "IDLE"}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isPlaying ? "#10b981" : "#a3a3a3" }} />
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
              isDarkMode ? "border-white/10 text-neutral-300" : "border-neutral-200 text-neutral-700"
            }`}>
              <span className="truncate max-w-[260px] text-left">
                {isAddMode ? "> READY_TO_CREATE_NEW_TAPE" : currentTrack ? `> ${currentTrack.title}` : "> NO_TRACK_LOADED"}
              </span>
              <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? "text-neutral-500" : "text-neutral-400"}`}>STEREO</span>
            </div>

            {/* Hidden container where YouTube IFrame API mounts its player */}
            <div id="youtube-hidden-player" className="hidden" />
          </div>

          {/* Clean Track List Container / Action Box */}
          <div className="w-full max-w-md flex flex-col items-center">
            <div className={`flex justify-between items-center w-full mb-3 px-1 border-b pb-2 ${
              isDarkMode ? "border-white/10 text-neutral-400" : "border-neutral-300 text-neutral-500"
            }`}>
              <span className="text-xs uppercase tracking-widest font-mono">
                {isAddMode ? "ACTION // NEW_MIXTAPE" : "INDEX // TRACK_LIST"}
              </span>
            </div>

            {isAddMode ? (
              <div className={`w-full border p-6 flex flex-col items-center gap-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${
                isDarkMode ? "bg-neutral-900 border-white/20 text-neutral-300" : "bg-white border-neutral-300 text-neutral-600"
              }`}>
                <span className="text-xs uppercase tracking-wider">
                  Ready to initialize a new tape slot?
                </span>
                <button
                  onClick={() => setIsMixtapeModalOpen(true)}
                  className={`px-4 py-2 font-bold text-xs uppercase tracking-widest transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] ${
                    isDarkMode ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"
                  }`}
                >
                  + Click to Create New Mixtape
                </button>
              </div>
            ) : (
              <>
                {/* Scrollable Track list */}
                <div className="w-full max-h-52 overflow-y-auto flex flex-col gap-2 pr-1">
                  {activeTracks.length > 0 ? (
                    activeTracks.map((track, idx) => {
                      const isSelected = currentTrack?.id === track.id;
                      const isCurrentlyPlayingThis = isPlaying && playingMixtapeName === activeMixtapeName && activePlayingTrack?.id === track.id;
                      
                      // High-contrast clean background styles for selected items in both Light & Dark modes
                      let itemStyles = "";
                      if (isSelected) {
                        itemStyles = isDarkMode 
                          ? "bg-white text-black border-white font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
                          : "bg-neutral-900 text-white border-neutral-900 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]";
                      } else {
                        itemStyles = isDarkMode
                          ? "bg-neutral-900 text-white border-white/20 hover:border-white/50"
                          : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-500";
                      }

                      return (
                        <div
                          key={track.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setCurrentTrackIndex(idx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setCurrentTrackIndex(idx);
                            }
                          }}
                          className={`w-full p-3 border text-left flex items-center justify-between gap-3 cursor-pointer transition-all outline-none ${itemStyles}`}
                        >
                          {/* Left side: Index & Scrolling Marquee Title Container */}
                          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                            <span className={`text-xs opacity-75 w-5 shrink-0 ${isSelected ? (isDarkMode ? "text-black font-bold" : "text-white font-bold") : (isDarkMode ? "text-neutral-400" : "text-neutral-500")}`}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>

                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="text-xs tracking-wide flex items-center gap-2 whitespace-nowrap overflow-hidden">
                                {isCurrentlyPlayingThis && <span className="text-emerald-400 font-bold shrink-0">▶</span>}
                                {isSelected ? (
                                  <div className="overflow-hidden relative w-full inline-block">
                                    <div className="inline-block animate-marquee whitespace-nowrap">
                                      <span>{track.title}</span>
                                      <span className="mx-8">///</span>
                                      <span>{track.title}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="truncate block w-full">{track.title}</span>
                                )}
                              </div>
                              <div className={`text-[10px] truncate ${isSelected ? (isDarkMode ? "text-neutral-800" : "text-neutral-300") : (isDarkMode ? "text-neutral-400" : "text-neutral-500")}`}>
                                {track.artist}
                              </div>
                            </div>
                          </div>

                          {/* Right side buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => handlePlaySpecificTrack(idx, e)}
                              className={`text-[10px] px-2 py-1 border uppercase font-bold transition-colors ${
                                isSelected 
                                  ? (isDarkMode ? "bg-black text-white border-black hover:bg-neutral-800" : "bg-white text-neutral-900 border-white hover:bg-neutral-200") 
                                  : (isDarkMode ? "bg-white/10 text-white border-white/30 hover:bg-white hover:text-black" : "bg-neutral-100 text-neutral-900 border-neutral-300 hover:bg-neutral-900 hover:text-white")
                              }`}
                              title="Play this specific track"
                            >
                              [▶]
                            </button>

                            {activeMixtape.id !== "all" && (
                              <button
                                onClick={(e) => handleDeleteTrack(track.id, e)}
                                className={`text-xs p-1 transition-colors ${isSelected ? (isDarkMode ? "text-black hover:text-red-700" : "text-white hover:text-red-400") : "text-neutral-400 hover:text-red-500"}`}
                                title="Delete track"
                              >
                                [X]
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={`w-full border p-6 text-xs text-center uppercase tracking-wider ${
                      isDarkMode ? "bg-neutral-900 border-white/20 text-neutral-400" : "bg-white border-neutral-300 text-neutral-500"
                    }`}>
                      [EMPTY_PLAYLIST]
                    </div>
                  )}
                </div>

                {/* Add URL Button */}
                {activeMixtape.id !== "all" && (
                  <button
                    onClick={() => setIsTrackModalOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsTrackModalOpen(true);
                      }
                    }}
                    className={`w-full mt-3 py-2.5 border-2 border-dashed text-xs font-mono uppercase tracking-widest transition-all text-center ${
                      isDarkMode 
                        ? "bg-neutral-900 border-white/30 text-neutral-300 hover:text-white hover:border-white" 
                        : "bg-white border-neutral-400 text-neutral-700 hover:text-neutral-900 hover:border-neutral-900"
                    }`}
                  >
                    + Add YouTube URL
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create Mixtape */}
      {isMixtapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className={`border-2 p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] ${
            isDarkMode ? "bg-neutral-950 border-white text-white" : "bg-white border-neutral-900 text-neutral-900"
          }`}>
            <h3 className={`text-sm font-bold mb-4 uppercase tracking-widest border-b pb-2 ${isDarkMode ? "border-white/20" : "border-neutral-200"}`}>
              // CREATE_NEW_MIXTAPE
            </h3>
            <form onSubmit={handleCreateMixtape} className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                  Mixtape Name (Max 24 chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="e.g. tape_02"
                  value={newMixtapeName}
                  onChange={(e) => setNewMixtapeName(e.target.value)}
                  className={`w-full border rounded-none px-3 py-2 text-xs focus:outline-none ${
                    isDarkMode ? "bg-neutral-900 border-white/30 text-white focus:border-white" : "bg-slate-50 border-neutral-300 text-neutral-900 focus:border-neutral-900"
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-3 mt-2 border-t pt-3 ${isDarkMode ? "border-white/20" : "border-neutral-200"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMixtapeModalOpen(false);
                    setActiveMixtapeName("All Mixtapes");
                  }}
                  className={`px-4 py-2 border text-xs uppercase ${isDarkMode ? "bg-neutral-900 border-white/30 text-neutral-300 hover:bg-neutral-800" : "bg-slate-100 border-neutral-300 text-neutral-700 hover:bg-slate-200"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-bold text-xs uppercase ${isDarkMode ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Mixtape */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className={`border-2 p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] ${
            isDarkMode ? "bg-neutral-950 border-white text-white" : "bg-white border-neutral-900 text-neutral-900"
          }`}>
            <h3 className={`text-sm font-bold mb-4 uppercase tracking-widest border-b pb-2 ${isDarkMode ? "border-white/20" : "border-neutral-200"}`}>
              // EDIT_MIXTAPE
            </h3>
            <form onSubmit={handleUpdateMixtape} className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                  Mixtape Name (Max 24 chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={editMixtapeName}
                  onChange={(e) => setEditMixtapeName(e.target.value)}
                  className={`w-full border rounded-none px-3 py-2 text-xs focus:outline-none ${
                    isDarkMode ? "bg-neutral-900 border-white/30 text-white focus:border-white" : "bg-slate-50 border-neutral-300 text-neutral-900 focus:border-neutral-900"
                  }`}
                />
              </div>

              <div className={`flex justify-between items-center mt-2 border-t pt-3 ${isDarkMode ? "border-white/20" : "border-neutral-200"}`}>
                <button
                  type="button"
                  onClick={handleDeleteMixtape}
                  className="px-3 py-2 bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-900/50 text-xs uppercase"
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={`px-4 py-2 border text-xs uppercase ${isDarkMode ? "bg-neutral-900 border-white/30 text-neutral-300 hover:bg-neutral-800" : "bg-slate-100 border-neutral-300 text-neutral-700 hover:bg-slate-200"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 font-bold text-xs uppercase ${isDarkMode ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Track Link */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className={`border-2 p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] ${
            isDarkMode ? "bg-neutral-950 border-white text-white" : "bg-white border-neutral-900 text-neutral-900"
          }`}>
            <h3 className="text-sm font-bold mb-1 uppercase tracking-widest">
              // ADD_TRACK_LINK
            </h3>
            <p className={`text-[10px] mb-4 font-mono uppercase ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              Target: {activeMixtape.name}
            </p>
            <form onSubmit={handleAddTrack} className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] uppercase block mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                  Track Title / Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lofi Study Session"
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                  className={`w-full border rounded-none px-3 py-2 text-xs focus:outline-none mb-2 ${
                    isDarkMode ? "bg-neutral-900 border-white/30 text-white focus:border-white" : "bg-slate-50 border-neutral-300 text-neutral-900 focus:border-neutral-900"
                  }`}
                />

                <label className={`text-[10px] uppercase block mb-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                  YouTube URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                  className={`w-full border rounded-none px-3 py-2 text-xs focus:outline-none ${
                    isDarkMode ? "bg-neutral-900 border-white/30 text-white focus:border-white" : "bg-slate-50 border-neutral-300 text-neutral-900 focus:border-neutral-900"
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-3 mt-2 border-t pt-3 ${isDarkMode ? "border-white/20" : "border-neutral-200"}`}>
                <button
                  type="button"
                  onClick={() => setIsTrackModalOpen(false)}
                  className={`px-4 py-2 border text-xs uppercase ${isDarkMode ? "bg-neutral-900 border-white/30 text-neutral-300 hover:bg-neutral-800" : "bg-slate-100 border-neutral-300 text-neutral-700 hover:bg-slate-200"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-bold text-xs uppercase ${isDarkMode ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
                >
                  ADD TRACK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}