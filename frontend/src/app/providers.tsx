import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { LanguageProvider } from "../lib/i18n";
import { queryClient } from "./query-client";

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
}
