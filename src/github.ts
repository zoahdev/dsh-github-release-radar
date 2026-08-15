/**
 * Minimal GitHub REST API client for the release radar plugin.
 *
 * Uses the public API without authentication. An optional token raises the
 * anonymous rate limit and is read from plugin config, never hardcoded.
 * @module dsh-github-release-radar/github
 */

export interface GitHubClientOptions {
  /** Optional `ghp_`/fine-grained token; raises the 60/hour anonymous limit. */
  token?: string
  /** User-Agent header sent with every request. */
  userAgent: string
  /** Request timeout in milliseconds. */
  timeoutMs: number
  /** Maximum characters kept from a release body preview. */
  bodyPreviewChars: number
}

/** A normalized public GitHub release. */
export interface GitHubRelease {
  tagName: string
  name: string | null
  publishedAt: string | null
  prerelease: boolean
  htmlUrl: string
  bodyPreview: string | null
}

/** A normalized public GitHub repository overview. */
export interface GitHubRepo {
  fullName: string
  description: string | null
  stars: number
  forks: number
  openIssues: number
  language: string | null
  license: string | null
  updatedAt: string | null
  htmlUrl: string
}

/** One normalized hit from `GET /search/repositories`. */
export interface GitHubRepoHit {
  fullName: string
  description: string | null
  stars: number
  language: string | null
  updatedAt: string | null
  htmlUrl: string
}

const API_ROOT = 'https://api.github.com'

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function preview(value: unknown, maxChars: number): string | null {
  const text = asString(value)
  if (text === null) return null
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}…`
}

/**
 * The GitHub REST client used by the plugin tools.
 */
export class GitHubClient {
  constructor(private readonly options: GitHubClientOptions) {}

  /** Combine a caller signal with a hard timeout into one abort signal. */
  private withDeadline(signal: AbortSignal): AbortSignal {
    return AbortSignal.any([signal, AbortSignal.timeout(this.options.timeoutMs)])
  }

  private async request<T>(path: string, signal: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'user-agent': this.options.userAgent,
    }
    if (this.options.token !== undefined) headers.authorization = `Bearer ${this.options.token}`

    let response: Response
    try {
      response = await fetch(`${API_ROOT}${path}`, { headers, signal: this.withDeadline(signal) })
    } catch (error: unknown) {
      if (signal.aborted) throw new Error('GitHub request cancelled')
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`GitHub request timed out after ${this.options.timeoutMs}ms`)
      }
      throw new Error(`GitHub network request failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (!response.ok) {
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error(
          'GitHub API rate limit exceeded (60 requests/hour without a token). '
          + 'Set `githubToken` in the plugin config to raise the limit.',
        )
      }
      if (response.status === 401) {
        throw new Error('GitHub API rejected the configured token (401). Check `githubToken` in the plugin config.')
      }
      if (response.status === 404) {
        throw new Error('GitHub resource not found. Check owner/repo spelling and that the repository is public.')
      }
      throw new Error(`GitHub API error ${response.status} for ${path}`)
    }
    return await response.json() as T
  }

  /** List the most recent releases of a public repository. */
  async listReleases(owner: string, repo: string, limit: number, signal: AbortSignal): Promise<GitHubRelease[]> {
    const perPage = Math.min(Math.max(Math.trunc(limit), 1), 50)
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${perPage}`
    const data = await this.request<unknown[]>(path, signal)
    return data.map((entry) => this.parseRelease(entry))
  }

  /** Fetch the current overview of a public repository. */
  async getRepo(owner: string, repo: string, signal: AbortSignal): Promise<GitHubRepo> {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    return this.parseRepo(await this.request<unknown>(path, signal))
  }

  /** Search public repositories; results are sorted by the given criterion. */
  async searchRepos(query: string, limit: number, sort: 'stars' | 'updated', signal: AbortSignal): Promise<GitHubRepoHit[]> {
    const perPage = Math.min(Math.max(Math.trunc(limit), 1), 50)
    const path = `/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${perPage}`
    const data = await this.request<{ items?: unknown }>(path, signal)
    const items = Array.isArray(data.items) ? data.items : []
    return items.map((entry) => this.parseRepoHit(entry))
  }

  private parseRelease(entry: unknown): GitHubRelease {
    const raw = entry as Record<string, unknown>
    return {
      tagName: asString(raw.tag_name) ?? 'unknown',
      name: asString(raw.name),
      publishedAt: asString(raw.published_at),
      prerelease: asBoolean(raw.prerelease),
      htmlUrl: asString(raw.html_url) ?? '',
      bodyPreview: preview(raw.body, this.options.bodyPreviewChars),
    }
  }

  private parseRepo(entry: unknown): GitHubRepo {
    const raw = entry as Record<string, unknown>
    const license = raw.license as Record<string, unknown> | null
    return {
      fullName: asString(raw.full_name) ?? 'unknown',
      description: asString(raw.description),
      stars: asNumber(raw.stargazers_count),
      forks: asNumber(raw.forks_count),
      openIssues: asNumber(raw.open_issues_count),
      language: asString(raw.language),
      license: license !== null && typeof license === 'object' ? asString(license.spdx_id) : null,
      updatedAt: asString(raw.updated_at),
      htmlUrl: asString(raw.html_url) ?? '',
    }
  }

  private parseRepoHit(entry: unknown): GitHubRepoHit {
    const raw = entry as Record<string, unknown>
    return {
      fullName: asString(raw.full_name) ?? 'unknown',
      description: asString(raw.description),
      stars: asNumber(raw.stargazers_count),
      language: asString(raw.language),
      updatedAt: asString(raw.updated_at),
      htmlUrl: asString(raw.html_url) ?? '',
    }
  }
}
