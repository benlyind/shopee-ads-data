import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://seller.shopee.co.id/*"],
  run_at: "document_idle"
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookiesAndStorage") {
    // Get all cookies from document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key) acc[key] = value
      return acc
    }, {} as Record<string, string>)

    // Get localStorage data
    const localStorage = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        localStorage[key] = window.localStorage.getItem(key)
      }
    }

    // Get SPC_CDS token specifically
    const spcCds = cookies['SPC_CDS'] || ''

    sendResponse({
      cookies,
      localStorage,
      spcCds,
      url: window.location.href
    })
  }
  return true // Keep the message channel open for async response
})

console.log("Shopee content script loaded") 