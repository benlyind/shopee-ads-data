import { useState, useEffect } from "react"
import "./style.css"

// Campaign type options - Updated with valid values from Shopee API
const CAMPAIGN_TYPES = {
  "": "All Campaign Types", // Empty string to fetch all
  "new_cpc_homepage": "Cost Per Click - Homepage",
  "product_manual": "Manual Product Ads",
  "product_auto": "Auto Product Ads",
  "product_homepage": "Product Homepage",
  "product_homepage__manual": "Product Homepage - Manual",
  "product_homepage__auto": "Product Homepage - Auto",
  "product_homepage__roi_two": "Product Homepage - ROI",
  "shop_manual": "Manual Shop Ads",
  "shop_auto": "Auto Shop Ads",
  "shop_homepage": "Shop Homepage",
  "shop_homepage__manual": "Shop Homepage - Manual",
  "shop_homepage__auto": "Shop Homepage - Auto",
  "search": "Search Ads",
  "search_product": "Search Product",
  "search_shop": "Search Shop",
  "search_brand": "Search Brand",
  "search_brand_homepage": "Search Brand Homepage",
  "targeting": "Targeting Ads",
  "display": "Display Ads",
  "boost_product": "Boost Product",
  "boost_auto": "Boost Auto",
  "boost_homepage": "Boost Homepage",
  "cpc_homepage": "CPC Homepage",
  "live_stream": "Live Stream",
  "live_stream_homepage": "Live Stream Homepage",
  "video_homepage": "Video Homepage",
  "video": "Video Ads",
  "crm_homepage": "CRM Homepage"
}

// Campaign state options
const CAMPAIGN_STATES = {
  "all": "All States",
  "ongoing": "Currently Running",
  "paused": "Temporarily Stopped",
  "ended": "Completed/Finished",
  "closed": "Closed/Deleted"
}

