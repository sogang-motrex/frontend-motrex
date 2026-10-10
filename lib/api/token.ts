/**
 * accessToken은 메모리에만 보관한다.
 * localStorage에 두면 악성 스크립트(XSS)가 읽어갈 수 있어서 쓰지 않는다.
 * 새로고침하면 사라지므로, 앱 시작 시 refreshToken 쿠키로 재발급받는다(app/providers.tsx).
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
