"use client";

import { createContext, useContext } from "react";

const MobileMenuCloseContext = createContext<() => void>(() => {});

export const MobileMenuCloseProvider = MobileMenuCloseContext.Provider;

export function useCloseMobileMenu() {
  return useContext(MobileMenuCloseContext);
}
