#!/usr/bin/env node
// Finds public repos that a coding agent wrote (Claude Code, Cursor, Codex and the like) and checks each one.
// A candidate comes from a GitHub search or from a list of repo names you pass in. It is kept as "agent" only
// when the repo itself carries a hard sign, not just a claim:
//   - it was created in 2025 or later (the agent era), and is not a fork
//   - it has a web interface: five or more markup or style files
//   - an agent signature is on 30% or more of its last 100 commits, or the tree holds an agent instruction file
// Needs the GitHub CLI (gh), signed in. Zero dependencies. Node 22+.
//
//   node research/find-agent-repos.mjs <out.json> [extra-repos.txt] [--no-search]
//
// extra-repos.txt holds one owner/name per line, optionally followed by a tab and where it came from.

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

const run = promisify(execFile);
const gh = async (args) => { try { return (await run('gh', args, { maxBuffer: 1 << 27 })).stdout; } catch { return ''; } };
const [outFile, extraFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const search = !process.argv.includes('--no-search');   // --no-search checks only the repos in the extra list
if (!outFile) { console.error('usage: find-agent-repos.mjs <out.json> [extra-repos.txt] [--no-search]'); process.exit(2); }

// Agent signatures in a commit: a trailer, a generated-by line, or a bot author.
const SIGN = /co-authored-by:[^\n]*(claude|cursor|codex|copilot|devin|gemini|aider|windsurf|opencode|amp\b|jules)|generated with \[?claude code|\bclaude code\b[^\n]*<noreply@anthropic|🤖 generated|aider:|cursoragent/i;
const BOT = /^(claude(\[bot\])?|cursoragent|cursor\[bot\]|devin-ai-integration\[bot\]|copilot-swe-agent\[bot\]|google-labs-jules\[bot\]|codex(\[bot\])?|openhands-agent|sweep-ai\[bot\]|lovable-dev\[bot\]|gpt-engineer-app\[bot\])$/i;
const AGENT_FILE = /(^|\/)(CLAUDE\.md|AGENTS\.md|GEMINI\.md|\.cursorrules|\.windsurfrules|\.clinerules|copilot-instructions\.md)$|(^|\/)\.(claude|cursor|kiro|codex)\//;
const UI = /\.(tsx|jsx|vue|svelte|astro|html|css|scss)$/;

const repoQueries = [
  ...['claude-code', 'vibe-coding', 'vibecoding', 'vibe-coded', 'built-with-claude', 'ai-generated', 'cursor-ai', 'codex'].flatMap((t) => [['--topic', t, '--language', 'TypeScript'], ['--topic', t, '--language', 'JavaScript']]),
  ...['vibe coded', 'vibecoded', 'built with claude code', 'built with cursor', 'written by claude', 'made with claude code', 'built entirely with ai', 'built with codex'].map((q) => [q, '--match', 'description,readme']),
];
const codeQueries = ['tailwind', 'react', 'next.js', 'vite', 'svelte', 'vue', 'shadcn', 'frontend'].map((q) => [q, '--filename', 'CLAUDE.md']);

const names = new Map();   // lowercase name -> where it came from
const note = (n, from, meta) => { if (/^[\w.-]+\/[\w.-]+$/.test(n) && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), { repo: n, from, meta }); };
const FIELDS = 'fullName,createdAt,pushedAt,stargazersCount,size,language,homepage,isFork,isArchived,defaultBranch';
if (search) for (const q of repoQueries) {   // the search result carries the repo facts, which saves one API call per repo
  let list = []; try { list = JSON.parse(await gh(['search', 'repos', ...q, '--created', '>2025-01-01', '--stars', '>=3', '--sort', 'stars', '--limit', '80', '--json', FIELDS])); } catch {}
  for (const m of list) note(m.fullName, 'github search', { full_name: m.fullName, created_at: m.createdAt, pushed_at: m.pushedAt, stargazers_count: m.stargazersCount, size: m.size, language: m.language, homepage: m.homepage, fork: m.isFork, archived: m.isArchived, default_branch: m.defaultBranch });
}
if (search) for (const q of codeQueries) for (const n of (await gh(['search', 'code', ...q, '--limit', '100', '--json', 'repository', '--jq', '.[].repository.nameWithOwner'])).split('\n')) note(n.trim(), 'CLAUDE.md search');
if (extraFile) for (const l of readFileSync(extraFile, 'utf8').split(/\r?\n/)) { const [n, from] = l.split('\t'); note((n || '').trim(), from || 'list'); }
console.error(`${names.size} candidates`);

async function check(c) {
  let { meta, ...rest } = c;
  if (!meta) { try { meta = JSON.parse(await gh(['api', `repos/${c.repo}`])); } catch { return { ...rest, error: 'not found' }; } }
  if (!meta.full_name) return { ...rest, error: 'not found' };
  const out = { ...rest, repo: meta.full_name, created: (meta.created_at || '').slice(0, 10), pushed: (meta.pushed_at || '').slice(0, 10), stars: meta.stargazers_count, sizeKB: meta.size, language: meta.language, homepage: meta.homepage || null, fork: meta.fork };
  if (meta.fork || meta.archived || out.created < '2025-01-01') return { ...out, keep: false, why: meta.fork ? 'fork' : meta.archived ? 'archived' : 'created before 2025' };
  let tree = []; try { tree = JSON.parse(await gh(['api', `repos/${meta.full_name}/git/trees/${meta.default_branch}?recursive=1`])).tree.map((t) => t.path); } catch {}
  out.ui = tree.filter((p) => UI.test(p) && !/(^|\/)(node_modules|dist|build|vendor)\//.test(p)).length;
  out.agentFiles = [...new Set(tree.filter((p) => AGENT_FILE.test(p)).map((p) => p.match(AGENT_FILE)[0].replace(/^\//, '').replace(/\/$/, '')))].slice(0, 6);
  if (out.ui < 5) return { ...out, keep: false, why: `${out.ui} markup or style files` };
  let commits = []; try { commits = JSON.parse(await gh(['api', `repos/${meta.full_name}/commits?per_page=100`])); } catch {}
  out.commits = commits.length;
  out.agentCommits = commits.filter((k) => SIGN.test(k.commit?.message || '') || BOT.test(k.author?.login || '') || BOT.test(k.commit?.author?.name || '')).length;
  out.agentShare = commits.length ? +(out.agentCommits / commits.length).toFixed(2) : 0;
  const bySign = commits.length >= 10 && out.agentShare >= 0.3;
  out.keep = bySign || out.agentFiles.length > 0;
  out.why = bySign ? `agent signature on ${Math.round(out.agentShare * 100)}% of the last ${commits.length} commits` : out.agentFiles.length ? `agent file: ${out.agentFiles.join(', ')}` : 'no agent signature or agent file';
  return out;
}

const queue = [...names.values()], results = [];
await Promise.all(Array.from({ length: 8 }, async () => { for (let c; (c = queue.shift());) results.push(await check(c)); }));
results.sort((a, b) => (b.agentShare || 0) - (a.agentShare || 0) || (b.stars || 0) - (a.stars || 0));
writeFileSync(outFile, JSON.stringify(results, null, 1));
const kept = results.filter((r) => r.keep);
console.error(`${kept.length} kept of ${results.length}: ${kept.filter((r) => r.agentShare >= 0.3).length} by commit signature, ${kept.filter((r) => r.homepage).length} with a homepage`);
