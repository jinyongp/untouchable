import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'

function parseVersion(jsonText: string): string {
  try {
    const parsed = JSON.parse(jsonText) as { version?: unknown }
    return typeof parsed.version === 'string' ? parsed.version : ''
  }
  catch {
    return ''
  }
}

function readCurrentPackage() {
  const content = readFileSync('package.json', 'utf8')
  try {
    const parsed = JSON.parse(content) as { name?: unknown, version?: unknown }
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      version: typeof parsed.version === 'string' ? parsed.version : '',
    }
  }
  catch {
    return {
      name: '',
      version: '',
    }
  }
}

function readPreviousVersion(beforeRef: string): string {
  if (!beforeRef || /^0+$/.test(beforeRef)) return ''

  try {
    const content = execFileSync('git', ['show', `${beforeRef}:package.json`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseVersion(content)
  }
  catch {
    return ''
  }
}

function readPublishedVersion(packageName: string): string {
  if (!packageName) return ''

  try {
    const raw = execFileSync('npm', ['view', packageName, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    if (!raw) return ''

    try {
      const parsed = JSON.parse(raw) as unknown

      if (typeof parsed === 'string') return parsed
      if (Array.isArray(parsed)) {
        const last = parsed[parsed.length - 1]
        return typeof last === 'string' ? last : ''
      }
      return ''
    }
    catch {
      return raw
    }
  }
  catch {
    return ''
  }
}

function writeOutputs(outputs: Record<string, string>): void {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${String(value).replace(/\n/g, ' ')}`)
  const body = `${lines.join('\n')}\n`

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, body)
    return
  }

  process.stdout.write(body)
}

const eventName = process.env.GITHUB_EVENT_NAME ?? ''
const beforeRef = process.env.GITHUB_EVENT_BEFORE ?? ''

const pkg = readCurrentPackage()
const packageName = pkg.name
const afterVersion = pkg.version
const beforeVersion = eventName === 'workflow_dispatch'
  ? ''
  : readPreviousVersion(beforeRef)
const publishedVersion = readPublishedVersion(packageName)

const changedByGit = eventName === 'workflow_dispatch'
  ? false
  : Boolean(afterVersion) && beforeVersion !== afterVersion
const hasPublishedVersion = Boolean(publishedVersion)
const alreadyPublished = Boolean(afterVersion) && afterVersion === publishedVersion

let changed = 'false'
if (eventName === 'workflow_dispatch') {
  if (afterVersion && hasPublishedVersion && !alreadyPublished) {
    changed = 'true'
  }
}
else if (changedByGit && !alreadyPublished) {
  changed = 'true'
}

let reason = 'ready to publish'
if (!afterVersion) {
  reason = 'package.json version is empty'
}
else if (eventName === 'workflow_dispatch' && !hasPublishedVersion) {
  reason = 'cannot verify npm published version in workflow_dispatch; skip for safety'
}
else if (alreadyPublished) {
  reason = `version ${afterVersion} is already published on npm`
}
else if (eventName !== 'workflow_dispatch' && !changedByGit) {
  reason = 'package.json version did not change in this push'
}

console.log(`[release-check] event=${eventName}`)
console.log(`[release-check] package=${packageName}`)
console.log(`[release-check] before_version=${beforeVersion || '(none)'}`)
console.log(`[release-check] after_version=${afterVersion || '(none)'}`)
console.log(`[release-check] published_version=${publishedVersion || '(unknown)'}`)
console.log(`[release-check] changed_by_git=${changedByGit}`)
console.log(`[release-check] should_publish=${changed}`)
console.log(`[release-check] reason=${reason}`)

writeOutputs({
  package_name: packageName,
  before_version: beforeVersion,
  after_version: afterVersion,
  published_version: publishedVersion,
  changed_by_git: changedByGit ? 'true' : 'false',
  changed,
  reason,
})
