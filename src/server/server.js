const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 정적 파일 서빙 - 전체 프로젝트 디렉토리
app.use('/src', express.static(path.join(__dirname, '..')));
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'assets')));
app.use('/', express.static(path.join(__dirname, '..', '..')));

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ve_url_system';
        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Successfully connected to MongoDB');
        console.log('Database:', mongoose.connection.name);
        console.log('Host:', mongoose.connection.host);
        console.log('Port:', mongoose.connection.port);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('Error details:', error);
        throw error;
    }
};

// MongoDB 연결 이벤트 리스너
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// MongoDB 연결 시도
connectToMongoDB().catch(console.error);

// 데이터베이스 스키마
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    ve_urls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VEUrl' }]
});

const veUrlSchema = new mongoose.Schema({
    ve_id: { type: String, required: true, unique: true },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    reaction_url: { type: String, required: true },
    original_url: { type: String, required: true },
    timestamp_data: { type: Object, required: true },
    settings: {
        overlay_position: { type: String, default: 'top-right' },
        overlay_size: { type: Number, default: 50 },
        youtube_volume: { type: Number, default: 100 }
    },
    metadata: {
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
        view_count: { type: Number, default: 0 },
        is_public: { type: Boolean, default: true }
    },
    access_control: {
        is_public: { type: Boolean, default: true },
        allowed_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        password: { type: String }
    }
});

const User = mongoose.model('User', userSchema);
const VEUrl = mongoose.model('VEUrl', veUrlSchema);

// JWT 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// 인증 라우트
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 중복 확인
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 비밀번호 해시화
        const password_hash = await bcrypt.hash(password, 10);

        // 사용자 생성
        const user = new User({
            username,
            email,
            password_hash
        });

        await user.save();

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 사용자 찾기
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // 비밀번호 확인
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// VE URL 라우트 - 인증 없이도 작동하도록 수정
app.post('/api/ve-urls/create', async (req, res) => {
    try {
        const {
            title,
            description,
            reaction_url,
            original_url,
            timestamp_data,
            settings,
            access_control,
            userInfo
        } = req.body;

        // 고유 VE ID 생성
        const ve_id = 've_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // 사용자 정보 처리 (인증 없이도 작동)
        let creator_id = null;
        if (userInfo && userInfo.email) {
            // 기존 사용자 확인 또는 새 사용자 생성
            let user = await User.findOne({ email: userInfo.email });
            if (!user) {
                // 새 사용자 생성 (임시)
                const password_hash = await bcrypt.hash(userInfo.password || 'temp123', 10);
                user = new User({
                    username: userInfo.username || 'Anonymous',
                    email: userInfo.email,
                    password_hash
                });
                await user.save();
            }
            creator_id = user._id;
        }

        const veUrl = new VEUrl({
            ve_id,
            creator_id: creator_id,
            title: title || '동기화된 리액션 비디오',
            description: description || '리액션 비디오와 원본 비디오가 동기화된 경험',
            reaction_url,
            original_url,
            timestamp_data,
            settings: settings || {
                overlay_position: 'top-right',
                overlay_size: 50,
                youtube_volume: 100
            },
            access_control: access_control || {
                is_public: true,
                allowed_users: [],
                password: null
            }
        });

        await veUrl.save();

        // 사용자가 있는 경우 ve_urls 배열에 추가
        if (creator_id) {
            await User.findByIdAndUpdate(
                creator_id,
                { $push: { ve_urls: veUrl._id } }
            );
        }

        res.status(201).json({
            message: 'VE URL created successfully',
            ve_url: {
                id: veUrl._id,
                ve_id: veUrl.ve_id,
                title: veUrl.title,
                share_url: `${req.protocol}://${req.get('host')}/ve/${veUrl.ve_id}`,
                full_url: `${req.protocol}://${req.get('host')}/viewer.html?ve_server=${veUrl.ve_id}`
            }
        });
    } catch (error) {
        console.error('VE URL creation error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.get('/api/ve-urls/:id', async (req, res) => {
    try {
        const veUrl = await VEUrl.findOne({ ve_id: req.params.id });
        
        if (!veUrl) {
            return res.status(404).json({ error: 'VE URL not found' });
        }

        // 조회수 증가
        veUrl.metadata.view_count += 1;
        await veUrl.save();

        res.json({
            ve_url: {
                id: veUrl._id,
                ve_id: veUrl.ve_id,
                title: veUrl.title,
                description: veUrl.description,
                reaction_url: veUrl.reaction_url,
                original_url: veUrl.original_url,
                timestamp_data: veUrl.timestamp_data,
                settings: veUrl.settings,
                metadata: veUrl.metadata
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/ve-urls/user/:userId', authenticateToken, async (req, res) => {
    try {
        const veUrls = await VEUrl.find({ creator_id: req.params.userId })
            .select('ve_id title description metadata')
            .sort({ 'metadata.created_at': -1 });

        res.json({ ve_urls: veUrls });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/ve-urls/:id', authenticateToken, async (req, res) => {
    try {
        const veUrl = await VEUrl.findOne({ ve_id: req.params.id });

        if (!veUrl) {
            return res.status(404).json({ error: 'VE URL not found' });
        }

        // 권한 확인
        if (veUrl.creator_id.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // 업데이트
        const updatedVeUrl = await VEUrl.findOneAndUpdate(
            { ve_id: req.params.id },
            {
                ...req.body,
                'metadata.updated_at': new Date()
            },
            { new: true }
        );

        res.json({
            message: 'VE URL updated successfully',
            ve_url: updatedVeUrl
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/ve-urls/:id', authenticateToken, async (req, res) => {
    try {
        const veUrl = await VEUrl.findOne({ ve_id: req.params.id });

        if (!veUrl) {
            return res.status(404).json({ error: 'VE URL not found' });
        }

        // 권한 확인
        if (veUrl.creator_id.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await VEUrl.deleteOne({ ve_id: req.params.id });

        res.json({ message: 'VE URL deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 통계 라우트
app.post('/api/analytics/view', async (req, res) => {
    try {
        const { ve_id } = req.body;
        
        await VEUrl.findOneAndUpdate(
            { ve_id },
            { $inc: { 'metadata.view_count': 1 } }
        );

        res.json({ message: 'View count updated' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 정적 파일 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/viewer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.get('/create-ve-url.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-ve-url.html'));
});

app.get('/create-ve-url-server.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-ve-url-server.html'));
});

// Enhanced VE URL creator
app.get('/create-ve-url-enhanced.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-ve-url-enhanced.html'));
});

// Server status page
app.get('/server-status.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'server-status.html'));
});

// src/viewer/ 경로의 파일들 서빙
app.get('/src/viewer/create-ve-url-enhanced.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'viewer', 'create-ve-url-enhanced.html');
    console.log('Attempting to serve:', filePath);
    console.log('File exists:', require('fs').existsSync(filePath));
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found', path: filePath });
        }
    });
});

app.get('/src/viewer/viewer.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'viewer', 'viewer.html');
    console.log('Attempting to serve:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found', path: filePath });
        }
    });
});

app.get('/src/viewer/server-status.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'viewer', 'server-status.html');
    console.log('Attempting to serve:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found', path: filePath });
        }
    });
});

