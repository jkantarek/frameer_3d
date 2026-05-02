import { describe, it, expect, beforeEach } from 'vitest';
import { clearActiveProjectId, getActiveProjectId, setActiveProjectId } from './ProjectRouter.js';

interface FakeLocation {
  search: string;
  pathname: string;
}

interface FakeHistory {
  replaceState(data: unknown, title: string, url: string): void;
  lastUrl: string;
}

function makeFakeHistory(): FakeHistory {
  return {
    lastUrl: '',
    replaceState(_data: unknown, _title: string, url: string): void {
      this.lastUrl = url;
    },
  };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('getActiveProjectId', () => {
  it('returns undefined when search is empty', () => {
    const loc: FakeLocation = { search: '', pathname: '/' };
    expect(getActiveProjectId(loc)).toBeUndefined();
  });

  it('returns undefined when project param is blank', () => {
    const loc: FakeLocation = { search: '?project=', pathname: '/' };
    expect(getActiveProjectId(loc)).toBeUndefined();
  });

  it('returns project id when param is present', () => {
    const loc: FakeLocation = { search: '?project=abc123', pathname: '/' };
    expect(getActiveProjectId(loc)).toBe('abc123');
  });

  it('uses window.location when no argument passed', () => {
    window.history.replaceState(null, '', '?project=fromwindow');
    expect(getActiveProjectId()).toBe('fromwindow');
  });
});

describe('setActiveProjectId', () => {
  it('calls replaceState with ?project=<id>', () => {
    const hist = makeFakeHistory();
    setActiveProjectId('myid', hist);
    expect(hist.lastUrl).toBe('?project=myid');
  });

  it('updates window.history when no history arg passed', () => {
    setActiveProjectId('win123');
    expect(new URLSearchParams(window.location.search).get('project')).toBe('win123');
  });
});

describe('clearActiveProjectId', () => {
  it('removes project param and calls replaceState with pathname when no other params', () => {
    const hist = makeFakeHistory();
    const loc: FakeLocation = { search: '?project=abc', pathname: '/app' };
    clearActiveProjectId(hist, loc);
    expect(hist.lastUrl).toBe('/app');
  });

  it('preserves other query params when removing project', () => {
    const hist = makeFakeHistory();
    const loc: FakeLocation = { search: '?project=abc&foo=bar', pathname: '/app' };
    clearActiveProjectId(hist, loc);
    expect(hist.lastUrl).toBe('/app?foo=bar');
    expect(new URLSearchParams(hist.lastUrl.replace(/^[^?]*/, '')).get('project')).toBeNull();
  });

  it('updates window.history when no args passed', () => {
    window.history.replaceState(null, '', '?project=gone');
    clearActiveProjectId();
    expect(new URLSearchParams(window.location.search).get('project')).toBeNull();
  });
});
