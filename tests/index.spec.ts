import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, Config, defineTools } from '../src/index.js'

function resolvedConfig(overrides: Record<string, unknown> = {}) {
  return {
    githubToken: undefined,
    timeoutMs: 5_000,
    defaultLimit: 3,
    bodyPreviewChars: 20,
    userAgent: 'test-agent',
    ...overrides,
  }
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

function exec() {
  return { signal: new AbortController().signal } as never
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('plugin registration', () => {
  it('registers exactly three tools on the registry', () => {
    const registered: unknown[] = []
    const ctx = { tools: { register: (tool: unknown) => { registered.push(tool) } } } as never
    apply(ctx, resolvedConfig())
    expect(registered).toHaveLength(4)
  })

  it('rejects non-positive integer configuration', () => {
    const ctx = { tools: { register: vi.fn() } } as never
    expect(() => apply(ctx, resolvedConfig({ timeoutMs: 0 }))).toThrow('positive integer')
    expect(() => apply(ctx, resolvedConfig({ defaultLimit: 1.5 }))).toThrow('positive integer')
  })

  it('exports a schemastery Config schema', () => {
    expect(Config).toBeDefined()
  })
})

describe('github_releases tool', () => {
  it('returns mapped releases and clamps the limit', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      { tag_name: 'v2', name: 'Two', published_at: '2026-08-10T00:00:00Z', prerelease: false, html_url: 'https://github.com/x/y/releases/tag/v2', body: 'note' },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    const [tool] = defineTools(resolvedConfig())
    const result = await tool.execute({ owner: 'x', repo: 'y', limit: 100 }, exec())

    expect(fetchMock.mock.calls[0]?.[0]).toContain('per_page=50')
    expect(result).toMatchObject({ fullName: 'x/y', releases: [{ tagName: 'v2' }] })
  })

  it('rejects empty owner or repo', async () => {
    const [tool] = defineTools(resolvedConfig())
    await expect(tool.execute({ owner: ' ', repo: 'y' }, exec())).rejects.toThrow('non-empty')
  })
})

describe('github_repo tool', () => {
  it('returns the repository overview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      full_name: 'x/y',
      description: null,
      stargazers_count: 5,
      forks_count: 1,
      open_issues_count: 0,
      language: null,
      license: null,
      updated_at: null,
      html_url: 'https://github.com/x/y',
    })))

    const [, repo] = defineTools(resolvedConfig())
    const result = await repo.execute({ owner: 'x', repo: 'y' }, exec())
    expect(result).toMatchObject({ fullName: 'x/y', stars: 5, forks: 1, openIssues: 0 })
  })
})

describe('github_search tool', () => {
  it('defaults to stars sorting and returns hits', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      items: [
        { full_name: 'a/b', description: 'd', stargazers_count: 7, language: 'TS', updated_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/a/b' },
      ],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const [, , search] = defineTools(resolvedConfig())
    const result = await search.execute({ query: 'agent' }, exec())
    expect(fetchMock.mock.calls[0]?.[0]).toContain('sort=stars')
    expect(result).toMatchObject({ query: 'agent', items: [{ fullName: 'a/b', stars: 7 }] })
  })

  it('rejects an empty query', async () => {
    const [, , search] = defineTools(resolvedConfig())
    await expect(search.execute({ query: '  ' }, exec())).rejects.toThrow('non-empty')
  })
})
