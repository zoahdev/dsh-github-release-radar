/**
 * GitHub Release Radar — a DeepSeek Harness plugin.
 *
 * Registers three model-facing tools over the public GitHub REST API:
 * `github_releases`, `github_repo`, and `github_search`. Everything is
 * configurable through cordis.yml and every request honors cancellation.
 * @module dsh-github-release-radar
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { GitHubClient, type GitHubClientOptions, type GitHubRelease, type GitHubRepo, type GitHubRepoHit } from './github.js'

export const name = 'github-release-radar'

/** Services required by this plugin. */
export const inject = ['tools']

/** Plugin configuration supplied through cordis.yml. */
export interface Config {
  /** Optional GitHub token; raises the anonymous 60 requests/hour limit. */
  githubToken?: string
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number
  /** Default release/search result count when the model omits `limit`. Defaults to 5. */
  defaultLimit?: number
  /** Maximum characters kept from a release body preview. Defaults to 500. */
  bodyPreviewChars?: number
  /** User-Agent header sent to the GitHub API. */
  userAgent?: string
}

/** Schemastery schema with defaults for every configurable value. */
export const Config: Schema<Config> = Schema.object({
  githubToken: Schema.string(),
  timeoutMs: Schema.number().default(10_000),
  defaultLimit: Schema.number().default(5),
  bodyPreviewChars: Schema.number().default(500),
  userAgent: Schema.string().default('dsh-github-release-radar/0.1.0'),
})

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`github-release-radar: ${name} must be a positive integer (got ${value})`)
  }
}

function assertOwnerRepo(owner: string, repo: string): void {
  if (owner.trim() === '' || repo.trim() === '') {
    throw new Error('github-release-radar: `owner` and `repo` must be non-empty strings')
  }
}

function clampLimit(value: number): number {
  return Math.min(Math.max(Math.trunc(value), 1), 50)
}

function renderReleases(value: { fullName: string; releases: GitHubRelease[] }): string {
  if (value.releases.length === 0) return `No releases found for ${value.fullName}.`
  const lines = value.releases.map((release) => {
    const date = release.publishedAt !== null ? release.publishedAt.slice(0, 10) : 'unknown date'
    const flag = release.prerelease ? ' [prerelease]' : ''
    return `- ${release.tagName} (${date})${flag} ${release.htmlUrl}`
  })
  return `Recent releases for ${value.fullName}:\n${lines.join('\n')}`
}

function renderRepo(repo: GitHubRepo): string {
  return [
    `${repo.fullName} — ${repo.description ?? 'no description'}`,
    `Stars: ${repo.stars} · Forks: ${repo.forks} · Open issues: ${repo.openIssues}`,
    `Language: ${repo.language ?? 'n/a'} · License: ${repo.license ?? 'n/a'} · Updated: ${repo.updatedAt?.slice(0, 10) ?? 'n/a'}`,
    repo.htmlUrl,
  ].join('\n')
}

function renderSearch(value: { query: string; items: GitHubRepoHit[] }): string {
  if (value.items.length === 0) return `No repositories matched "${value.query}".`
  const lines = value.items.map((item, index) => {
    return `${index + 1}. ${item.fullName} (★${item.stars}) — ${item.description ?? 'no description'} ${item.htmlUrl}`
  })
  return `Top results for "${value.query}":\n${lines.join('\n')}`
}

function clientOptions(config: Config): GitHubClientOptions {
  const options: GitHubClientOptions = {
    userAgent: config.userAgent ?? 'dsh-github-release-radar/0.1.0',
    timeoutMs: config.timeoutMs ?? 10_000,
    bodyPreviewChars: config.bodyPreviewChars ?? 500,
  }
  if (config.githubToken !== undefined && config.githubToken !== '') options.token = config.githubToken
  return options
}

/**
 * Build the three tool definitions for a configured client.
 * Exported separately so tests can exercise the definitions without a Context.
 */
