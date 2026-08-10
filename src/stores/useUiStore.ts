"use client";

import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  toast: string | null;
  setSidebarCollapsed: (value: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toast: null,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
