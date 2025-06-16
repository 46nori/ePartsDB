import { Environment } from '../types';

/**
 * 実行環境を自動判別する
 * ローカルホスト（開発環境）かGitHub Pages（本番環境）かを判定
 */
export function detectEnvironment(): Environment {
  const hostname = window.location.hostname;
  
  // ローカルホストの場合
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'local';
  }
  
  // GitHub Pagesやその他のリモート環境
  return 'remote';
}
