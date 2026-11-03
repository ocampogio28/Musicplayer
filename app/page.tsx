"use client";

import { useState, useEffect } from "react";
import OptionWheel from "@/components/OptionWheel";

export interface Track {
  id: string;
  title: string;
  artist: string;
  youtubeUrl: string;
  youtubeId: string;
  duration: string;
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
        id: "1",
        title: "Lofi Beats to relax/study to",
        artist: "Lofi Girl",
        youtubeUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        youtubeId: "jfKfPfyJRdk",
        duration: "3:45",
      },
    ],
  },
];

function extractYouTubeId(url: string): string {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}

async function fetchYouTubeMetadata(
  url: string,
): Promise<{ title: string; artist: string }> {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
    );
    const data = await res.json();
    if (data && data.title) {
      return {
        title: data.title,
        artist: data.author_name || "YouTube",
      };
    }
  } catch (e) {
    console.error("Failed to fetch metadata", e);
  }
  return { title: "YouTube Track", artist: "Unknown Artist" };
}

export default function Home() {
  const [mixtapes, setMixtapes] = useState<Mixtape[]>(DEFAULT_MIXTAPES);

  // Browsing state (what you are currently viewing)
  const [activeMixtapeName, setActiveMixtapeName] =
    useState<string>("All Mixtapes");
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  // Active playback state (what is actually locked into the audio player)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playingMixtapeName, setPlayingMixtapeName] =
    useState<string>("All Mixtapes");
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number>(0);

  // Modals
  const [isMixtapeModalOpen, setIsMixtapeModalOpen] = useState(false);
  const [newMixtapeName, setNewMixtapeName] = useState("");

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMixtapeName, setEditMixtapeName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("user_mixtapes");
    if (saved) {
      try {
        setMixtapes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved mixtapes", e);
      }
    }
  }, []);

  const saveMixtapes = (updated: Mixtape[]) => {
    setMixtapes(updated);
    localStorage.setItem("user_mixtapes", JSON.stringify(updated));
  };

  const wheelItems = [...mixtapes.map((m) => m.name), "+ Add Mixtape"];

  // Currently viewed mixtape & tracks
  const activeMixtape =
    mixtapes.find((m) => m.name === activeMixtapeName) || mixtapes[0];

  const activeTracks =
    activeMixtape.id === "all"
      ? mixtapes.flatMap((m) => m.tracks)
      : activeMixtape.tracks;

  const currentTrack = activeTracks[currentTrackIndex] || null;

  // Currently playing mixtape & tracks in the audio engine
  const playingMixtape =
    mixtapes.find((m) => m.name === playingMixtapeName) || mixtapes[0];

  const playingTracks =
    playingMixtape.id === "all"
      ? mixtapes.flatMap((m) => m.tracks)
      : playingMixtape.tracks;

  const activePlayingTrack = playingTracks[playingTrackIndex] || null;

  const handleWheelChange = (_index: number, item: string) => {
    if (item === "+ Add Mixtape") {
      setIsMixtapeModalOpen(true);
    } else {
      setActiveMixtapeName(item);
      setCurrentTrackIndex(0);
      // NOTE: We do NOT reset isPlaying here anymore! You can freely browse sections.
    }
  };

  const handlePlay = () => {
    if (!currentTrack) return;
    setPlayingMixtapeName(activeMixtapeName);
    setPlayingTrackIndex(currentTrackIndex);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handleCreateMixtape = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newMixtapeName.trim();
    if (!trimmedName) return;

    const finalName =
      trimmedName.length > 24
        ? trimmedName.substring(0, 24) + "..."
        : trimmedName;

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
    setEditMixtapeName(activeMixtape.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateMixtape = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editMixtapeName.trim();
    if (!trimmedName) return;

    const finalName =
      trimmedName.length > 24
        ? trimmedName.substring(0, 24) + "..."
        : trimmedName;

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
      setIsPlaying(false);
    }
    const updated = mixtapes.filter((m) => m.id !== activeMixtape.id);
    saveMixtapes(updated);
    setActiveMixtapeName("All Mixtapes");
    setIsEditModalOpen(false);
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const ytId = extractYouTubeId(newYoutubeUrl);
    if (!ytId) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    setIsFetchingMetadata(true);
    const meta = await fetchYouTubeMetadata(newYoutubeUrl);

    const newTrack: Track = {
      id: Date.now().toString(),
      title: meta.title,
      artist: meta.artist,
      youtubeUrl: newYoutubeUrl,
      youtubeId: ytId,
      duration: "3:30",
    };

    const updated = mixtapes.map((m) => {
      if (m.id === activeMixtape.id) {
        return { ...m, tracks: [...m.tracks, newTrack] };
      }
      return m;
    });

    saveMixtapes(updated);
    setNewYoutubeUrl("");
    setIsFetchingMetadata(false);
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

  const marqueeText =
    isPlaying && activePlayingTrack
      ? `NOW PLAYING: ${activePlayingTrack.title.toUpperCase()} — ${activePlayingTrack.artist.toUpperCase()} /// TAPE: ${playingMixtapeName.toUpperCase()} /// `
      : `CURRENT VIEW: ${activeMixtape.name.toUpperCase()} /// STATUS: IDLE /// SELECT A TRACK AND PRESS PLAY /// `;

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col justify-between p-12 pt-20 text-white font-mono bg-neutral-950">
      {/* Top Scrolling Marquee Header Banner */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white text-black border-b-2 border-white overflow-hidden py-1.5 shadow-md">
        <div className="whitespace-nowrap animate-marquee flex text-xs font-bold uppercase tracking-widest">
          <span className="mx-4">{marqueeText.repeat(4)}</span>
        </div>
      </header>

      {/* Clean White & Gray Dot Grid Pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Soft White/Gray ambient glow blur behind the card */}
      <div className="fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none opacity-10 bg-white" />

      {/* Content Container */}
      <div className="flex-1 flex items-center justify-between w-full">
        {/* Left side Option Wheel - Fully Transparent & Unclipped */}
        <div className="w-[500px] h-[80vh] flex items-center justify-center relative -ml-8 z-10 overflow-visible [&_*]:bg-transparent">
          <OptionWheel items={wheelItems} onChange={handleWheelChange} />
        </div>

        {/* Right side: Clean Brutalist Layout */}
        <div className="flex-1 flex flex-col items-center justify-center text-center z-10 pr-8 pl-12 max-w-lg mx-auto">
          {/* Standalone Play / Stop Action Buttons */}
          <div className="w-full max-w-md flex gap-3 mb-3">
            <button
              onClick={handlePlay}
              disabled={!currentTrack}
              className="flex-1 py-2.5 bg-neutral-900 border-2 border-white/30 text-white hover:border-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
            >
              [▶ PLAY]
            </button>
            <button
              onClick={handleStop}
              disabled={!isPlaying}
              className="flex-1 py-2.5 bg-neutral-900 border-2 border-white/30 text-white hover:border-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
            >
              [■ STOP]
            </button>
          </div>

          {/* Minimalist Cassette Card */}
          <div className="w-full max-w-md bg-neutral-900 border-2 border-white/20 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-5 flex flex-col justify-between relative mb-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 text-xs tracking-widest text-neutral-400 uppercase">
              <span>[MIXTAPE_DATA]</span>
              <span>{activeTracks.length} TRACKS</span>
            </div>

            <div className="w-full p-4 border border-white/20 bg-neutral-950 flex flex-col justify-between text-left relative overflow-hidden">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xl font-bold text-white tracking-wider truncate max-w-[240px]">
                  {activeMixtape.name}
                </span>
                {activeMixtape.id !== "all" && (
                  <button
                    onClick={openEditModal}
                    className="text-[10px] bg-black border border-white/30 text-white px-2.5 py-1 hover:bg-white hover:text-black transition-colors uppercase tracking-wider shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 text-[10px] text-neutral-400 uppercase tracking-widest">
                <span>STATUS: {isPlaying ? "PLAYING" : "IDLE"}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isPlaying ? "#00ffcc" : "#52525b" }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-300">
              <span className="truncate max-w-[260px] text-left">
                {currentTrack ? `> ${currentTrack.title}` : "> NO_TRACK_LOADED"}
              </span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                STEREO
              </span>
            </div>

            {/* Hidden audio iframe locks to activePlayingTrack and only unmounts when STOP is pressed */}
            {activePlayingTrack && isPlaying && (
              <iframe
                className="hidden"
                src={`https://www.youtube.com/embed/${activePlayingTrack.youtubeId}?autoplay=1`}
                allow="autoplay"
              />
            )}
          </div>

          {/* Clean Track List Container */}
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 px-1 border-b border-white/10 pb-2">
              <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
                INDEX // TRACK_LIST
              </span>
            </div>

            {/* Scrollable Track list */}
            <div className="w-full max-h-52 overflow-y-auto flex flex-col gap-2 pr-1">
              {activeTracks.length > 0 ? (
                activeTracks.map((track, idx) => {
                  const isSelected = currentTrack?.id === track.id;
                  const isCurrentlyPlayingThis =
                    isPlaying && activePlayingTrack?.id === track.id;
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
                      className={`w-full p-3 border text-left flex items-center justify-between cursor-pointer transition-all outline-none ${
                        isSelected
                          ? "bg-white text-black border-white font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
                          : "bg-neutral-900 text-white border-white/20 hover:border-white/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`text-xs opacity-60 w-5 ${isSelected ? "text-black" : "text-neutral-400"}`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="truncate">
                          <div className="text-xs truncate tracking-wide flex items-center gap-2">
                            {isCurrentlyPlayingThis && (
                              <span className="text-emerald-400 font-bold">
                                ▶
                              </span>
                            )}
                            {track.title}
                          </div>
                          <div
                            className={`text-[10px] truncate ${isSelected ? "text-neutral-700" : "text-neutral-400"}`}
                          >
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border ${isSelected ? "border-black/30 text-black" : "border-white/20 text-neutral-400"}`}
                        >
                          {track.duration}
                        </span>
                        {activeMixtape.id !== "all" && (
                          <button
                            onClick={(e) => handleDeleteTrack(track.id, e)}
                            className={`text-xs p-1 transition-colors ${isSelected ? "text-black hover:text-red-700" : "text-neutral-500 hover:text-red-400"}`}
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
                <div className="bg-neutral-900 border border-white/20 p-6 text-neutral-400 text-xs text-center uppercase tracking-wider">
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
                className="w-full mt-3 py-2.5 bg-neutral-900 border-2 border-dashed border-white/30 text-neutral-300 hover:text-white hover:border-white text-xs font-mono uppercase tracking-widest transition-all text-center"
              >
                + Add YouTube URL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Create Mixtape */}
      {isMixtapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-950 border-2 border-white p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/20 pb-2">
              // CREATE_NEW_MIXTAPE
            </h3>
            <form
              onSubmit={handleCreateMixtape}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">
                  Mixtape Name (Max 24 chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  placeholder="e.g. tape_02"
                  value={newMixtapeName}
                  onChange={(e) => setNewMixtapeName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/30 rounded-none px-3 py-2 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-white/20 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMixtapeModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 border border-white/30 text-neutral-300 hover:bg-neutral-800 text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-bold hover:bg-neutral-200 text-xs uppercase"
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
          <div className="bg-neutral-950 border-2 border-white p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/20 pb-2">
              // EDIT_MIXTAPE
            </h3>
            <form
              onSubmit={handleUpdateMixtape}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">
                  Mixtape Name (Max 24 chars)
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={editMixtapeName}
                  onChange={(e) => setEditMixtapeName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/30 rounded-none px-3 py-2 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-white/20 pt-3">
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
                    className="px-4 py-2 bg-neutral-900 border border-white/30 text-neutral-300 hover:bg-neutral-800 text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white text-black font-bold hover:bg-neutral-200 text-xs uppercase"
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
          <div className="bg-neutral-950 border-2 border-white p-6 rounded-none w-full max-w-md text-left shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-widest">
              // ADD_TRACK_LINK
            </h3>
            <p className="text-[10px] text-neutral-400 mb-4 font-mono uppercase">
              Target: {activeMixtape.name}
            </p>
            <form onSubmit={handleAddTrack} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">
                  YouTube URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/30 rounded-none px-3 py-2 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-white/20 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTrackModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 border border-white/30 text-neutral-300 hover:bg-neutral-800 text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingMetadata}
                  className="px-4 py-2 bg-white text-black font-bold hover:bg-neutral-200 text-xs uppercase disabled:opacity-50"
                >
                  {isFetchingMetadata ? "FETCHING..." : "ADD TRACK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
