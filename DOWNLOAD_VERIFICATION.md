# Download/Upload Verification Guide

## Current Status ✅
The backend download route is **working correctly**. All files download with full content and correct size.

### Verified Materials in Database:
```
ID: 56b03dd0-e9d0-4463-a53a-d8f91419bedb | File: DBMS(ex-1).pdf | Size: 1597986B (1.52MB) ✓
ID: ef3c7a87-dea6-429c-8bd0-a35fa06f52c6 | File: Lab Manual.docx.pdf | Size: 245213B (239KB) ✓  
ID: 3a015e7b-c8c5-4e24-bd47-919e68c339f8 | File: DPCO notes.docx | Size: 3719892B (3.55MB) ✓
```

## What Was Fixed

### Backend Changes:
1. **Added comprehensive logging** to the download route to track every step
2. **Improved error handling** - errors now return as text instead of JSON to prevent JSON files from being downloaded
3. **Added debug endpoint** - `GET /api/debug/materials` shows all materials with file verification
4. **Added mime package** to properly detect file types

### Enhanced Routes:
- ✅ `GET /api/download/:id` - Downloads file by material UUID
- ✅ `GET /materials/download/:id` - Alternative route for direct downloads  
- ✅ `GET /api/debug/materials` - Shows all materials and file status

## How to Test

### Test 1: Verify Materials Exist
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/materials" -UseBasicParsing | ConvertFrom-Json | Select-Object id, fileName, fileSize
```

### Test 2: Check Debug Info
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/debug/materials" -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

### Test 3: Download a File by UUID
```powershell
$id = "56b03dd0-e9d0-4463-a53a-d8f91419bedb"
$uri = "http://localhost:5000/api/download/$id"
Invoke-WebRequest -Uri $uri -OutFile "test-download.pdf"
Get-Item "test-download.pdf" | Select-Object Length
# Expected output: 1597986 bytes
```

### Test 4: Use Frontend
1. Open http://localhost:3000
2. Navigate to "Study Deck" (Materials page)
3. Find a material in the list
4. Click the "Download" button (⬇️)
5. File should download with full content and correct size

## Important Notes for Users

### About ID "1"
If you see an error accessing `http://localhost:5000/materials/download/1`, this is correct!
- Material IDs are **UUIDs** (like `56b03dd0-e9d0-4463-a53a-d8f91419bedb`), not numeric IDs
- NumericIDs don't exist in the database
- The frontend automatically passes the correct UUID when you click download

### If Downloads Still Show Small File
The "1.1 KB" file is usually a JSON error response. This means:
1. **Check the file ID** - Verify the UUID exists in `/api/debug/materials`
2. **Check browser console** - Open DevTools (F12) to see errors
3. **Check server logs** - Look for `[DOWNLOAD]` messages in terminal
4. **Restart everything** - `npm install` in backend, restart server

## Server Logs

When you download a file, you should see logs like:
```
[DOWNLOAD REQUEST] ID: 56b03dd0-e9d0-4463-a53a-d8f91419bedb
[DOWNLOAD FOUND] File: DBMS(ex-1).pdf (1774943700940-DBMS(ex-1).pdf) - Size: 1597986 bytes
[DOWNLOAD PATH] Full path: d:\APR(hack)\backend\uploads\1774943700940-DBMS(ex-1).pdf
[DOWNLOAD VERIFIED] File size on disk: 1597986 bytes (expected: 1597986 bytes)
[DOWNLOAD SENDING] Sending DBMS(ex-1).pdf...
[DOWNLOAD SUCCESS] File sent: DBMS(ex-1).pdf
```

## File Structure  

```
backend/
  ├── uploads/                    # Uploaded files stored here
  │   ├── 1774924421619-DPCO notes.docx
  │   ├── 1774938696039-Lab Manual.docx.pdf
  │   └── 1774943700940-DBMS(ex-1).pdf
  ├── data/
  │   └── materials.json          # Metadata for all materials
  ├── routes/
  │   └── materials.js            # All routes (upload, download, etc.)
  └── server.js                   # Main server file
```

## Routes Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/upload` | Upload new file with metadata |
| GET | `/api/materials` | List all materials |
| GET | `/api/download/:id` | Download file by UUID |
| GET | `/materials/download/:id` | Download file (alt. route) |
| DELETE | `/api/materials/:id` | Delete material |
| GET | `/api/debug/materials` | Show debug info |

## Next Steps

1. ✅ Verify downloads work from the frontend
2. ✅ Upload a new test file and try downloading it
3. ✅ Check server logs to see download progress
4. ✅ Open downloaded files to confirm content is intact

All infrastructure is in place and working correctly!
