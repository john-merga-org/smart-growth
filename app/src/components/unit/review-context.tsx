"use client";

import { createContext, useContext } from "react";

/** Present only on the review page: blocks call reveal() once the answer may be shown, so rating buttons appear. */
export const ReviewCtx = createContext<{ revealed: boolean; reveal: (suggested?: 1 | 3) => void } | null>(null);
export const useReview = () => useContext(ReviewCtx);
