const { spawnSync } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

function requiredEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return String(value).trim()
}

function findJar(rootDir) {
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
      else if (/code_sign_tool-.*\.jar$/i.test(entry.name)) return full
    }
  }
  return null
}

function sha512File(filePath) {
  return crypto.createHash("sha512").update(fs.readFileSync(filePath)).digest("base64")
}

function signFile(jar, filePath) {
  const username = requiredEnv("SSL_COM_ESIGNER_USERNAME")
  const password = requiredEnv("SSL_COM_ESIGNER_PASSWORD")
  const credentialId = requiredEnv("SSL_COM_ESIGNER_CREDENTIAL_ID")
  const totpSecret = requiredEnv("SSL_COM_ESIGNER_TOTP_SECRET")
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "mona-sign-"))
  try {
    console.log(`Signing ${filePath}`)
    const args = [
      "-jar",
      jar,
      "sign",
      `-username=${username}`,
      `-password=${password}`,
      `-credential_id=${credentialId}`,
      `-totp_secret=${totpSecret}`,
      `-input_file_path=${filePath}`,
      `-output_dir_path=${outDir}`,
      "-override=true"
    ]
    console.log(
      `java ${args
        .map((a) =>
          a.startsWith("-password=") || a.startsWith("-totp_secret=")
            ? `${a.split("=")[0]}=***`
            : a
        )
        .join(" ")}`
    )
    const result = spawnSync("java", args, {
      encoding: "utf8",
      cwd: path.join(path.dirname(jar), ".."),
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
    const signed = path.join(outDir, path.basename(filePath))
    if (!fs.existsSync(signed)) {
      throw new Error(
        `Signed output missing: ${signed}. Dir=${fs.readdirSync(outDir).join(", ") || "(empty)"}`
      )
    }
    fs.copyFileSync(signed, filePath)
    console.log(`Signed OK: ${path.basename(filePath)}`)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
}

function updateLatestYml(releaseDir, exePath) {
  const ymlPath = path.join(releaseDir, "latest.yml")
  if (!fs.existsSync(ymlPath)) {
    console.warn("latest.yml not found; skip hash update")
    return
  }
  const raw = fs.readFileSync(ymlPath, "utf8")
  const versionMatch = raw.match(/^version:\s*(.+)$/m)
  const dateMatch = raw.match(/^releaseDate:\s*(.+)$/m)
  const version = versionMatch ? versionMatch[1].trim() : "0.0.0"
  const releaseDate = dateMatch ? dateMatch[1].trim() : `'${new Date().toISOString()}'`
  const size = fs.statSync(exePath).size
  const sha512 = sha512File(exePath)
  const fileName = path.basename(exePath)
  const next = [
    `version: ${version}`,
    "files:",
    `  - url: ${fileName}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${fileName}`,
    `sha512: ${sha512}`,
    `releaseDate: ${releaseDate}`,
    ""
  ].join("\n")
  fs.writeFileSync(ymlPath, next, "utf8")
  console.log(`Updated ${ymlPath} for ${fileName}`)
}

function pickSetupExe(releaseDir) {
  const names = fs.readdirSync(releaseDir)
  console.log(`release files: ${names.join(" | ")}`)
  const preferred = names.filter((name) => /^MonaLive-Setup-.*\.exe$/i.test(name))
  if (preferred.length) return preferred.map((n) => path.join(releaseDir, n))
  const fallback = names.filter(
    (name) =>
      /\.exe$/i.test(name) &&
      !/uninstall/i.test(name) &&
      !/\.blockmap$/i.test(name)
  )
  return fallback.map((n) => path.join(releaseDir, n))
}

function main() {
  try {
    console.log("=== sign-release.cjs starting ===")
    console.log(`Node version: ${process.version}`)
    console.log(`Platform: ${process.platform}`)
    const releaseDir = path.resolve(process.cwd(), "release")
    const toolDir = process.env.CODESIGNTOOL_DIR || path.resolve(process.cwd(), ".codesigntool")
    console.log(`cwd=${process.cwd()}`)
    console.log(`CODESIGNTOOL_DIR env=${process.env.CODESIGNTOOL_DIR || "(not set)"}`)
    console.log(`toolDir resolved=${toolDir}`)
    console.log(`toolDir exists=${fs.existsSync(toolDir)}`)
    console.log(`releaseDir=${releaseDir} exists=${fs.existsSync(releaseDir)}`)

    if (fs.existsSync(toolDir)) {
      console.log(`toolDir contents: ${fs.readdirSync(toolDir).join(", ")}`)
    }
    const jar = findJar(toolDir)
    if (!jar) throw new Error(`CodeSignTool jar not found in ${toolDir}`)
    console.log(`Using jar ${jar}`)

    const envNames = ["SSL_COM_ESIGNER_USERNAME", "SSL_COM_ESIGNER_PASSWORD", "SSL_COM_ESIGNER_CREDENTIAL_ID", "SSL_COM_ESIGNER_TOTP_SECRET"]
    for (const name of envNames) {
      const val = process.env[name]
      console.log(`${name}: ${val ? `set (len=${val.length})` : "NOT SET"}`)
    }

    const totp = requiredEnv("SSL_COM_ESIGNER_TOTP_SECRET")
    console.log(`TOTP secret length=${totp.length}`)

    if (!fs.existsSync(releaseDir)) {
      throw new Error(`release dir missing: ${releaseDir}`)
    }

    const exes = pickSetupExe(releaseDir)
    if (!exes.length) throw new Error(`No setup .exe found in ${releaseDir}`)

    for (const exe of exes) {
      signFile(jar, exe)
      updateLatestYml(releaseDir, exe)
      const blockmap = `${exe}.blockmap`
      if (fs.existsSync(blockmap)) {
        fs.unlinkSync(blockmap)
        console.log(`Removed stale ${path.basename(blockmap)}`)
      }
    }
  } catch (err) {
    console.error("SIGN FAILED:", err && err.stack ? err.stack : err)
    process.exit(1)
  }
}

main()
