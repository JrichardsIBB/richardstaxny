/**
 * Base URL and route patterns for MyTAXPrepOffice.
 */

export const BASE_URL = 'https://app.mytaxprepoffice.com';

export const routes = {
  login: '/login',
  logout: '/logout',
  dashboard: '/dashboard',
  clients: '/clients',
  clientSearch: '/clients/search',
  newClient: '/clients/new',
  clientDetail: (clientId: string) => `/clients/${clientId}`,
  clientInfo: (clientId: string) => `/clients/${clientId}/info`,
  clientForms: (clientId: string) => `/clients/${clientId}/forms`,
  w2Input: (clientId: string) => `/clients/${clientId}/forms/w2`,
  w2Edit: (clientId: string, w2Id: string) => `/clients/${clientId}/forms/w2/${w2Id}`,
  returns: '/returns',
  documents: '/documents',
  settings: '/settings',
} as const;

/** Build a full URL from a route path */
export function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

/** Check if a URL matches a known route pattern */
export function matchesRoute(url: string, routePath: string): boolean {
  const normalizedUrl = url.replace(BASE_URL, '').split('?')[0];
  // Handle parameterized routes by converting :param to regex
  const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(normalizedUrl);
}
