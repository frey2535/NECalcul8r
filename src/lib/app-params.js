const isNode = typeof window === "undefined";
const storage = isNode ? { getItem: () => null, setItem: () => {}, removeItem: () => {} } : window.localStorage;

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) return defaultValue;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (removeFromUrl && searchParam) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  if (searchParam) {
    storage.setItem(`necalc_${paramName}`, searchParam);
    return searchParam;
  }
  if (defaultValue) return defaultValue;
  return storage.getItem(`necalc_${paramName}`);
};

export const appParams = {
  appId: "necalcul8r",
  token: getAppParamValue("access_token", { removeFromUrl: true }),
  fromUrl: typeof window === "undefined" ? "" : window.location.href,
  functionsVersion: "local",
  appBaseUrl: typeof window === "undefined" ? "" : window.location.origin,
};
