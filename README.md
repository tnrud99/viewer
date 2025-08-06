# YouTube Reaction Video Suite

A web application for recording, editing, watching, and sharing synchronized reaction videos.

## 🚀 Main Features

### 1. **Record a Reaction** (`recorder.html`)
- Record reaction videos synchronized with original YouTube videos
- Automatic timestamp generation
- Real-time synchronization information storage

### 2. **Watch a Reaction** (`viewer.html`)
- Watch synchronized reaction videos with original videos
- Adjustable overlay position and size
- Volume control
- YouTube-YouTube mode support

### 3. **Edit Timestamps** (`editor/`)
- Edit timestamp files
- Drag and drop interface
- Real-time preview

### 4. **Create VE URL** (`create-ve-url.html`, `create-ve-url-storage.html`) 🆕
- Create shareable synchronized video experiences
- Multiple sharing methods:
  - **URL Method**: All data embedded in URL (limited by URL length)
  - **Local Storage Method**: Data stored in browser, URL contains reference ID
  - **Server Method**: Data uploaded to server, URL contains server reference
- Input reaction video URL and timestamp file
- Viewer settings (overlay position, size, volume)
- Share generated links with others

## 📁 File Structure

```
viewer/
├── index.html              # Main page
├── recorder.html           # Reaction recording page
├── viewer.html             # Viewer page
├── create-ve-url.html      # VE URL creation page (URL method) 🆕
├── create-ve-url-storage.html # VE URL creation page (storage methods) 🆕
├── recorder.js             # Recording functionality script
├── sample_ve_timestamp.json # Sample file for VE URL testing 🆕
└── editor/                 # Timestamp editor
    ├── index.html
    ├── css/
    ├── js/
    └── sample_timestamp.json
```

## 🎯 How to Use

### 1. Record a Reaction
1. Click "Record a Reaction" on the main page
2. Enter original YouTube URL
3. Start recording
4. Watch with reaction video while automatically generating synchronization information

### 2. Watch a Reaction
1. Click "Watch a Reaction" on the main page
2. Upload timestamp file
3. Enter reaction video URL (YouTube or local file)
4. Enter original YouTube URL
5. Adjust viewer settings
6. Use play button for synchronized viewing

### 3. Create and Share VE URL 🆕
1. Click "Create VE URL" on the main page
2. Choose your preferred sharing method:
   - **URL Method**: All data in URL (limited size)
   - **Local Storage**: Data stored in browser (larger files)
   - **Server Method**: Data uploaded to server (requires backend)
3. Enter reaction video YouTube URL
4. Enter original video YouTube URL
5. Upload timestamp file
6. Adjust viewer settings (overlay position, size, volume)
7. Click "Create VE URL" button
8. Copy the generated link to share

### 4. Watch with VE URL
1. Click the shared VE URL
2. Viewer opens with settings automatically applied
3. Watch synchronized videos

## 🔧 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Video APIs**: YouTube IFrame API, MediaRecorder API
- **File Handling**: FileReader API, Blob API
- **URL Encoding**: Base64 encoding for VE URL parameters

## 🌟 New Feature: VE URL

The VE URL (Video Experience URL) feature allows creators to easily share completed synchronized video experiences.

### VE URL Sharing Methods:

#### 1. **URL Method** (Default)
- **Pros**: No server required, works immediately
- **Cons**: Limited by URL length (8KB max)
- **Best for**: Small timestamp files, quick sharing

#### 2. **Local Storage Method**
- **Pros**: No size limit, works offline
- **Cons**: Data stored in creator's browser only
- **Best for**: Large timestamp files, personal sharing

#### 3. **Server Method** (Future)
- **Pros**: No size limit, works across devices
- **Cons**: Requires backend server
- **Best for**: Professional sharing, large-scale use

### VE URL Benefits:
- **Easy Sharing**: Share with just one link without complex settings
- **Auto Settings**: Creator's overlay, volume, and other settings are automatically applied
- **Instant Viewing**: Watch synchronized videos with just one click
- **Mobile Friendly**: Same experience across all devices

### VE URL Creation Process:
1. Choose sharing method based on your needs
2. Creator inputs reaction video and original video URLs
3. Upload timestamp file
4. Adjust viewer settings (overlay position, size, volume)
5. Generate VE URL
6. Share the link

### VE URL Usage Process:
1. Click the shared link
2. Viewer opens with settings automatically applied
3. Watch synchronized videos

## 📝 License

This project is created for educational and personal use purposes.

## 🤝 Contributing

Please report bugs or suggest features through issues.

---

**YouTube Reaction Video Suite** - Create synchronized reaction video experiences! 🎬 