declare function App(options: any): void;
declare function Page(options: any): void;
declare function getApp<T = Record<string, unknown>>(): T;

declare const wx: {
  login(options: {
    success?: (result: { code?: string; errMsg?: string }) => void;
    fail?: (error: { errMsg?: string }) => void;
  }): void;
  request<T = unknown>(options: {
    url: string;
    method?: "GET" | "POST";
    data?: unknown;
    header?: Record<string, string>;
    success?: (result: { statusCode: number; data: T }) => void;
    fail?: (error: { errMsg?: string }) => void;
  }): void;
  navigateTo(options: { url: string }): void;
  redirectTo(options: { url: string }): void;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, data: unknown): void;
  showToast(options: {
    title: string;
    icon?: "success" | "error" | "loading" | "none";
    duration?: number;
  }): void;
};
