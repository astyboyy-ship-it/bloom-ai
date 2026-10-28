"use client";

import { createContext, useContext } from "react";

export const ActiveContext = createContext(false);

/** True while the enclosing demo widget is hovered or focused; widgets use it to speed up and intensify. */
export const useCardActive = () => useContext(ActiveContext);
