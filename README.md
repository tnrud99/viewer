# Virtual Environment Suite

**Copyright-safe Virtual Editing with Multi-Window Viewing System**

A comprehensive platform for creating synchronized reaction videos while protecting content creators from copyright issues.

## 🎯 Overview

Virtual Environment Suite enables YouTubers and content creators to produce synchronized reaction videos without copyright risks. The platform uses timestamp-based synchronization instead of direct video embedding, ensuring compliance with YouTube policies and protecting monetization.

## 🚀 Features

### Core Components

- **🎥 Recorder**: Record reaction videos with automatic timestamp generation
- **✏️ Timeline Editor**: Fine-tune and synchronize video timestamps (Beta)
- **🚀 VE URL Creator**: Generate shareable synchronized video links
- **🌐 Multi-Window Viewer**: Synchronized video playback with dual-window interface

### Key Benefits

- **Copyright Protection**: No direct video embedding, only timestamp synchronization
- **YouTube Compliant**: Safe for monetization and channel growth
- **Real-time Sync**: Precise video synchronization with pause/play controls
- **User-friendly**: Simple 4-step process for content creators
- **Modern UI**: Dark mode interface with Apple OS-style design

## 📁 Project Structure

```
viewer/
├── src/
│   ├── server/                 # Backend server (Node.js/Express)
│   │   ├── public/            # Main web pages
│   │   │   ├── index.html     # Main landing page
│   │   │   ├── viewer.html    # Multi-window viewer
│   │   │   ├── create-ve-url-enhanced.html  # Enhanced URL creator
│   │   │   ├── create-ve-url-server.html    # Server-based URL creator
│   │   │   ├── create-ve-url.html           # Basic URL creator
│   │   │   ├── server-status.html
│   │   │   └── logo/          # Brand assets
│   │   ├── server.js          # Main server file
│   │   ├── package.json       # Dependencies
│   │   └── env.example        # Environment variables
│   ├── recorder/              # Video recording functionality
│   │   ├── recorder.html      # Recording interface
│   │   └── recorder.js        # Recording logic
│   ├── editor/                # Timeline editing tools (Beta)
│   │   ├── index.html         # Editor interface
│   │   ├── css/style.css      # Editor styles
│   │   ├── js/                # Editor JavaScript modules
│   │   └── utils/             # Editor utilities
│   └── shared/                # Shared resources
│       └── constants/         # UI system constants
├── assets/
│   ├── config/                # Configuration files
│   └── samples/               # Sample timestamp data
├── vercel.json               # Vercel deployment config
└── README.md
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Deployment**: Vercel
- **APIs**: YouTube IFrame API
- **Styling**: CSS Custom Properties, Glassmorphism design
- **Build Tools**: Vercel CLI

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd viewer
   ```

2. **Install dependencies**
   ```bash
   cd src/server
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your MongoDB connection string and JWT secret
   ```

4. **Start development server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

5. **Access the application**
   - Main page: `http://localhost:3000`
   - Recorder: `http://localhost:3000/src/recorder/recorder.html`
   - Timeline Editor: `http://localhost:3000/src/editor/index.html`
   - VE URL Creator: `http://localhost:3000/create-ve-url-enhanced.html`
   - Multi-Window Viewer: `http://localhost:3000/viewer.html`

### Deployment

The application is configured for Vercel deployment:

1. **Connect to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

## 📋 Usage Guide

### 4-Step Process

1. **🎥 Record**: Use the Recorder to capture your reaction with timestamps
2. **📤 Upload**: Upload your reaction video to YouTube
3. **✏️ Edit (Optional)**: Fine-tune timestamps using the Timeline Editor (Beta)
4. **🔗 Share**: Create a shareable synchronized URL with VE URL Creator

### Creating VE URLs

1. Navigate to "VE URL Creator" (Enhanced Version recommended)
2. Enter the original YouTube video URL
3. Upload your timestamp data (JSON format)
4. Add your nickname and password (minimum 4 characters)
5. Generate the synchronized URL

### Viewing Synchronized Videos

1. Open the generated VE URL
2. The Multi-Window Viewer will automatically load both videos
3. Use the synchronized controls to play/pause both videos
4. Use the "Resync" button if synchronization drifts
5. Enjoy the dual-window synchronized viewing experience

### Recording Process

1. Open the Recorder interface
2. Enter the YouTube video URL you want to react to
3. Start recording your reaction
4. Use the pause/play controls to synchronize with the original video
5. Download the timestamp data when finished

## 🔧 Configuration

### Environment Variables

Create a `.env` file in `src/server/` with:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

### MongoDB Schema

The application uses two main collections:

- **Users**: User authentication and management
- **VEUrls**: Virtual editing URL data with timestamps and metadata

### Timestamp Data Format

The system uses JSON format for timestamp synchronization:

```json
{
  "sync_points": [
    {
      "event": "youtube_pause",
      "reaction_time": 0.0,
      "youtube_time": 0.0
    },
    {
      "event": "youtube_play",
      "reaction_time": 5.0,
      "youtube_time": 10.0
    }
  ]
}
```

## 🎨 UI/UX Design

- **Apple OS Style**: Clean, modern interface with dark mode
- **Glassmorphism**: Subtle transparency and blur effects
- **Responsive Design**: Works on desktop and mobile devices
- **Intuitive Navigation**: Clear 4-step process guide
- **Independent Styling**: Each component has its own CSS for deployment flexibility

## 🔒 Security & Privacy

- **Password Protection**: Optional password protection for VE URLs
- **No Content Storage**: Only timestamps and metadata are stored
- **YouTube Compliant**: No direct video embedding or content copying
- **User Data**: Minimal data collection, focused on functionality
- **JWT Authentication**: Secure token-based authentication

## 🐛 Troubleshooting

### Common Issues

1. **Synchronization Drift**: Use the "Resync" button to re-synchronize videos
2. **Video Not Loading**: Check YouTube URL validity and video availability
3. **Timestamp Issues**: Verify JSON format in Timeline Editor
4. **MongoDB Connection**: Ensure your MongoDB Atlas connection string is correct

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

### Development Notes

- **UI System**: The project uses `ui-system.css` as a reference for style guidelines
- **Independent Components**: Each HTML file is styled independently for deployment flexibility
- **Beta Features**: Timeline Editor is currently in beta development

## 📈 Future Features

- **ReactCentral Platform**: Browse and discover shared video experiences
- **Advanced Analytics**: View count and engagement metrics
- **Social Features**: Comments and reactions on synchronized videos
- **Mobile App**: Native mobile application for recording
- **Advanced Editor**: Full-featured timeline editing with visual interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and structure
- Test your changes thoroughly
- Update documentation as needed
- Ensure UI consistency with the existing design system

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the troubleshooting section above

---

**© 2025 Virtual Environment Suite - Empowering Content Creators with Copyright-Safe Solutions** 