/** 開発環境でのみログ出力する */
export const devLog = (message: string, ...args: unknown[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- 開発専用ログの出力先
    console.log(message, ...args);
  }
};
