export const APP_BASE_PATH = ''
export function withBasePath(path: string): string {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}
