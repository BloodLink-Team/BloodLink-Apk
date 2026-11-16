const DEFAULT_BACKEND_ORIGIN =
  "https://ais-pre-zuvnctaclgcc3xblxgeb2x-675775108104.asia-southeast1.run.app";

export function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function getApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (isNativeCapacitor()) {
    const customOrigin = import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_ORIGIN;
    return `${customOrigin.replace(/\/+$/, "")}${normalized}`;
  }
  return normalized;
}

export function getLiveWsUrl(): string {
  if (isNativeCapacitor()) {
    const customOrigin = import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_ORIGIN;
    const wsOrigin = customOrigin.replace(/^http/, "ws").replace(/\/+$/, "");
    return `${wsOrigin}/live`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/live`;
}