function IndexPopup() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState("")
  const [dateRange, setDateRange] = useState(7) // Default 7 days
  const [campaignType, setCampaignType] = useState("") // Empty string for all
  const [campaignState, setCampaignState] = useState("all")
  const [limit, setLimit] = useState(50) // Default 50 like Shopee
  const [enablePagination, setEnablePagination] = useState(true) // Default on for > 50 data
  const [lastFetchedCount, setLastFetchedCount] = useState(0)
  const [sheetDBConfig, setSheetDBConfig] = useState({
    apiUrl: "", // SheetDB API URL
    sheetName: "", // Sheet/tab name (optional)
    dataMode: "complete", // "simple" or "complete"
    updateMode: "append", // "append" or "replace"
    shopName: "" // Custom shop name
  })

  const fetchShopeeData = async () => {
    setLoading(true)
    setMessage("")
    setProgress(campaignType === "" ? "Fetching all campaigns..." : "")

    try {
      // Calculate date range following Shopee's actual format
      let startTime: number
      let endTime: number
      
      const now = new Date()
      
      if (dateRange === 1) {
        // Today: from 00:00:00 today to 23:59:59 today
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)
        startTime = Math.floor(today.getTime() / 1000)
        
        const endToday = new Date(now)
        endToday.setHours(23, 59, 59, 999)
        endTime = Math.floor(endToday.getTime() / 1000)
      } else if (dateRange === 2) {
        // Yesterday: from 00:00:00 yesterday to 23:59:59 yesterday
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        startTime = Math.floor(yesterday.getTime() / 1000)
        
        const endYesterday = new Date(yesterday)
        endYesterday.setHours(23, 59, 59, 999)
        endTime = Math.floor(endYesterday.getTime() / 1000)
      } else {
        // Multiple days: from X days ago 00:00:00 to today 23:59:59
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - dateRange + 1)
        startDate.setHours(0, 0, 0, 0)
        startTime = Math.floor(startDate.getTime() / 1000)
        
        const endDate = new Date(now)
        endDate.setHours(23, 59, 59, 999)
        endTime = Math.floor(endDate.getTime() / 1000)
      }

      console.log('Date range:', {
        startTime,
        endTime,
        startDate: new Date(startTime * 1000).toISOString(),
        endDate: new Date(endTime * 1000).toISOString(),
        days: dateRange
      })

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: "fetchShopeeData",
        params: {
          startTime,
          endTime,
          campaignType,
          state: campaignState,
          offset: 0,
          limit,
          disablePagination: !enablePagination
        }
      })

      if (response.success) {
        setMessage(`✅ ${response.message}`)
        setLastFetchedCount(response.data.entry_list.length)
      } else {
        setMessage(`❌ Error: ${response.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
      setProgress("")
    }
  }

  const downloadCSV = async () => {
    setLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({
        action: "downloadCSV",
        data: null // Will use stored data
      })

      if (response.success) {
        setMessage(`✅ ${response.message}`)
      } else {
        setMessage(`❌ Error: ${response.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const saveSheetDBConfig = () => {
    chrome.storage.local.set({ sheetDBConfig }, () => {
      setMessage("✅ SheetDB configuration saved!")
    })
  }

  // Load saved config on mount
  useEffect(() => {
    chrome.storage.local.get(['sheetDBConfig', 'lastFetchedData'], (result) => {
      if (result.sheetDBConfig) {
        setSheetDBConfig(result.sheetDBConfig)
      }
      if (result.lastFetchedData) {
        setLastFetchedCount(result.lastFetchedData.length)
      }
    })
  }, [])

  return (
    <div className="popup-container">
      <h2>Shopee Data Extractor</h2>
      
      <div className="section">
        <h3>Campaign Filters</h3>
        
        <div className="form-group">
          <label>Date Range:</label>
          <select value={dateRange} onChange={(e) => setDateRange(Number(e.target.value))}>
            <option value={1}>Today</option>
            <option value={2}>Yesterday</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div className="form-group">
          <label>Campaign Type:</label>
          <select value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
            {Object.entries(CAMPAIGN_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Campaign State:</label>
          <select value={campaignState} onChange={(e) => setCampaignState(e.target.value)}>
            {Object.entries(CAMPAIGN_STATES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Results per Page:</label>
          <input 
            type="number" 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            min={1}
            max={50}
          />
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Shopee max: 50 per page
          </small>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={enablePagination}
              onChange={(e) => setEnablePagination(e.target.checked)}
            />
            Auto-fetch all pages
          </label>
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Automatically fetch all data if more than {limit} campaigns exist
          </small>
        </div>
      </div>

      <div className="section">
        <h3>SheetDB Configuration</h3>
        
        <div className="form-group">
          <label>Nama Toko:</label>
          <input 
            type="text"
            placeholder="Masukkan nama toko Anda"
            value={sheetDBConfig.shopName}
            onChange={(e) => setSheetDBConfig({...sheetDBConfig, shopName: e.target.value})}
          />
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Nama toko akan ditambahkan di setiap baris data
          </small>
        </div>
        
        <div className="form-group">
          <label>SheetDB API URL:</label>
          <input 
            type="text"
            placeholder="https://sheetdb.io/api/v1/your-api-id"
            value={sheetDBConfig.apiUrl}
            onChange={(e) => setSheetDBConfig({...sheetDBConfig, apiUrl: e.target.value})}
          />
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Get your API URL from <a href="https://sheetdb.io" target="_blank" rel="noopener noreferrer" style={{ color: '#ee4d2d' }}>sheetdb.io</a>
          </small>
        </div>

        <div className="form-group">
          <label>Sheet Name (Optional):</label>
          <input 
            type="text"
            placeholder="e.g., Sheet1, TEST, etc."
            value={sheetDBConfig.sheetName}
            onChange={(e) => setSheetDBConfig({...sheetDBConfig, sheetName: e.target.value})}
          />
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Leave empty for default sheet, or enter the exact tab name
          </small>
        </div>

        <div className="form-group">
          <label>Data Mode:</label>
          <select 
            value={sheetDBConfig.dataMode} 
            onChange={(e) => setSheetDBConfig({...sheetDBConfig, dataMode: e.target.value})}
          >
            <option value="simple">Simple (6 kolom)</option>
            <option value="complete">Complete (30 kolom)</option>
          </select>
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Simple: Info dasar campaign saja<br/>
            Complete: Semua metrik dan data performa lengkap
          </small>
        </div>

        <div className="form-group">
          <label>Update Mode:</label>
          <select 
            value={sheetDBConfig.updateMode} 
            onChange={(e) => setSheetDBConfig({...sheetDBConfig, updateMode: e.target.value})}
          >
            <option value="append">Tambah Data Baru</option>
            <option value="replace">Ganti Semua Data</option>
          </select>
          <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
            Tambah: Menambah data di baris baru<br/>
            Ganti: Hapus data lama, ganti dengan yang baru
          </small>
        </div>

        <button onClick={saveSheetDBConfig} className="btn-secondary">
          Save Configuration
        </button>

        <button 
          onClick={async () => {
            setMessage("Testing SheetDB connection...")
            try {
              const response = await chrome.runtime.sendMessage({
                action: "testSheetDB"
              })
              if (response.success) {
                setMessage("✅ SheetDB test successful!")
              } else {
                setMessage(`❌ SheetDB test failed: ${response.error || response.response}`)
              }
            } catch (error) {
              setMessage(`❌ Test error: ${error.message}`)
            }
          }} 
          className="btn-secondary"
          style={{ marginTop: '8px' }}
        >
          Test Connection
        </button>
      </div>

      <button 
        onClick={fetchShopeeData} 
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Processing..." : "Fetch Shopee Data"}
      </button>

      {progress && (
        <div className="progress-message">
          {progress}
        </div>
      )}

      {lastFetchedCount > 0 && (
        <button 
          onClick={downloadCSV} 
          disabled={loading}
          className="btn-secondary"
          style={{ marginTop: '8px' }}
        >
          Download CSV ({lastFetchedCount} campaigns)
        </button>
      )}

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="footer">
        <small>Make sure you're logged into Shopee Seller Center</small>
        {lastFetchedCount > 0 && (
          <small style={{ display: 'block', marginTop: '4px' }}>
            Last fetched: {lastFetchedCount} campaigns
          </small>
        )}
      </div>
    </div>
  )
}

export default IndexPopup
