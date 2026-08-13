"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorMode = "light" | "dark";

interface UiState {
  sidebarCollapsed: boolean;
  toast: string | null;
  colorMode: ColorMode;
  setSidebarCollapsed: (value: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toast: null,
      colorMode: "light",
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleColorMode: () => set((state) => ({ colorMode: state.colorMode === "light" ? "dark" : "light" })),
    }),
    {
      name: "mbv-ui-preferences",
      partialize: ({ sidebarCollapsed, colorMode }) => ({ sidebarCollapsed, colorMode }),
    },
  ),
);
