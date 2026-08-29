import { localAuth } from "./localAuth";
import { localEntities, seedIfNeeded } from "./localEntities";
import { localIntegrations } from "./localIntegrations";
import { invokeFunction } from "./localFunctions";
import { ARTICLE_VERIFICATION_SEED } from "@/data/seedArticleVerifications";

seedIfNeeded(ARTICLE_VERIFICATION_SEED);

export const base44 = {
  auth: localAuth,
  entities: localEntities,
  integrations: localIntegrations,
  functions: {
    invoke: invokeFunction,
  },
  asServiceRole: {
    entities: localEntities,
    integrations: localIntegrations,
    functions: {
      invoke: invokeFunction,
    },
  },
};
