/// <reference types="https://esm.sh/@supabase/functions-js/edge-runtime.d.ts" />

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
  }
}
