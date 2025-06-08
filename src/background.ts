export {}

// Types for Shopee API
interface CampaignQueryRequest {
  start_time: number
  end_time: number
  filter_list: FilterItem[]
  offset: number
  limit: number
}

interface FilterItem {
  campaign_type: string
  state: string
  search_term: string
}

/*
 * Valid Shopee API Payload Analysis:
 * {
 *   "start_time": 1748624400,  // 2025-01-31 00:00:00 UTC+7 (Friday)
 *   "end_time": 1749229199,    // 2025-02-06 23:59:59 UTC+7 (Thursday)
 *   "filter_list": [{
 *     "campaign_type": "new_cpc_homepage",
 *     "state": "all",
 *     "search_term": ""
 *   }],
 *   "offset": 0,
 *   "limit": 20
 * }
 * 
 * IMPORTANT FINDINGS:
 * 1. start_time is at 00:00:00 (beginning of day)
 * 2. end_time is at 23:59:59 (end of day) - NOT 00:00:00!
 * 3. This represents a 7-day range (Jan 31 - Feb 6)
 * 4. The error message was misleading - end_time should be 23:59:59
 */

interface ApiResponse {
  code: number
  msg: string
  debug_detail: string
  validation_error_list: null | any[]
  data: {
    entry_list: any[]
    total: number
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchShopeeData") {
    handleShopeeDataFetch(request.params).then(sendResponse)
    return true // Keep message channel open for async response
  }
  
  if (request.action === "downloadCSV") {
    generateCSVDownload(request.data).then(sendResponse)
    return true
  }
  
  if (request.action === "testSheetDB") {
    chrome.storage.local.get(['sheetDBConfig'], async (result) => {
      if (result.sheetDBConfig?.apiUrl) {
        const testResult = await testSheetDB(result.sheetDBConfig)
        sendResponse(testResult)
      } else {
        sendResponse({ success: false, error: 'SheetDB not configured' })
      }
    })
    return true
  }
})

// Helper function to set time to 00:00:00 (start of day)
function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  date.setHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

// Helper function to set time to 23:59:59 (end of day)
function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  date.setHours(23, 59, 59, 999)
  return Math.floor(date.getTime() / 1000)
}

