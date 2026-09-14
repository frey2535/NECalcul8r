import { localAuth } from "./localAuth";
import { localEntities, seedIfNeeded } from "./localEntities";
import { localIntegrations } from "./localIntegrations";
import { invokeFunction } from "./localFunctions";
import { commerce } from "./commerce";
import { supabaseAuth } from "./supabaseAuth";
import { supabaseEntities } from "./supabaseEntities";
import { supabaseIntegrations } from "./supabaseIntegrations";
import { invokeSupabaseFunction } from "./supabaseFunctions";
import { isLocalAuthFallbackEnabled, isProductionAuthMisconfigured, isSupabaseConfigured } from "./supabaseClient";
import { ARTICLE_VERIFICATION_SEED } from "@/data/seedArticleVerifications";

if (isLocalAuthFallbackEnabled) seedIfNeeded(ARTICLE_VERIFICATION_SEED);

function productionAuthConfigError() {
  throw new Error("Production authentication is not configured. Update the app so Supabase auth is enabled; device-local login is disabled for hosted builds.");
}

const unconfiguredAuth = {
  me: productionAuthConfigError,
  loginViaEmailPassword: productionAuthConfigError,
  register: productionAuthConfigError,
  resetPasswordRequest: productionAuthConfigError,
  resetPassword: productionAuthConfigError,
  deleteAccount: productionAuthConfigError,
  setToken: () => {},
  logout: () => {
    if (typeof window !== "undefined") window.location.href = "/landing";
  },
  redirectToLogin: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
  },
  loginWithProvider: productionAuthConfigError,
};

const auth = isSupabaseConfigured ? supabaseAuth : isProductionAuthMisconfigured ? unconfiguredAuth : localAuth;
const entities = isSupabaseConfigured ? supabaseEntities : localEntities;
const integrations = isSupabaseConfigured ? supabaseIntegrations : localIntegrations;
const invoke = isSupabaseConfigured ? invokeSupabaseFunction : invokeFunction;

export const base44 = {
  auth,
  entities,
  integrations,
  commerce,
  functions: {
    invoke,
  },
  asServiceRole: {
    entities,
    integrations,
    functions: {
      invoke,
    },
  },
};
