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

function readCurrentVersion(): string {
  const content = readFileSync('package.json', 'utf8')
  return parseVersion(content)
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

function writeOutputs(outputs: Record<string, string>): void {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`)
  const body = `${lines.join('\n')}\n`

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, body)
    return
  }

  process.stdout.write(body)
}

const eventName = process.env.GITHUB_EVENT_NAME ?? ''
const beforeRef = process.env.GITHUB_EVENT_BEFORE ?? ''

const afterVersion = readCurrentVersion()
const beforeVersion = eventName === 'workflow_dispatch'
  ? ''
  : readPreviousVersion(beforeRef)

const changed = eventName === 'workflow_dispatch'
  ? 'true'
  : Boolean(afterVersion) && beforeVersion !== afterVersion
    ? 'true'
    : 'false'

writeOutputs({
  before_version: beforeVersion,
  after_version: afterVersion,
  changed,
})
