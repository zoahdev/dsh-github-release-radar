import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubClient } from '../src/github.js'

const BASE = 'https://api.github.com'

function makeClient(overrides: Partial<ConstructorParameters<typeof GitHubClient>[0]> = {}) {
  return new GitHubClient({
    token: undefined,
    userAgent: 'test-agent',
    timeoutMs: 5_000,
    bodyPreviewChars: 20,
    ...overrides,
  })
}

function jsonResponse(body: unknown, init: Partial<Response> = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
    ...init,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHubClient', () => {
  it('lists releases and previews the body with a bounded character count', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      {
        tag_name: 'v1.0.0',
        name: 'First release',
        published_at: '2026-08-01T10:00:00Z',
        prerelease: false,
        html_url: 'https://github.com/a/b/releases/tag/v1.0.0',
        body: 'A very long body that keeps going far beyond the preview limit',
      },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    const releases = await makeClient().listReleases('a', 'b', 5, new AbortController().signal)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/repos/a/b/releases?per_page=5`)
    expect(releases[0]).toMatchObject({
      tagName: 'v1.0.0',
      name: 'First release',
      publishedAt: '2026-08-01T10:00:00Z',
      prerelease: false,
      htmlUrl: 'https://github.com/a/b/releases/tag/v1.0.0',
    })
    expect(releases[0]?.bodyPreview?.length).toBe(21) // 20 chars + ellipsis
  })

  it('clamps release limits to the GitHub per-page range', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await makeClient().listReleases('a', 'b', 500, new AbortController().signal)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('per_page=50')

    await makeClient().listReleases('a', 'b', 0, new AbortController().signal)
    expect(fetchMock.mock.calls[1]?.[0]).toContain('per_page=1')
  })

  it('sends a bearer token when configured', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await makeClient({ token: 'ghp_test' }).listReleases('a', 'b', 1, new AbortController().signal)
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer ghp_test' })
  })

  it('reports an anonymous rate-limit hit with actionable guidance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'rate limited' }, {
      ok: false,
      status: 403,
      headers: new Headers({ 'x-ratelimit-remaining': '0' }),
    })))

    await expect(makeClient().getRepo('a', 'b', new AbortController().signal)).rejects.toThrow('rate limit')
  })

  it('reports missing repositories clearly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Not Found' }, {
      ok: false,
      status: 404,
      headers: new Headers(),
    })))

    await expect(makeClient().getRepo('a', 'b', new AbortController().signal)).rejects.toThrow('not found')
  })

  it('maps repository overview fields including license', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      full_name: 'deepseek-ai/deepseek-harness',
      description: 'Everything is a plugin',
      stargazers_count: 12345,
      forks_count: 678,
      open_issues_count: 42,
      language: 'TypeScript',
      license: { spdx_id: 'MIT' },
      updated_at: '2026-08-13T00:00:00Z',
      html_url: 'https://github.com/deepseek-ai/deepseek-harness',
    })))

    const repo = await makeClient().getRepo('deepseek-ai', 'deepseek-harness', new AbortController().signal)
    expect(repo).toMatchObject({
      fullName: 'deepseek-ai/deepseek-harness',
      stars: 12345,
      forks: 678,
      openIssues: 42,
      language: 'TypeScript',
      license: 'MIT',
    })
  })

  it('maps search results with the requested sort order', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      items: [
        { full_name: 'a/b', description: 'd', stargazers_count: 9, language: 'TS', updated_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/a/b' },
      ],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const hits = await makeClient().searchRepos('agent framework', 5, 'stars', new AbortController().signal)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/search/repositories?q=agent%20framework&sort=stars&order=desc&per_page=5`)
    expect(hits[0]).toMatchObject({ fullName: 'a/b', stars: 9 })
  })
})
