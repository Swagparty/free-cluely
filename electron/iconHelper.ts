import { nativeImage, NativeImage } from "electron"
import path from "node:path"
import fs from "node:fs"

const PRIMARY_R = 92
const PRIMARY_G = 55
const PRIMARY_B = 223

const PRIMARY_LIGHT_R = 124
const PRIMARY_LIGHT_G = 92
const PRIMARY_LIGHT_B = 231

function createCircleIcon(size: number): NativeImage {
  const buffer = Buffer.alloc(size * size * 4)
  const center = size / 2
  const radius = size / 2 - 1

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2)

      if (dist <= radius) {
        const t = (x + y) / (size * 2)
        buffer[idx] = Math.round(PRIMARY_R + t * (PRIMARY_LIGHT_R - PRIMARY_R))
        buffer[idx + 1] = Math.round(PRIMARY_G + t * (PRIMARY_LIGHT_G - PRIMARY_G))
        buffer[idx + 2] = Math.round(PRIMARY_B + t * (PRIMARY_LIGHT_B - PRIMARY_B))
        buffer[idx + 3] = 255
      } else if (dist <= radius + 1) {
        const alpha = Math.round((radius + 1 - dist) * 255)
        const t = (x + y) / (size * 2)
        buffer[idx] = Math.round(PRIMARY_R + t * (PRIMARY_LIGHT_R - PRIMARY_R))
        buffer[idx + 1] = Math.round(PRIMARY_G + t * (PRIMARY_LIGHT_G - PRIMARY_G))
        buffer[idx + 2] = Math.round(PRIMARY_B + t * (PRIMARY_LIGHT_B - PRIMARY_B))
        buffer[idx + 3] = alpha
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size })
}

export function getAppIcon(): NativeImage {
  const iconPaths = [
    path.join(__dirname, "../assets/icons/png/icon.png"),
    path.join(process.resourcesPath || "", "assets/icons/png/icon.png"),
    path.join(process.resourcesPath || "", "assets/icon.png")
  ]

  for (const iconPath of iconPaths) {
    try {
      if (fs.existsSync(iconPath)) {
        const img = nativeImage.createFromPath(iconPath)
        if (!img.isEmpty()) return img
      }
    } catch {}
  }

  return createCircleIcon(32)
}

export function getTrayIcon(): NativeImage {
  const isMac = process.platform === "darwin"
  const traySize = isMac ? 22 : 16
  
  const trayPaths = [
    path.join(__dirname, "../assets/icons/png/icon.png"),
    path.join(process.resourcesPath || "", "assets/icons/png/icon.png"),
    path.join(process.resourcesPath || "", "assets/icon.png")
  ]

  for (const iconPath of trayPaths) {
    try {
      if (fs.existsSync(iconPath)) {
        const img = nativeImage.createFromPath(iconPath)
        if (!img.isEmpty()) {
          const resized = img.resize({ width: traySize, height: traySize })
          if (isMac) {
            resized.setTemplateImage(true)
          }
          return resized
        }
      }
    } catch {}
  }

  return createCircleIcon(traySize)
}
