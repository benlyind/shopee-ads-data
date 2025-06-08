# Shopee API Examples

## Complete Working Example

### ⚠️ IMPORTANT: Timestamp Requirements

**Based on Shopee's valid example:**

- `start_time` must be at 00:00:00 (beginning of day)
- `end_time` must be at 23:59:59 (end of day)

### 🎯 IMPORTANT DISCOVERY: Getting ALL Campaigns

**To get ALL campaigns across ALL types, use:**

```json
{
  "campaign_type": "new_cpc_homepage",
  "state": "all",
  "search_term": ""
}
```

This single request returns campaigns of ALL types, not just `new_cpc_homepage`! This is much more efficient than making multiple requests for each campaign type.

```javascript
// ✅ CORRECT Format (from Shopee's valid example)
{
  "start_time": 1748624400,  // 2025-01-31 00:00:00
  "end_time": 1749229199,    // 2025-02-06 23:59:59
}

// ❌ WRONG - Both at 00:00:00
{
  "start_time": 1748624400,  // 2025-01-31 00:00:00
  "end_time": 1749229200,    // 2025-02-07 00:00:00
}
```

### 1. API Endpoint

```
https://seller.shopee.co.id/api/pas/v1/homepage/query/?SPC_CDS=e69f3807-c835-45b7-8250-2b064ef4a568&SPC_CDS_VER=2
```

### 2. Request Headers

```javascript
{
  "Content-Type": "application/json;charset=UTF-8",
  "Accept": "application/json, text/plain, */*",
  "Cookie": "SPC_CDS=e69f3807-c835-45b7-8250-2b064ef4a568; [other cookies...]"
}
```

### 3. Request Payload Examples

#### Get All Campaigns (Valid Shopee Example)

```json
{
  "start_time": 1748624400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}
```

#### Get Ongoing Campaigns Only

```json
{
  "start_time": 1748624400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "product_manual",
      "state": "ongoing",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}
```

#### Search Campaigns by Keyword

```json
{
  "start_time": 1748624400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": "ELEVENLABS"
    }
  ],
  "offset": 0,
  "limit": 20
}
```

#### Pagination Example (Get Next Page)

```json
{
  "start_time": 1748624400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 20,
  "limit": 20
}
```

#### Shopee's Actual Pagination (50 per page)

```json
{
  "start_time": 1746464400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 50,
  "limit": 50
}
```

**Pagination Rules:**

- Shopee's default and maximum limit per page: **50**
- To get page 2: set `offset: 50`
- To get page 3: set `offset: 100`
- Formula: `offset = (page - 1) * 50`

#### Get Today's Data (Valid Shopee Example)

```json
{
  "start_time": 1749142800, // 2025-02-07 00:00:00
  "end_time": 1749229199, // 2025-02-07 23:59:59
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}
```

#### Get Yesterday's Data (Valid Shopee Example)

```json
{
  "start_time": 1749056400, // 2025-02-06 00:00:00
  "end_time": 1749142799, // 2025-02-06 23:59:59
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}
```

#### Get Last 7 Days Data (Valid Shopee Example)

```json
{
  "start_time": 1748624400, // 2025-01-31 00:00:00
  "end_time": 1749229199, // 2025-02-07 23:59:59
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}
```

### 4. Valid Campaign Types

```javascript
const VALID_CAMPAIGN_TYPES = [
  "cpc_homepage",
  "search",
  "search_product",
  "search_shop",
  "targeting",
  "display",
  "boost_product",
  "boost_auto",
  "boost_homepage",
  "shop_manual",
  "shop_auto",
  "shop",
  "product",
  "product_manual",
  "product_auto",
  "shop_homepage",
  "product_homepage",
  "new_cpc_homepage",
  "live_stream",
  "live_stream_homepage",
  "product_homepage__auto",
  "product_homepage__manual",
  "product_homepage__roi_two",
  "crm_homepage",
  "shop_homepage__auto",
  "shop_homepage__manual",
  "search_brand",
  "search_brand_homepage",
  "video_homepage",
  "video"
]
```

