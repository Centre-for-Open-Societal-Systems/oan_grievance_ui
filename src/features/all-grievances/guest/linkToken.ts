/**
 * The token a case link carries after `#k=`. The browser never sends a fragment to a server, so
 * it reaches neither this app's logs nor the backend's, and it is removed from the address bar as
 * soon as the page has read it (STG-518).
 */

// `secrets.token_urlsafe(16)` writes 22 URL-safe characters; a little slack either way.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** The token in a URL fragment such as `#k=Xk3pQ9vT2mLr8WzA1bNc4e`, or null when there is none. */
export function readLinkToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('k');
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

/** Drops the fragment from the address bar and the history entry, keeping path and query. */
export function stripLinkToken(win: Pick<Window, 'history' | 'location'> = window): void {
  const { pathname, search } = win.location;
  win.history.replaceState(win.history.state, '', `${pathname}${search}`);
}
