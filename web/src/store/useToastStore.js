import { create } from "zustand";

// =====================================================
// TOAST GLOBAL
// =====================================================

let counter = 0;

export const useToastStore = create((set, get) => ({

  toasts: [],

  push: ({ type = "info", message, duration = 3200 }) => {
    const id = ++counter;

    set((s) => ({
      toasts: [...s.toasts, { id, type, message }],
    }));

    setTimeout(() => {
      get().remove(id);
    }, duration);

    return id;
  },

  remove: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}));