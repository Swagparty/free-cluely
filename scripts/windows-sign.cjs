const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { Readable } = require("node:stream")
const { pipeline } = require("node:stream/promises")
const { createWriteStream } = require("node:fs")
const { randomUUID } = require("node:crypto")

const ESIGNER_ZIP_URL =
  "https://github.com/SSLcom/CodeSignTool/releases/download/v1.3.2/CodeSignTool-v1.3.2.zip"

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function findFile(rootDir, predicate) {
  if (!rootDir || !fs.existsSync(rootDir)) return null
  const stack = [rootDir]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (predicate(entry.name, full)) return full
    }
  }
  return null
}

function findJar(rootDir) {
  return findFile(rootDir, (name) => /code_sign_tool-.*\.jar$/i.test(name) || name === "code_sign_tool.jar")
}

function findBat(rootDir) {
  return findFile(rootDir, (name) => /^CodeSignTool\.bat$/i.test(name))
}

async function ensureCodeSignToolDir() {
  if (process.env.CODESIGNTOOL_DIR && fs.existsSync(process.env.CODESIGNTOOL_DIR)) {
    return process.env.CODESIGNTOOL_DIR
  }

  const cacheDir = path.join(process.cwd(), ".codesigntool")
  if (findJar(cacheDir)) return cacheDir

  fs.mkdirSync(cacheDir, { recursive: true })
  const zipPath = path.join(os.tmpdir(), `codesigntool-${randomUUID()}.zip`)
  console.log(`[sign] Downloading CodeSignTool from ${ESIGNER_ZIP_URL}`)
  const res = await fetch(ESIGNER_ZIP_URL)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download CodeSignTool: ${res.status} ${res.statusText}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath))
  console.log(`[sign] Downloaded ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB`)

  const expand = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${cacheDir.replace(/'/g, "''")}' -Force`
    ],
    { encoding: "utf8" }
  )
  if (expand.status !== 0) {
    console.error(expand.stdout || "")
    console.error(expand.stderr || "")
    throw new Error(`Expand-Archive failed with code ${expand.status}`)
  }
  fs.unlinkSync(zipPath)

  if (!findJar(cacheDir)) {
    throw new Error(`CodeSignTool jar not found under ${cacheDir}`)
  }
  return cacheDir
}

function runCodeSignTool(toolDir, args) {
  const jar = findJar(toolDir)
  if (!jar) {
    throw new Error(`CodeSignTool jar not found under ${toolDir}`)
  }
  console.log(`[sign] Using java -jar ${jar}`)
  console.log(`[sign] Args: ${args.map((a) => (a.startsWith("-password=") || a.startsWith("-totp_secret=") ? a.split("=")[0] + "=***" : a)).join(" ")}`)
  const result = spawnSync("java", ["-jar", jar, ...args], {
    encoding: "utf8",
    cwd: path.join(path.dirname(jar), ".."),
    env: process.env,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  })

  if (result.stdout) console.log(result.stdout)
  if (result.stderr) console.error(result.stderr)
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`CodeSignTool exited with code ${result.status}`)
  }
  const combined = `${result.stdout || ""}\n${result.stderr || ""}`
  if (combined.split(/\r?\n/).some((line) => /^Error:/i.test(line.trim()))) {
    throw new Error("CodeSignTool reported Error: in output")
  }
}

module.exports = async function sign(configuration) {
  const filePath = configuration.path
  console.log(`[sign] Signing ${filePath}`)

  const username = requiredEnv("SSL_COM_ESIGNER_USERNAME")
  const password = requiredEnv("SSL_COM_ESIGNER_PASSWORD")
  const credentialId = requiredEnv("SSL_COM_ESIGNER_CREDENTIAL_ID")
  const totpSecret = requiredEnv("SSL_COM_ESIGNER_TOTP_SECRET")

  const toolDir = await ensureCodeSignToolDir()
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mona-sign-"))
  try {
    runCodeSignTool(toolDir, [
      "sign",
      `-username=${username}`,
      `-password=${password}`,
      `-credential_id=${credentialId}`,
      `-totp_secret=${totpSecret}`,
      `-input_file_path=${filePath}`,
      `-output_dir_path=${outDir}`,
      "-override=true"
    ])
    const signed = path.join(outDir, path.basename(filePath))
    if (!fs.existsSync(signed)) {
      const files = fs.readdirSync(outDir)
      throw new Error(`Signed file missing at ${signed}. Output dir: ${files.join(", ") || "(empty)"}`)
    }
    fs.copyFileSync(signed, filePath)
    console.log(`[sign] Signed ${path.basename(filePath)}`)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
}