app.get('/src/viewer/index.html', (req, res) => {
    const filePath = path.join(__dirname, '..', 'viewer', 'index.html');
    console.log('Attempting to serve:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving file:', err);
            res.status(404).json({ error: 'File not found', path: filePath });
        }
    });
});

// src/recorder/ 경로의 파일들 서빙
app.get('/src/recorder/recorder.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'recorder', 'recorder.html'));
});

app.get('/src/recorder/recorder.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'recorder', 'recorder.js'));
});

// src/editor/ 경로의 파일들 서빙
app.get('/src/editor/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'index.html'));
});

app.get('/src/editor/css/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'css', 'style.css'));
});

app.get('/src/editor/js/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'app.js'));
});

app.get('/src/editor/js/advanced-editing.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'advanced-editing.js'));
});

app.get('/src/editor/js/drag-drop.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'drag-drop.js'));
});

app.get('/src/editor/js/timeline-controls.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'timeline-controls.js'));
});

// assets/ 경로의 파일들 서빙
app.get('/assets/samples/sample_timestamp.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'assets', 'samples', 'sample_timestamp.json'));
});

app.get('/assets/samples/sample_ve_timestamp.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'assets', 'samples', 'sample_ve_timestamp.json'));
});

app.get('/assets/samples/test_data.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'assets', 'samples', 'test_data.json'));
});

// 짧은 URL 라우트 추가
app.get('/ve/:id', async (req, res) => {
    try {
        const veUrl = await VEUrl.findOne({ ve_id: req.params.id });
        
        if (!veUrl) {
            return res.status(404).json({ error: 'VE URL not found' });
        }

        // 조회수 증가
        veUrl.metadata.view_count += 1;
        await veUrl.save();

        // viewer.html로 리다이렉트
        const viewerUrl = `${req.protocol}://${req.get('host')}/viewer.html?ve_server=${veUrl.ve_id}`;
        res.redirect(viewerUrl);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// API 상태 확인
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// MongoDB 연결 테스트
app.get('/api/test-mongodb', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        const dbState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        res.json({
            status: 'MongoDB Test',
            connection_state: states[dbState],
            ready_state: dbState,
            timestamp: new Date().toISOString(),
            mongodb_uri_set: !!process.env.MONGODB_URI,
            node_env: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            error: 'MongoDB Test Failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 서버 시작
// Vercel에서는 serverless 함수로 실행되므로 listen이 필요하지 않을 수 있음
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Vercel serverless 함수 export
module.exports = app; 