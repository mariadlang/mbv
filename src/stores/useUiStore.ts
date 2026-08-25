"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorMode = "light" | "dark";
export type Language = "es" | "en";

interface UiState {
  sidebarCollapsed: boolean;
  toast: string | null;
  colorMode: ColorMode;
  language: Language;
  tutorialCompletedByUser: Record<string, boolean>;
  tutorialReplayNonce: number;
  setSidebarCollapsed: (value: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  setLanguage: (language: Language) => void;
  markTutorialCompleted: (userId: string, completed?: boolean) => void;
  replayTutorial: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toast: null,
      colorMode: "light",
      language: "es",
      tutorialCompletedByUser: {},
      tutorialReplayNonce: 0,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleColorMode: () => set((state) => ({ colorMode: state.colorMode === "light" ? "dark" : "light" })),
      setLanguage: (language) => set({ language }),
      markTutorialCompleted: (userId, completed = true) => set((state) => ({
        tutorialCompletedByUser: { ...state.tutorialCompletedByUser, [userId]: completed },
      })),
      replayTutorial: () => set((state) => ({ tutorialReplayNonce: state.tutorialReplayNonce + 1 })),
    }),
    {
      name: "mbv-ui-preferences",
      partialize: ({ sidebarCollapsed, colorMode, language, tutorialCompletedByUser }) => ({
        sidebarCollapsed, colorMode, language, tutorialCompletedByUser,
      }),
    },
  ),
);
