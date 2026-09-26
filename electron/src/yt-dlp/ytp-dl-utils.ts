import os from "os"

export const checkSystemPlatform = () => {
  try {
    const systemPlatform = os.platform()
    switch (systemPlatform) {
      case "win32":
        return "win"
        break;
      case "darwin":
        return "macOS"
        break
      case "linux":
        // must install aria2 by user
        return "linux"
        break
      default:
        throw new Error(`Unsupported platform: ${systemPlatform}`)
    }
  }
  catch (error) {
    console.error(error)
  }
}