async function handleShopeeDataFetch(params: {
  startTime: number
  endTime: number
  campaignType: string
  state: string
  offset: number
  limit: number
  fetchMode?: string
  disablePagination?: boolean
  fetchDailyData?: boolean
}) {
  try {
    // Ensure timestamps follow Shopee's format:
    // start_time at 00:00:00, end_time at 23:59:59
    const startTime = getStartOfDay(params.startTime)
    const endTime = getEndOfDay(params.endTime)
    
    console.log('Adjusted timestamps:', {
      original: { start: params.startTime, end: params.endTime },
      adjusted: { start: startTime, end: endTime },
      startDate: new Date(startTime * 1000).toISOString(),
      endDate: new Date(endTime * 1000).toISOString(),
      fetchDailyData: params.fetchDailyData
    })

    // First, get cookies from the Shopee tab
    const tabs = await chrome.tabs.query({ url: "https://seller.shopee.co.id/*" })
    
    if (tabs.length === 0) {
      throw new Error("Please open a Shopee seller tab first")
    }

    // Get cookies and localStorage from content script
    const response = await chrome.tabs.sendMessage(tabs[0].id!, {
      action: "getCookiesAndStorage"
    })

    const { cookies, spcCds } = response

    if (!spcCds) {
      throw new Error("SPC_CDS token not found. Please login to Shopee seller center.")
    }

    // Get all cookies for the domain
    const domainCookies = await chrome.cookies.getAll({ domain: ".shopee.co.id" })
    const cookieString = domainCookies.map(c => `${c.name}=${c.value}`).join('; ')

    let allCampaigns: any[] = []
    
    // Check if we need to fetch daily data
    if (params.fetchDailyData) {
      console.log('Fetching daily breakdown data...')
      
      // Calculate number of days
      const startDate = new Date(startTime * 1000)
      const endDate = new Date(endTime * 1000)
      const currentDate = new Date(startDate)
      
      let dayCount = 0
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      console.log(`Will fetch data for ${totalDays} days`)
      
      // Fetch data for each day
      while (currentDate <= endDate) {
        dayCount++
        const dayStart = getStartOfDay(currentDate.getTime() / 1000)
        const dayEnd = getEndOfDay(currentDate.getTime() / 1000)
        
        console.log(`Fetching data for day ${dayCount}/${totalDays}: ${currentDate.toLocaleDateString('id-ID')}`)
        
        try {
          let dayCampaigns: any[] = []
          
          if (params.campaignType === "") {
            // Fetch all campaign types for this day
            dayCampaigns = await fetchCampaignsByType({
              startTime: dayStart,
              endTime: dayEnd,
              campaignType: "new_cpc_homepage",
              state: "all",
              offset: params.offset,
              limit: params.limit,
              spcCds,
              cookieString,
              disablePagination: params.disablePagination
            })
          } else {
            // Fetch specific campaign type for this day
            dayCampaigns = await fetchCampaignsByType({
              ...params,
              startTime: dayStart,
              endTime: dayEnd,
              spcCds,
              cookieString,
              disablePagination: params.disablePagination
            })
          }
          
          // Add the specific date to each campaign data
          dayCampaigns = dayCampaigns.map(campaign => ({
            ...campaign,
            data_date: currentDate.getTime() / 1000 // Add timestamp for this specific date
          }))
          
          allCampaigns = allCampaigns.concat(dayCampaigns)
          
          console.log(`Day ${dayCount}: Found ${dayCampaigns.length} campaigns`)
          
        } catch (error) {
          console.error(`Failed to fetch data for ${currentDate.toLocaleDateString('id-ID')}:`, error.message)
          // Continue with next day even if one fails
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
        
        // Add delay to avoid rate limiting (1 second between requests)
        if (currentDate <= endDate) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`Daily data fetch complete: Total ${allCampaigns.length} records from ${totalDays} days`)
      
    } else {
      // Original logic for fetching aggregate data
      if (params.campaignType === "") {
        console.log('Fetching all campaigns with single request...')
        
        try {
          allCampaigns = await fetchCampaignsByType({
            startTime,
            endTime,
            campaignType: "new_cpc_homepage",
            state: "all",
            offset: params.offset,
            limit: params.limit,
            spcCds,
            cookieString,
            disablePagination: params.disablePagination
          })
          
          console.log(`Total campaigns fetched: ${allCampaigns.length}`)
        } catch (error) {
          console.error('Failed to fetch campaigns:', error.message)
          throw error
        }
      } else {
        // Fetch specific campaign type
        allCampaigns = await fetchCampaignsByType({
          ...params,
          startTime,
          endTime,
          spcCds,
          cookieString,
          disablePagination: params.disablePagination
        })
      }
    }

    // Get SheetDB configuration from storage
    const config = await chrome.storage.local.get(['sheetDBConfig'])
    if (config.sheetDBConfig?.apiUrl) {
      await sendToSheetDB(allCampaigns, {
        ...config.sheetDBConfig,
        dateRange: {
          start: startTime,
          end: endTime
        }
      })
    }

    // Store the raw data for potential CSV download
    await chrome.storage.local.set({ 
      lastFetchedData: allCampaigns,
      lastFetchedTime: new Date().toISOString(),
      lastFetchedDateRange: {
        start: startTime,
        end: endTime
      }
    })

    return {
      success: true,
      data: {
        entry_list: allCampaigns,
        total: allCampaigns.length
      },
      message: params.fetchDailyData 
        ? `Successfully fetched ${allCampaigns.length} daily records`
        : `Successfully fetched ${allCampaigns.length} campaigns`
    }

  } catch (error) {
    console.error('Error fetching Shopee data:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function fetchCampaignsByType(params: {
  startTime: number
  endTime: number
  campaignType: string
  state: string
  offset: number
  limit: number
  spcCds: string
  cookieString: string
  disablePagination?: boolean
}): Promise<any[]> {
  const apiUrl = `https://seller.shopee.co.id/api/pas/v1/homepage/query/?SPC_CDS=${params.spcCds}&SPC_CDS_VER=2`
  
  const requestBody: CampaignQueryRequest = {
    start_time: params.startTime,
    end_time: params.endTime,
    filter_list: [{
      campaign_type: params.campaignType,
      state: params.state,
      search_term: ""
    }],
    offset: params.offset,
    limit: params.limit
  }

  console.log(`Fetching ${params.campaignType} campaigns, offset: ${params.offset}, limit: ${params.limit}`)

  const apiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://seller.shopee.co.id',
      'Referer': 'https://seller.shopee.co.id/portal/marketing/pas/index/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'Cookie': params.cookieString
    },
    body: JSON.stringify(requestBody)
  })

  if (!apiResponse.ok) {
    throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`)
  }

  const data: ApiResponse = await apiResponse.json()

  if (data.code !== 0) {
    throw new Error(data.msg || 'API Error')
  }

  const currentPage = Math.floor(params.offset / params.limit) + 1
  const totalPages = Math.ceil(data.data.total / params.limit)
  
  console.log(`Page ${currentPage}/${totalPages}: Received ${data.data.entry_list.length} campaigns, total available: ${data.data.total}`)

  // If pagination is disabled or we got all data in one request, return immediately
  if (params.disablePagination || data.data.entry_list.length >= data.data.total) {
    return data.data.entry_list
  }

  // Otherwise, fetch remaining data with pagination
  let allCampaigns = [...data.data.entry_list]
  let currentOffset = params.offset + params.limit
  let pageNumber = currentPage + 1
  
  while (allCampaigns.length < data.data.total) {
    console.log(`Fetching page ${pageNumber}/${totalPages}, offset: ${currentOffset}`)
    
    const nextRequestBody = { ...requestBody, offset: currentOffset }
    
    const nextResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://seller.shopee.co.id',
        'Referer': 'https://seller.shopee.co.id/portal/marketing/pas/index/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'Cookie': params.cookieString
      },
      body: JSON.stringify(nextRequestBody)
    })

    if (!nextResponse.ok) {
      console.error(`Pagination request failed: ${nextResponse.status}`)
      break
    }

    const nextData: ApiResponse = await nextResponse.json()
    
    if (nextData.code !== 0) {
      console.error(`Pagination API error: ${nextData.msg}`)
      break
    }

    const nextCampaigns = nextData.data.entry_list
    if (nextCampaigns.length === 0) {
      break
    }

    console.log(`Page ${pageNumber}: Received ${nextCampaigns.length} campaigns`)
    allCampaigns = allCampaigns.concat(nextCampaigns)
    currentOffset += params.limit
    pageNumber++
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`Pagination complete: Total ${allCampaigns.length} campaigns fetched`)
  return allCampaigns
}

async function sendToSheetDB(campaigns: any[], config: { apiUrl: string, sheetName?: string, dataMode?: string, updateMode?: string, shopName?: string, dateRange?: { start: number, end: number } }) {
  if (!config.apiUrl) {
    throw new Error('SheetDB API URL not configured')
  }

  const dataMode = config.dataMode || 'complete' // Default to complete if not specified
  const updateMode = config.updateMode || 'append' // Default to append if not specified
  const shopName = config.shopName || 'Toko' // Default shop name if not specified

  // Transform campaign data based on mode
  const rows = campaigns.map(entry => {
    const campaign = entry.campaign || {}
    const report = entry.report || {}
    
    // Helper function to format currency (divide by 100,000)
    const formatCurrency = (value: number | undefined) => {
      if (value === undefined || value === null) return '0'
      // Convert to actual currency value
      // All monetary values use 5 decimal places: 100,000 = 1 Rupiah
      const actualValue = value / 100000
      // Return as integer without decimals
      return Math.round(actualValue).toString()
    }
    
    // Helper function to format percentage with comma
    const formatPercentage = (value: number | undefined) => {
      if (value === undefined || value === null) return '0'
      // Already in decimal format (0.369 = 36.9%)
      // Just replace dot with comma
      return value.toString().replace('.', ',')
    }
    
    // Helper function to format ROAS/ROI with comma
    const formatROAS = (value: number | undefined) => {
      if (value === undefined || value === null) return '0'
      // Already in correct format from API
      // Just replace dot with comma
      return value.toString().replace('.', ',')
    }
    
    // Helper function to format date to DD/MM/YYYY
    const formatDate = (timestamp: number | undefined) => {
      if (!timestamp) return ''
      const date = new Date(timestamp * 1000)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    
    // Helper function to translate campaign type
    const translateCampaignType = (type: string) => {
      const typeMap: Record<string, string> = {
        'new_cpc_homepage': 'CPC Homepage',
        'product_manual': 'Iklan Produk Manual',
        'product_auto': 'Iklan Produk Otomatis',
        'product_homepage': 'Iklan Produk Homepage',
        'product_homepage__roi_two__target': 'Iklan Produk ROI Target',
        'product_homepage__roi_two__simple': 'Iklan Produk ROI Simple',
        'shop_manual': 'Iklan Toko Manual',
        'shop_auto': 'Iklan Toko Otomatis',
        'shop_homepage': 'Iklan Toko Homepage',
        'search': 'Iklan Pencarian',
        'search_product': 'Pencarian Produk',
        'search_shop': 'Pencarian Toko',
        'targeting': 'Iklan Target',
        'display': 'Iklan Display',
        'boost_product': 'Boost Produk',
        'boost_auto': 'Boost Otomatis',
        'live_stream': 'Live Stream',
        'video': 'Iklan Video'
      }
      return typeMap[type] || type
    }
    
    // Helper function to translate state
    const translateState = (state: string) => {
      const stateMap: Record<string, string> = {
        'ongoing': 'Aktif',
        'paused': 'Dijeda',
        'ended': 'Selesai',
        'closed': 'Ditutup'
      }
      return stateMap[state] || state
    }
    
    // Helper function to get bidding mode
    const getBiddingMode = (campaign: any, productAds: any) => {
      if (productAds?.bidding_strategy === 'roi_two') return 'ROI Otomatis'
      if (productAds?.bidding_strategy === 'manual') return 'Manual'
      if (productAds?.bidding_strategy) return productAds.bidding_strategy
      return 'Manual'
    }
    
    // Helper function to get placement
    const getPlacement = (productAds: any, shopAds: any) => {
      if (productAds?.product_placement === 'all') return 'Semua'
      if (productAds?.product_placement) return productAds.product_placement
      if (shopAds) return 'Halaman Toko'
      return 'Semua'
    }
    
    // Helper function to get tagline for shop ads
    const getTagline = (shopAds: any) => {
      return shopAds?.tagline || ''
    }
    
    // Simple mode - only basic fields
    if (dataMode === 'simple') {
      return {
        'nama_toko': shopName,
        'campaign_id': String(campaign.campaign_id || entry.campaign_id || ''),
        'nama_iklan': String(entry.title || ''),
        'status': translateState(entry.state || ''),
        'jenis_iklan': translateCampaignType(entry.type || ''),
        'tampilan_iklan': String(report.impression || 0),
        'jumlah_klik': String(report.click || 0),
        'biaya': formatCurrency(report.cost),
        'tanggal_data': formatDate(entry.data_date || config.dateRange?.start),
        'tanggal_ekstrak': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      }
    }
    
    // Complete mode - Indonesian field names matching user requirements
    const row = {
      'nama_toko': shopName,
      'campaign_id': String(campaign.campaign_id || entry.campaign_id || ''),
      'nama_iklan': String(entry.title || ''),
      'status': translateState(entry.state || ''),
      'jenis_iklan': translateCampaignType(entry.type || ''),
      'kode_produk': String(entry.manual_product_ads?.item_id || ''),
      'tagline_toko': getTagline(entry.manual_shop_ads),
      'modal_harian': formatCurrency(campaign.daily_budget),
      'total_budget': formatCurrency(campaign.total_budget),
      'tampilan_iklan': String(report.impression || 0),
      'mode_bidding': getBiddingMode(campaign, entry.manual_product_ads),
      'penempatan_iklan': getPlacement(entry.manual_product_ads, entry.manual_shop_ads),
      'tanggal_mulai': formatDate(campaign.start_time),
      'tanggal_selesai': formatDate(campaign.end_time),
      'tanggal_data': formatDate(entry.data_date || config.dateRange?.start),
      'dilihat': String(report.impression || 0),
      'jumlah_klik': String(report.click || 0),
      'persentase_klik': formatPercentage(report.ctr),
      'konversi': String(report.broad_order || 0),
      'konversi_langsung': String(report.direct_order || 0),
      'tingkat_konversi': formatPercentage(report.cr),
      'tingkat_konversi_langsung': formatPercentage(report.direct_cr),
      'biaya_per_konversi': formatCurrency(report.cpdc),
      'biaya_per_konversi_langsung': formatCurrency(report.cpdc),
      'produk_terjual': String(report.broad_order || 0),
      'terjual_langsung': String(report.direct_order || 0),
      'omzet_penjualan': formatCurrency(report.broad_gmv),
      'penjualan_langsung_gmv_langsung': formatCurrency(report.direct_gmv),
      'biaya': formatCurrency(report.cost),
      'efektifitas_iklan': formatROAS(report.broad_roi),
      'efektivitas_langsung': formatROAS(report.direct_roi),
      'persentase_biaya_iklan_terhadap_penjualan_dari_iklan_acos': formatPercentage(report.broad_cir),
      'persentase_biaya_iklan_terhadap_penjualan_dari_iklan_langsung_acos_langsung': formatPercentage(report.direct_cir),
      'jumlah_produk_dilihat': String(report.product_impression || 0),
      'jumlah_klik_produk': String(report.product_click || 0),
      'persentase_klik_produk': formatPercentage(report.product_ctr),
      'tanggal_ekstrak': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    }
    
    return row
  })

  try {
    // Build base URL with sheet parameter if provided
    let baseUrl = config.apiUrl
    if (config.sheetName) {
      baseUrl += `?sheet=${encodeURIComponent(config.sheetName)}`
    }

    // If replace mode, first delete all existing data
    if (updateMode === 'replace') {
      console.log('=== Replace Mode: Clearing existing data ===')
      
      // SheetDB doesn't have a direct "delete all" endpoint, but we can use a workaround
      // We'll delete all rows by using a condition that matches all rows
      const deleteUrl = baseUrl.includes('?') 
        ? `${baseUrl}&del=true` 
        : `${baseUrl}?del=true`
      
      try {
        // First, get the first row to know what column to use for deletion
        const getUrl = baseUrl
        const getResponse = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
        
        if (getResponse.ok) {
          const existingData = await getResponse.json()
          if (existingData && existingData.length > 0) {
            // Delete all rows by using the first column as reference
            const firstColumn = Object.keys(existingData[0])[0]
            const deleteAllUrl = `${config.apiUrl}/${firstColumn}/*${config.sheetName ? `?sheet=${encodeURIComponent(config.sheetName)}` : ''}`
            
            console.log('Deleting all existing data...')
            const deleteResponse = await fetch(deleteAllUrl, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json'
              }
            })
            
            if (deleteResponse.ok) {
              console.log('✅ Existing data cleared successfully')
            } else {
              console.log('⚠️ Could not clear existing data, will append instead')
            }
          }
        }
      } catch (deleteError) {
        console.log('⚠️ Could not clear existing data:', deleteError.message)
      }
    }

    console.log('=== SheetDB Request Details ===')
    console.log('URL:', baseUrl)
    console.log('Sheet:', config.sheetName || 'default')
    console.log('Data Mode:', dataMode)
    console.log('Update Mode:', updateMode)
    console.log('Number of rows:', rows.length)
    console.log('Sample row (first 5 fields):', Object.entries(rows[0]).slice(0, 5).reduce((acc, [k, v]) => ({...acc, [k]: v}), {}))
    console.log('Total fields per row:', Object.keys(rows[0]).length)

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: rows
      })
    })

    const responseText = await response.text()
    console.log('=== SheetDB Response ===')
    console.log('Status:', response.status)
    console.log('Response body:', responseText)

    if (!response.ok) {
      // Parse error details if possible
      let errorMessage = responseText
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (e) {
        // Use raw text if not JSON
      }
      
      throw new Error(`SheetDB API error: ${response.status} - ${errorMessage}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      result = responseText
    }

    console.log('✅ Success! SheetDB response:', result)
    console.log(`✅ Successfully sent ${rows.length} campaigns with ${Object.keys(rows[0]).length} fields each`)
    return result
    
  } catch (error) {
    console.error('❌ SheetDB Error:', error)
    throw error
  }
}

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}_${key}` : key
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }
  }
  
  return flattened
}

// Generate CSV download
async function generateCSVDownload(campaigns: any[]) {
  try {
    if (!campaigns || campaigns.length === 0) {
      // Try to get from storage
      const stored = await chrome.storage.local.get(['lastFetchedData', 'lastFetchedDateRange'])
      campaigns = stored.lastFetchedData || []
    }
    
    if (campaigns.length === 0) {
      throw new Error('No data available to download')
    }
    
    // Flatten all campaign objects to get all possible fields
    const flattenedCampaigns = campaigns.map(campaign => flattenObject(campaign))
    
    // Get all unique keys
    const allKeys = new Set<string>()
    flattenedCampaigns.forEach(campaign => {
      Object.keys(campaign).forEach(key => allKeys.add(key))
    })
    
    // Sort keys for consistent column order
    const sortedKeys = Array.from(allKeys).sort()
    
    // Create CSV content
    const csvRows = []
    
    // Add headers
    csvRows.push(sortedKeys.join(','))
    
    // Add data rows
    flattenedCampaigns.forEach(campaign => {
      const row = sortedKeys.map(key => {
        const value = campaign[key]
        
        // Handle different value types
        if (value === null || value === undefined) {
          return ''
        } else if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        } else if (typeof value === 'number') {
          // Convert currency values
          if (key.includes('budget') || key.includes('cost') || key.includes('gmv') || key.includes('cpc')) {
            return (value / 100000000).toFixed(2)
          }
          return value.toString()
        } else if (Array.isArray(value)) {
          return `"${JSON.stringify(value)}"`
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value)}"`
        } else {
          return value.toString()
        }
      })
      
      csvRows.push(row.join(','))
    })
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    // Create download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `shopee_campaigns_${timestamp}.csv`
    
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    })
    
    return {
      success: true,
      message: `CSV file generated with ${campaigns.length} campaigns and ${sortedKeys.length} columns`
    }
    
  } catch (error) {
    console.error('Error generating CSV:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Test function for SheetDB - minimal data
async function testSheetDB(config: { apiUrl: string, sheetName?: string, dataMode?: string, updateMode?: string, shopName?: string }) {
  const dataMode = config.dataMode || 'simple'
  const updateMode = config.updateMode || 'append'
  const shopName = config.shopName || 'Toko Test'
  
  // Test data based on mode
  const testData = dataMode === 'simple' ? {
    data: [
      {
        'nama_toko': shopName,
        'campaign_id': '12345',
        'nama_iklan': 'Test Campaign',
        'status': 'Aktif',
        'jenis_iklan': 'Iklan Produk Manual',
        'tampilan_iklan': '1000',
        'jumlah_klik': '50',
        'biaya': '50000',
        'tanggal_data': '07/02/2025',
        'tanggal_ekstrak': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      }
    ]
  } : {
    data: [
      {
        'nama_toko': shopName,
        'campaign_id': '12345',
        'nama_iklan': 'Test Campaign',
        'status': 'Aktif',
        'jenis_iklan': 'Iklan Produk Manual',
        'kode_produk': 'SKU12345',
        'tagline_toko': '',
        'modal_harian': '50000',
        'total_budget': '0',
        'tampilan_iklan': '1000',
        'mode_bidding': 'manual',
        'penempatan_iklan': 'semua',
        'tanggal_mulai': '01/02/2025',
        'tanggal_selesai': '07/02/2025',
        'tanggal_data': '07/02/2025',
        'dilihat': '1000',
        'jumlah_klik': '50',
        'persentase_klik': '5',
        'konversi': '2',
        'konversi_langsung': '1',
        'tingkat_konversi': '4',
        'tingkat_konversi_langsung': '2',
        'biaya_per_konversi': '25000',
        'biaya_per_konversi_langsung': '50000',
        'produk_terjual': '2',
        'terjual_langsung': '1',
        'omzet_penjualan': '200000',
        'penjualan_langsung_gmv_langsung': '100000',
        'biaya': '50000',
        'efektifitas_iklan': '4',
        'efektivitas_langsung': '2',
        'persentase_biaya_iklan_terhadap_penjualan_dari_iklan_acos': '25',
        'persentase_biaya_iklan_terhadap_penjualan_dari_iklan_langsung_acos_langsung': '50',
        'jumlah_produk_dilihat': '800',
        'jumlah_klik_produk': '40',
        'persentase_klik_produk': '5',
        'tanggal_ekstrak': new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      }
    ]
  }

  try {
    // Build URL with sheet parameter if provided
    let url = config.apiUrl
    if (config.sheetName) {
      url += `?sheet=${encodeURIComponent(config.sheetName)}`
    }

    console.log('=== SheetDB Test ===')
    console.log('Testing URL:', url)
    console.log('Sheet:', config.sheetName || 'default')
    console.log('Data Mode:', dataMode)
    console.log('Test data fields:', Object.keys(testData.data[0]).length)
    console.log('Test data:', JSON.stringify(testData, null, 2))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const responseText = await response.text()
    console.log('Test response status:', response.status)
    console.log('Test response body:', responseText)
    
    if (response.ok) {
      console.log('✅ Test successful!')
      return { success: true, response: responseText }
    } else {
      console.log('❌ Test failed!')
      return { success: false, response: responseText }
    }
  } catch (error) {
    console.error('Test error:', error)
    return { success: false, error: error.message }
  }
}

console.log("Background script loaded")
