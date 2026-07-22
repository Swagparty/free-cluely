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
  return value
}

function findJar(rootDir) {
  if (!fs.existsSync(rootDir)) return null
  const stack = [rootDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (/code_sign_tool-.*\.jar$/i.test(entry.name) || entry.name === "code_sign_tool.jar") {
        return full
      }
    }
  }
  return null
}

async function ensureCodeSignTool() {
  const cacheDir = path.join(process.cwd(), ".codesigntool")
  const existing = findJar(cacheDir) || findJar(path.join(process.cwd(), "node_modules", "electron-builder-ssl-com-esigner", "esigner"))
  if (existing) return existing

  fs.mkdirSync(cacheDir, { recursive: true })
  const zipPath = path.join(os.tmpdir(), `codesigntool-${randomUUID()}.zip`)
  console.log(`Downloading CodeSignTool from ${ESIGNER_ZIP_URL}`)
  const res = await fetch(ESIGNER_ZIP_URL)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download CodeSignTool: ${res.status} ${res.statusText}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath))

  const { execFileSync } = require("node:child_process")
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${cacheDir.replace(/'/g, "''")}' -Force`
  ], { stdio: "inherit" })
  fs.unlinkSync(zipPath)

  const jar = findJar(cacheDir)
  if (!jar) {
    throw new Error("CodeSignTool jar not found after download")
  }
  return jar
}

function runJava(jar, args) {
  const result = spawnSync("java", ["-jar", jar, ...args], {
    encoding: "utf8",
    cwd: path.dirname(jar),
    env: process.env,
    maxBuffer: 10 * 1024 * 1024
  })
  if (result.stdout) console.log(result.stdout)
  if (result.stderr) console.error(result.stderr)
  if (result.status !== 0) {
    throw new Error(`CodeSignTool exited with code ${result.status}`)
  }
  const combined = `${result.stdout || ""}\n${result.stderr || ""}`
  if (combined.split(/\r?\n/).some((line) => line.startsWith("Error:"))) {
    throw new Error("CodeSignTool reported Error: in output")
  }
}

module.exports = async function sign(configuration) {
  const filePath = configuration.path
  console.log(`Signing ${filePath} with SSL.com eSigner`)

  const username = requiredEnv("SSL_COM_ESIGNER_USERNAME")
  const password = requiredEnv("SSL_COM_ESIGNER_PASSWORD")
  const credentialId = requiredEnv("SSL_COM_ESIGNER_CREDENTIAL_ID")
  const totpSecret = requiredEnv("SSL_COM_ESIGNER_TOTP_SECRET")

  const jar = await ensureCodeSignTool()
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mona-sign-"))
  try {
    runJava(jar, [
      "sign",
      `-username=${username}`,
      `-password=${password}`,
      `-credential_id=${credentialId}`,
      `-totp_secret=${totpSecret}`,
      `-input_file_path=${filePath}`,
      `-output_dir_path=${outDir}`
    ])
    const signed = path.join(outDir, path.basename(filePath))
    if (!fs.existsSync(signed)) {
      throw new Error(`Signed file not found at ${signed}`)
    }
    fs.copyFileSync(signed, filePath)
    console.log(`Signed ${path.basename(filePath)}`)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
}
