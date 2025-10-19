"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ToasterProps as SonnerToasterProps,
} from "sonner";

export function Toaster(props: SonnerToasterProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SonnerToaster
      closeButton
      richColors
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        duration: 4000,
      }}
      {...props}
    />
  );
}

export const toast = sonnerToast;
