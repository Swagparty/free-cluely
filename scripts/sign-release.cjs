const { spawnSync } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value.trim()
}

function findJar(rootDir) {
  const stack = [rootDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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
    const result = spawnSync(
      "java",
      [
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
      ],
      {
        encoding: "utf8",
        cwd: path.join(path.dirname(jar), ".."),
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024
      }
    )
    if (result.stdout) console.log(result.stdout)
    if (result.stderr) console.error(result.stderr)
    if (result.status !== 0) {
      throw new Error(`CodeSignTool exited with code ${result.status}`)
    }
    const combined = `${result.stdout || ""}\n${result.stderr || ""}`
    if (combined.split(/\r?\n/).some((line) => /^Error:/i.test(line.trim()))) {
      throw new Error("CodeSignTool reported Error: in output")
    }
    const signed = path.join(outDir, path.basename(filePath))
    if (!fs.existsSync(signed)) {
      throw new Error(`Signed output missing: ${signed}`)
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

function main() {
  const releaseDir = path.resolve(process.cwd(), "release")
  const toolDir = process.env.CODESIGNTOOL_DIR || path.resolve(process.cwd(), ".codesigntool")
  console.log(`CODESIGNTOOL_DIR=${toolDir}`)
  console.log(`releaseDir=${releaseDir}`)
  console.log(`release files=${fs.existsSync(releaseDir) ? fs.readdirSync(releaseDir).join(", ") : "(missing)"}`)

  const jar = findJar(toolDir)
  if (!jar) throw new Error(`CodeSignTool jar not found in ${toolDir}`)
  console.log(`Using jar ${jar}`)

  const totp = requiredEnv("SSL_COM_ESIGNER_TOTP_SECRET")
  console.log(`TOTP secret length=${totp.length}`)

  const exes = fs
    .readdirSync(releaseDir)
    .filter((name) => /^MonaLive-Setup-.*\.exe$/i.test(name))
    .map((name) => path.join(releaseDir, name))

  if (!exes.length) throw new Error(`No MonaLive-Setup-*.exe found in ${releaseDir}`)

  for (const exe of exes) {
    signFile(jar, exe)
    updateLatestYml(releaseDir, exe)
    const blockmap = `${exe}.blockmap`
    if (fs.existsSync(blockmap)) {
      fs.unlinkSync(blockmap)
      console.log(`Removed stale ${path.basename(blockmap)}`)
    }
  }
}

main()