### 5. Valid States

```javascript
const VALID_STATES = [
  "all", // All campaigns
  "ongoing", // Currently running
  "paused", // Temporarily stopped
  "ended", // Completed
  "closed" // Deleted/Closed
]
```

### 6. Complete cURL Example

```bash
curl -X POST 'https://seller.shopee.co.id/api/pas/v1/homepage/query/?SPC_CDS=e69f3807-c835-45b7-8250-2b064ef4a568&SPC_CDS_VER=2' \
-H 'Content-Type: application/json;charset=UTF-8' \
-H 'Accept: application/json, text/plain, */*' \
-H 'Cookie: SPC_CDS=e69f3807-c835-45b7-8250-2b064ef4a568; [other cookies]' \
-d '{
  "start_time": 1748624400,
  "end_time": 1749229199,
  "filter_list": [
    {
      "campaign_type": "new_cpc_homepage",
      "state": "all",
      "search_term": ""
    }
  ],
  "offset": 0,
  "limit": 20
}'
```

### 7. Response Format

```json
{
  "code": 0,
  "msg": "OK",
  "debug_detail": "",
  "validation_error_list": null,
  "data": {
    "entry_list": [
      {
        "campaign_id": 320999300,
        "title": "ELEVENLABS AI VOICE CLONING LEBIH EFISIEN DAN HEMAT",
        "type": "product_manual",
        "subtype": "product_homepage__roi_two__target",
        "state": "ongoing",
        "campaign": {
          "campaign_id": 320999300,
          "daily_budget": 2500000000,
          "total_budget": 0,
          "start_time": 1747069200,
          "end_time": 0,
          "roi_two_target": 300000
        },
        "report": {
          "impression": 3342,
          "click": 102,
          "cost": 15042908165,
          "ctr": 0.03052064631956912,
          "direct_order": 2,
          "direct_gmv": 53000000000,
          "direct_roi": 3.5232549064757253
          // ... more metrics
        }
        // ... more fields
      }
    ],
    "total": 57
  }
}
```

### 8. Fetching ALL Data (Multiple Requests)

To fetch ALL campaigns across ALL types, the extension makes multiple requests:

1. First, it fetches each campaign type separately
2. For each type, it uses pagination to get all campaigns
3. All results are combined into one dataset

Example sequence:

```
Request 1: new_cpc_homepage, offset: 0, limit: 20
Request 2: new_cpc_homepage, offset: 20, limit: 20 (if more than 20)
Request 3: product_manual, offset: 0, limit: 20
Request 4: product_auto, offset: 0, limit: 20
... and so on for all campaign types
```

### 9. Time Range Examples

```javascript
// Helper functions for Shopee timestamp format
function getStartOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function getEndOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return Math.floor(d.getTime() / 1000)
}

// Today's data
const today = new Date()
const todayStart = getStartOfDay(today) // Today 00:00:00
const todayEnd = getEndOfDay(today) // Today 23:59:59

// Yesterday's data
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStart = getStartOfDay(yesterday) // Yesterday 00:00:00
const yesterdayEnd = getEndOfDay(yesterday) // Yesterday 23:59:59

// Last 7 days (includes today)
const weekAgo = new Date()
weekAgo.setDate(weekAgo.getDate() - 6) // 6 days ago + today = 7 days
const weekStart = getStartOfDay(weekAgo) // 7 days ago 00:00:00
const weekEnd = getEndOfDay(today) // Today 23:59:59

// Verified Examples from Shopee:
// Today: start_time: 1749142800, end_time: 1749229199
// Yesterday: start_time: 1749056400, end_time: 1749142799
// Last 7 days: start_time: 1748624400, end_time: 1749229199
```

### 10. Common Timestamp Errors

```

```