export function defineTools(config: Config) {
  const client = new GitHubClient(clientOptions(config))

  const releases = defineTool({
    name: 'github_releases',
    description:
      'List the most recent releases of a public GitHub repository. Use it for release notes, '
      + 'version checks, upgrade planning, and dependency updates. Returns tag, name, publication '
      + 'date, pre-release flag, URL, and a body preview for each release.',
    parameters: {
      owner: { type: 'string', required: true, description: 'Repository owner (user or organization), e.g. deepseek-ai.' },
      repo: { type: 'string', required: true, description: 'Repository name, e.g. deepseek-harness.' },
      limit: { type: 'number', description: 'How many releases to return (1-50). Defaults to the configured defaultLimit (5).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          fullName: { type: 'string', required: true },
          releases: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                tagName: { type: 'string', required: true },
                name: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                publishedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                prerelease: { type: 'boolean', required: true },
                htmlUrl: { type: 'string', required: true },
                bodyPreview: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderReleases(value) }],
    },
    async execute(args, exec) {
      assertOwnerRepo(args.owner, args.repo)
      const releases = await client.listReleases(args.owner, args.repo, clampLimit(args.limit ?? config.defaultLimit ?? 5), exec.signal)
      return { fullName: `${args.owner}/${args.repo}`, releases }
    },
    presentCall: (args) => ({ card: 'generic', title: `GitHub releases: ${args.owner}/${args.repo}`, kind: 'search', rawInput: args }),
  })

  const repo = defineTool({
    name: 'github_repo',
    description:
      'Get the current overview of a public GitHub repository: star count, forks, open issues, '
      + 'primary language, license, description, and last update time. Use it to evaluate a '
      + 'project or answer questions about repository health.',
    parameters: {
      owner: { type: 'string', required: true, description: 'Repository owner (user or organization), e.g. deepseek-ai.' },
      repo: { type: 'string', required: true, description: 'Repository name, e.g. deepseek-harness.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          fullName: { type: 'string', required: true },
          description: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          stars: { type: 'integer', required: true },
          forks: { type: 'integer', required: true },
          openIssues: { type: 'integer', required: true },
          language: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          license: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          updatedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
          htmlUrl: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderRepo(value) }],
    },
    async execute(args, exec) {
      assertOwnerRepo(args.owner, args.repo)
      return await client.getRepo(args.owner, args.repo, exec.signal)
    },
    presentCall: (args) => ({ card: 'generic', title: `GitHub repo: ${args.owner}/${args.repo}`, kind: 'search', rawInput: args }),
  })

  const search = defineTool({
    name: 'github_search',
    description:
      'Search public GitHub repositories with GitHub search syntax (for example `agent framework language:typescript`). '
      + 'Returns repositories sorted by stars or last update. Use it to discover projects, compare options, or find alternatives.',
    parameters: {
      query: { type: 'string', required: true, description: 'GitHub search query, e.g. `deepseek harness`.' },
      limit: { type: 'number', description: 'How many results to return (1-50). Defaults to the configured defaultLimit (5).' },
      sort: { type: 'string', enum: ['stars', 'updated'], description: 'Sort criterion; defaults to stars.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', required: true },
          items: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                fullName: { type: 'string', required: true },
                description: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                stars: { type: 'integer', required: true },
                language: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                updatedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true },
                htmlUrl: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderSearch(value) }],
    },
    async execute(args, exec) {
      if (args.query.trim() === '') throw new Error('github-release-radar: `query` must be a non-empty string')
      const items = await client.searchRepos(args.query, clampLimit(args.limit ?? config.defaultLimit ?? 5), args.sort ?? 'stars', exec.signal)
      return { query: args.query, items }
    },
    presentCall: (args) => ({ card: 'generic', title: `GitHub search: ${args.query}`, kind: 'search', rawInput: args }),
  })

  return [releases, repo, search] as const
}

/**
 * Register the plugin tools on the tool registry.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - validated plugin configuration.
 */
export function apply(ctx: Context, config: Config): void {
  assertPositiveInteger('timeoutMs', config.timeoutMs ?? 10_000)
  assertPositiveInteger('defaultLimit', config.defaultLimit ?? 5)
  assertPositiveInteger('bodyPreviewChars', config.bodyPreviewChars ?? 500)
  for (const tool of defineTools(config)) {
    ctx.tools.register(tool)
  }
}
