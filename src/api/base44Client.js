import { localAuth } from "./localAuth";
import { localEntities, seedIfNeeded } from "./localEntities";
import { localIntegrations } from "./localIntegrations";
import { invokeFunction } from "./localFunctions";
import { commerce } from "./commerce";
import { supabaseAuth } from "./supabaseAuth";
import { supabaseEntities } from "./supabaseEntities";
import { invokeSupabaseFunction } from "./supabaseFunctions";
import { isSupabaseConfigured } from "./supabaseClient";
import { ARTICLE_VERIFICATION_SEED } from "@/data/seedArticleVerifications";

if (!isSupabaseConfigured) seedIfNeeded(ARTICLE_VERIFICATION_SEED);

const auth = isSupabaseConfigured ? supabaseAuth : localAuth;
const entities = isSupabaseConfigured ? supabaseEntities : localEntities;
const invoke = isSupabaseConfigured ? invokeSupabaseFunction : invokeFunction;

export const base44 = {
  auth,
  entities,
  integrations: localIntegrations,
  commerce,
  functions: {
    invoke,
  },
  asServiceRole: {
    entities,
    integrations: localIntegrations,
    functions: {
      invoke,
    },
  },
};
