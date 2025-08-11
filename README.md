# VirtuEDIT Studio

**Copyright-safe virtual editing with multi-window viewing system**

A comprehensive platform for creating synchronized reaction videos while ensuring copyright safety for content creators and reactors.

## 🎯 Overview

VirtuEDIT Studio is designed to help YouTubers and content creators produce reaction videos safely by providing:

- **Timestamp Recording**: Create precise timestamps for reaction videos
- **Timeline Editing**: Advanced editing tools for video synchronization
- **VE URL Creation**: Generate shareable URLs for synchronized viewing
- **Multi-window Viewing**: Simultaneous playback of original and reaction content

## 🏗️ Project Structure

```
viewer/
├── src/
│   ├── server/                 # Backend server (Node.js/Express)
│   │   ├── public/            # Served static files
│   │   │   ├── index.html     # Main landing page
│   │   │   ├── viewer.html    # VE URL viewer
│   │   │   ├── create-ve-url*.html  # URL creation pages
│   │   │   ├── server-status.html
│   │   │   └── logo/          # Logo assets
│   │   ├── server.js          # Main server file
│   │   ├── package.json       # Node.js dependencies
│   │   └── env.example        # Environment variables template
│   ├── recorder/              # Recording functionality
│   │   ├── recorder.html      # Recording interface
│   │   └── recorder.js        # Recording logic
│   └── editor/                # Timeline editing tools
│       ├── index.html         # Editor interface
│       ├── css/style.css      # Editor styles
│       └── js/                # Editor JavaScript files
├── assets/                    # Static assets
│   ├── config/               # Configuration files
│   └── samples/              # Sample data files
├── vercel.json               # Vercel deployment config
└── README.md                 # This file
```

## 🚀 Features

### 1. **Recorder** (`/recorder.html`)
- Create timestamps for reaction videos
- Record precise synchronization points
- Export timestamp data for editing

### 2. **Timeline Editor** (`/editor`)
- Advanced timeline editing interface
- Drag-and-drop functionality
- Real-time preview capabilities
- Export synchronized data

### 3. **VE URL Creator** (`/create-ve-url-enhanced.html`)
- Generate shareable VE URLs
- Configure synchronization settings
- User authentication and metadata storage

### 4. **Viewer** (`/viewer.html`)
- Synchronized video playback
- Real-time synchronization
- Resync functionality for manual adjustments
- Multi-window viewing system

### 5. **ReactCentral** (Under Development)
- Platform for sharing and discovering VE URLs
- Community features
- Content discovery tools

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** with modern CSS
- **YouTube IFrame API** for video integration
- **Apple OS-style UI** with dark mode

### Deployment
- **Vercel** for hosting
- **MongoDB Atlas** for database

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- MongoDB database (local or Atlas)
- Vercel account for deployment

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd viewer
```

### 2. Install Dependencies
```bash
cd src/server
npm install
```

### 3. Environment Configuration
```bash
cp env.example .env
```

Edit `.env` file with your configuration:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

### 4. Development
```bash
npm run dev
```

### 5. Production
```bash
npm start
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
vercel --prod
```

## 📖 Usage Guide

### For Content Creators

1. **Record Timestamps**
   - Navigate to Recorder
   - Create timestamps for your reaction video
   - Export timestamp data

2. **Edit Timeline** (Optional)
   - Use Timeline Editor for advanced editing
   - Fine-tune synchronization points
   - Preview your edits

3. **Create VE URL**
   - Use VE URL Creator
   - Configure settings and metadata
   - Generate shareable URL

4. **Share and View**
   - Share the VE URL with your audience
   - Viewers can watch synchronized content

### For Viewers

1. **Access VE URL**
   - Click on shared VE URL
   - Automatic loading of synchronized content

2. **View Synchronized Content**
   - Original and reaction videos play simultaneously
   - Real-time synchronization maintained

3. **Manual Resync** (if needed)
   - Use Resync button for manual adjustment
   - Pause → Play sequence for re-synchronization

## 🔒 Copyright Safety

VirtuEDIT Studio is designed with copyright safety in mind:

- **No Content Storage**: Original videos are not stored on our servers
- **YouTube Integration**: Uses YouTube's official API
- **Fair Use Compliance**: Designed for legitimate reaction content
- **Creator Control**: Content creators maintain full control over their work

## 🎨 UI/UX Design

- **Apple OS Style**: Clean, modern interface with dark mode
- **Responsive Design**: Works on desktop and mobile devices
- **Intuitive Navigation**: Easy-to-understand workflow
- **Professional Aesthetics**: Suitable for content creators

## 🔧 API Endpoints

### VE URL Management
- `POST /api/ve-urls/create` - Create new VE URL
- `GET /api/ve-urls/:id` - Retrieve VE URL data
- `DELETE /api/ve-urls/:id` - Delete VE URL (authenticated)

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Analytics
- `POST /api/analytics/view` - Track view events

## 📊 Database Schema

### VEUrl Collection
```javascript
{
  ve_id: String,           // Unique identifier
  title: String,           // URL title
  description: String,     // URL description
  reaction_url: String,    // Reaction video URL
  original_url: String,    // Original video URL
  timestamp_data: Array,   // Synchronization data
  settings: Object,        // Viewer settings
  metadata: {
    created_at: Date,
    view_count: Number,
    user_info: {
      nickname: String,
      password: String,
      password_length: Number
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added Apple OS-style UI redesign
- **v1.2.0** - Enhanced synchronization and Resync feature
- **v1.3.0** - Improved user authentication and metadata handling

---

**VirtuEDIT Studio** - Empowering content creators with copyright-safe virtual editing solutions. 