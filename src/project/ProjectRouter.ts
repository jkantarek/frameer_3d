type LocationLike = Pick<Location, 'search' | 'pathname'>;
type HistoryLike = Pick<History, 'replaceState'>;

export function getActiveProjectId(location: LocationLike = window.location): string | undefined {
  const id = new URLSearchParams(location.search).get('project');
  return id !== null && id !== '' ? id : undefined;
}

export function setActiveProjectId(id: string, history: HistoryLike = window.history): void {
  history.replaceState(null, '', `?project=${id}`);
}

export function clearActiveProjectId(
  history: HistoryLike = window.history,
  location: LocationLike = window.location,
): void {
  const params = new URLSearchParams(location.search);
  params.delete('project');
  const query = params.toString();
  history.replaceState(null, '', query ? `${location.pathname}?${query}` : location.pathname);
}
