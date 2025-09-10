const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// JWT Secret 상수 정의
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'assets')));

// Favicon 직접 서빙
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ve_url_system';
        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
        console.log('MongoDB URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);
        
        // 이미 연결되어 있다면 재사용
        if (mongoose.connection.readyState === 1) {
            console.log('✅ MongoDB already connected');
            return;
        }
        
        // 기존 연결이 있다면 정리
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 1,
            minPoolSize: 0,
            maxIdleTimeMS: 30000,
            bufferCommands: false,
            retryWrites: true,
            w: 'majority'
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

// 지역 감지 함수 (IP 기반)
const detectUserRegion = async (req) => {
    try {
        // 클라이언트 IP 가져오기
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        
        // 간단한 지역 매핑 (실제로는 GeoIP 서비스 사용)
        const regionMap = {
            '127.0.0.1': 'KR', // 로컬호스트
            '::1': 'KR',        // IPv6 로컬호스트
        };
        
        // 기본값은 한국
        let detectedRegion = 'KR';
        
        // IP 기반 지역 감지 (실제 구현에서는 GeoIP API 사용)
        if (clientIP && regionMap[clientIP]) {
            detectedRegion = regionMap[clientIP];
        }
        
        console.log(`🌍 Detected region: ${detectedRegion} from IP: ${clientIP}`);
        return detectedRegion;
    } catch (error) {
        console.error('❌ Region detection error:', error);
        return 'KR'; // 기본값
    }
};

// YouTube URL에서 video ID 추출
const extractYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

// VE ID 생성 함수
const generateVEId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ve_${timestamp}_${random}`;
};

        // 사용자 정보 검증 및 처리 함수
        const processUserInfo = (userInfo) => {
            try {
                const { nickname, email, password, isPublic, category } = userInfo;
        
        // 닉네임 검증 (영어만 허용)
        if (!nickname || nickname.trim().length === 0) {
            throw new Error('Nickname is required');
        }
        
        const trimmedNickname = nickname.trim();
        
        // 영어 + 숫자 + 특수문자만 허용
        const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
        if (!englishOnlyRegex.test(trimmedNickname)) {
            throw new Error('Nickname must contain only English letters, numbers, and special characters');
        }
        
        // 길이 검증 (1-20자)
        if (trimmedNickname.length < 1 || trimmedNickname.length > 20) {
            throw new Error('Nickname must be between 1 and 20 characters');
        }
        
        // 이메일 검증 (공개 설정 시 필수)
        let processedEmail = '';
        if (isPublic) {
            // 공개 설정 시 이메일 필수
            if (!email || email.trim().length === 0) {
                throw new Error('Email is required for public sharing');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                throw new Error('Invalid email format');
            }
            processedEmail = email.trim();
        } else {
            // 비공개 설정 시 이메일 선택사항
            if (email && email.trim().length > 0) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email.trim())) {
                    throw new Error('Invalid email format');
                }
                processedEmail = email.trim();
            }
        }
        
        // 비밀번호 길이 검증 (4자리 이상)
        if (password && password.length < 4) {
            throw new Error('Password must be at least 4 characters long');
        }
        
        return {
            nickname: trimmedNickname,
            email: processedEmail,
            password: password || '',
            password_length: password ? password.length : 0,
            isPublic: isPublic !== false, // Default to true if not specified
            userId: userInfo.userId || null, // 사용자 ID 추가
            category: category || null // 카테고리 정보 추가
        };
    } catch (error) {
        console.error('❌ User info validation error:', error);
        throw error;
    }
};

// MongoDB 연결 시도
connectToMongoDB().catch(console.error);

// MongoDB 연결 상태 확인 미들웨어
const ensureMongoConnection = async (req, res, next) => {
    try {
        console.log('Checking MongoDB connection...');
        console.log('Connection state:', mongoose.connection.readyState);
        
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB not connected, attempting to reconnect...');
            await connectToMongoDB();
        }
        
        // 연결 상태 재확인
        if (mongoose.connection.readyState === 1) {
            console.log('✅ MongoDB connection verified');
            next();
        } else {
            console.error('❌ MongoDB connection failed after reconnect attempt');
            res.status(500).json({ 
                error: 'Database connection failed',
                details: 'Unable to establish database connection'
            });
        }
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        res.status(500).json({ 
            error: 'Database connection failed',
            details: error.message
        });
    }
};

// 데이터베이스 스키마
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    nickname: { type: String, required: true }, // 닉네임 필드 추가
    created_at: { type: Date, default: Date.now },
    ve_urls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VEUrl' }]
});

const veUrlSchema = new mongoose.Schema({
    ve_id: { type: String, required: true, unique: true },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String },
    reaction_url: { type: String, required: true },
    original_url: { type: String, required: true },
    generated_url: { type: String, required: true }, // 생성된 URL 저장
    timestamp_data: { type: Object, required: true },
    settings: {
        overlay_position: { type: String, default: 'top-right' },
        overlay_size: { type: Number, default: 50 },
        youtube_volume: { type: Number, default: 100 },
        hide_overlay: { type: Boolean, default: false }
    },
    metadata: {
        created_at: { type: Date, default: Date.now },
        view_count: { type: Number, default: 0 },
        region: { type: String, default: 'KR' }
    },
    creator_info: {
        nickname: { type: String, required: true },
        email: { type: String },
        password: { type: String }, // 개발용 - 직접 저장
        is_public: { type: Boolean, default: true }
    },
    // React Central을 위한 추가 필드들
    react_central: {
        categories: [{ type: String }], // ['mv', 'kpop'] - 다중 카테고리 지원
        tags: [{ type: String }], // ['BTS', 'Dynamite', 'K-POP']
        thumbnail_url: { type: String }, // 썸네일 URL
        likes: { type: Number, default: 0 },
        bookmarks: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },

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

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// 닉네임 업데이트 API
app.put('/api/auth/update-nickname', authenticateToken, async (req, res) => {
    try {
        const { nickname } = req.body;
        
        // 닉네임 검증
        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({ error: 'Nickname is required' });
        }
        
        const trimmedNickname = nickname.trim();
        
        // 영어 + 숫자 + 특수문자만 허용
        const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
        if (!englishOnlyRegex.test(trimmedNickname)) {
            return res.status(400).json({ error: 'Nickname must contain only English letters, numbers, and special characters' });
        }
        
        // 길이 검증 (1-20자)
        if (trimmedNickname.length < 1 || trimmedNickname.length > 20) {
            return res.status(400).json({ error: 'Nickname must be between 1 and 20 characters' });
        }
        
        // 사용자 닉네임 업데이트
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { nickname: trimmedNickname },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            message: 'Nickname updated successfully',
            nickname: user.nickname
        });
        
    } catch (error) {
        console.error('Error updating nickname:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

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

        // 사용자 생성 (username을 nickname으로도 설정)
        const user = new User({
            username,
            email,
            password_hash,
            nickname: username // username을 기본 닉네임으로 설정
        });

        await user.save();

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
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
        const { email, password, rememberMe } = req.body;

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

        // JWT 토큰 생성 (Remember Me에 따라 만료 시간 조정)
        const tokenExpiry = rememberMe ? '30d' : '24h'; // 30일 vs 24시간
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                nickname: user.nickname || user.username, // 닉네임 추가
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// VE URL 생성 엔드포인트 (최적화됨)
app.post('/api/ve-urls/create', ensureMongoConnection, async (req, res) => {
    try {
        console.log('📥 Received VE URL creation request');
        
        const {
            reactionUrl,
            originalUrl,
            timestampData,
            settings,
            metadata,
            userInfo
        } = req.body;

        // 필수 필드 검증 (최적화된 검증)
        if (!reactionUrl || !originalUrl || !timestampData || !userInfo) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['reactionUrl', 'originalUrl', 'timestampData', 'userInfo']
            });
        }

        // 사용자 정보 처리 (이메일 포함)
        let processedUserInfo;
        try {
            processedUserInfo = processUserInfo(userInfo);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        // YouTube URL 검증
        const youtubeVideoId = extractYouTubeVideoId(originalUrl);
        if (!youtubeVideoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // VE ID 생성 (최적화: 더 짧은 ID)
        const veId = generateVEId();

        // 기본 설정값 적용 (최적화: 서버에서 기본값 설정)
        const defaultSettings = {
            overlay_position: 'top-right',
            overlay_size: 50,
            youtube_volume: 100,
            hide_overlay: false
        };

        const finalSettings = { ...defaultSettings, ...settings };

        // 메타데이터 최적화
        const finalMetadata = {
            description: metadata?.description || 'Reaction video synchronized with original video',
            created_at: new Date(),
            view_count: 0
        };

        // 생성된 VE URL
        const generatedUrl = `${req.protocol}://${req.get('host')}/viewer.html?ve=${veId}`;

        // VE URL 문서 생성 (최적화된 구조)
        const veUrlDoc = new VEUrl({
            ve_id: veId,
            title: metadata?.title || 'Synchronized Reaction Video', // 제목을 올바른 필드에 저장
            description: finalMetadata.description,
            reaction_url: reactionUrl,
            original_url: originalUrl,
            generated_url: generatedUrl, // 생성된 URL 저장
            timestamp_data: timestampData, // 이미 최적화된 데이터
            settings: finalSettings,
            metadata: finalMetadata,
            creator_info: {
                nickname: processedUserInfo.nickname,
                email: processedUserInfo.email,
                password: processedUserInfo.password || null, // 개발용 - 직접 저장
                is_public: processedUserInfo.isPublic,
                user_id: processedUserInfo.userId || null // 사용자 ID 저장
            },
            react_central: {
                categories: processedUserInfo.category ? [processedUserInfo.category] : [], // 카테고리 정보 (배열)
                likes: 0, // 초기 좋아요 수
                bookmarks: 0 // 초기 북마크 수
            },

        });

        // 데이터베이스 저장
        await veUrlDoc.save();
        console.log('✅ VE URL saved to database:', veId);

        // 응답 데이터 최적화 (필요한 정보만 반환)
        const responseData = {
            ve_url: {
                id: veId,
                full_url: `${req.protocol}://${req.get('host')}/viewer.html?ve=${veId}`,
                title: finalMetadata.title,
                created_at: finalMetadata.created_at
            },
            creator: {
                nickname: processedUserInfo.nickname
            }
        };

        res.status(200).json(responseData);
        console.log('✅ VE URL creation completed successfully');

    } catch (error) {
        console.error('❌ VE URL creation error:', error);
        
        // 더 구체적인 에러 메시지
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Data validation failed',
                details: Object.values(error.errors).map(e => e.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'VE URL already exists',
                details: 'Please try again with different settings'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
});

app.get('/api/ve-urls/:id', ensureMongoConnection, async (req, res) => {
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
                generated_url: veUrl.generated_url, // 생성된 URL 포함
                timestamp_data: veUrl.timestamp_data,
                settings: veUrl.settings,
                metadata: veUrl.metadata
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/ve-urls/user/:userId', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const veUrls = await VEUrl.find({ creator_id: req.params.userId })
            .select('ve_id title description generated_url metadata')
            .sort({ 'metadata.created_at': -1 });

        res.json({ ve_urls: veUrls });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/ve-urls/:id', authenticateToken, ensureMongoConnection, async (req, res) => {
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

app.delete('/api/ve-urls/:id', authenticateToken, ensureMongoConnection, async (req, res) => {
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
app.post('/api/analytics/view', ensureMongoConnection, async (req, res) => {
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

// Video Management API - 영상 정보 조회
app.get('/api/videos/:veId/manage', ensureMongoConnection, async (req, res) => {
    try {
        const { veId } = req.params;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const video = await VEUrl.findOne({ 
            ve_id: veId,
            'creator_info.user_id': decoded.userId 
        });

        if (!video) {
            return res.status(404).json({ error: 'Video not found or access denied' });
        }

        res.json(video);
    } catch (error) {
        console.error('Error fetching video for management:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Video Management API - 영상 정보 업데이트
app.put('/api/videos/:veId/manage', ensureMongoConnection, async (req, res) => {
    try {
        const { veId } = req.params;
        const token = req.headers.authorization?.replace('Bearer ', '');
        const { title, description, is_public, categories } = req.body;
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const updateData = {};
        
        // 제목 업데이트 (YouTube에서 가져온 제목 사용)
        if (title !== undefined) {
            updateData.title = title;
        }
        
        // 설명 업데이트
        if (description !== undefined) {
            updateData.description = description;
        }
        
        // 공개/비공개 설정
        if (is_public !== undefined) {
            updateData['creator_info.is_public'] = is_public;
        }
        
        // 카테고리 설정 (배열로 저장)
        if (categories !== undefined) {
            updateData['react_central.categories'] = categories || [];
        }

        const video = await VEUrl.findOneAndUpdate(
            { 
                ve_id: veId,
                'creator_info.user_id': decoded.userId 
            },
            { $set: updateData },
            { new: true }
        );

        if (!video) {
            return res.status(404).json({ error: 'Video not found or access denied' });
        }

        res.json({ message: 'Video updated successfully', video });
    } catch (error) {
        console.error('Error updating video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Video Management API - 영상 삭제
app.delete('/api/videos/:veId', ensureMongoConnection, async (req, res) => {
    try {
        const { veId } = req.params;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const result = await VEUrl.findOneAndDelete({ 
            ve_id: veId,
            'creator_info.user_id': decoded.userId 
        });

        if (!result) {
            return res.status(404).json({ error: 'Video not found or access denied' });
        }

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// React Central API 엔드포인트들
// 공개된 반응 영상 목록 조회
app.get('/api/react-central/videos', ensureMongoConnection, async (req, res) => {
    try {
        const { 
            category = 'all', 
            search = '', 
            sort = 'latest', 
            page = 1, 
            limit = 12 
        } = req.query;

        // 쿼리 조건 구성
        let query = {};
        
        // 카테고리 필터링
        if (category === 'my') {
            // My Videos: 로그인한 사용자의 비디오만 표시 (공개/비공개 모두)
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'Authentication required for My Videos' });
            }
            
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                query['creator_info.user_id'] = decoded.userId;
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        } else {
            // 다른 카테고리는 공개 영상만 표시
            query['creator_info.is_public'] = true;
            
            if (category !== 'all' && category !== 'latest') {
                // 다중 카테고리 지원: 배열에 해당 카테고리가 포함된 영상 검색
                query['react_central.categories'] = { $in: [category] };
            }
        }
        
        // 검색 필터링
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'react_central.tags': { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // 정렬 옵션
        let sortOption = {};
        switch (sort) {
            case 'latest':
                sortOption = { 'metadata.created_at': -1 };
                break;
            case 'popular':
                sortOption = { 'metadata.view_count': -1 };
                break;
            case 'likes':
                sortOption = { 'react_central.likes': -1 };
                break;
            default:
                sortOption = { 'metadata.created_at': -1 };
        }

        // 페이지네이션
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 데이터 조회
        const videos = await VEUrl.find(query)
            .select('ve_id title description reaction_url original_url metadata creator_info react_central')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));
        
        console.log('Found videos:', videos.length); // 디버깅용 로그
        if (videos.length > 0) {
            console.log('First video data:', JSON.stringify(videos[0], null, 2)); // 첫 번째 비디오 데이터 로그
        }

        // 전체 개수 조회
        const totalCount = await VEUrl.countDocuments(query);

        res.json({
            videos: videos,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                total_count: totalCount,
                has_next: skip + videos.length < totalCount
            }
        });
    } catch (error) {
        console.error('React Central videos fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// React Central 비디오 상세 조회
app.get('/api/react-central/videos/:id', ensureMongoConnection, async (req, res) => {
    try {
        const video = await VEUrl.findOne({ 
            ve_id: req.params.id,
            'creator_info.is_public': true 
        }).select('ve_id title description reaction_url original_url timestamp_data settings metadata creator_info react_central');

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // 조회수 증가
        video.metadata.view_count += 1;
        await video.save();

        res.json({ video });
    } catch (error) {
        console.error('React Central video detail error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 좋아요/북마크 기능 (간단한 구현)
app.post('/api/react-central/videos/:id/like', ensureMongoConnection, async (req, res) => {
    try {
        const { action } = req.body; // 'like' or 'unlike'
        
        const update = action === 'like' 
            ? { $inc: { 'react_central.likes': 1 } }
            : { $inc: { 'react_central.likes': -1 } };

        await VEUrl.findOneAndUpdate(
            { ve_id: req.params.id },
            update
        );

        res.json({ message: `Video ${action}d successfully` });
    } catch (error) {
        console.error('Like action error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/react-central/videos/:id/bookmark', ensureMongoConnection, async (req, res) => {
    try {
        const { action } = req.body; // 'bookmark' or 'unbookmark'
        
        const update = action === 'bookmark' 
            ? { $inc: { 'react_central.bookmarks': 1 } }
            : { $inc: { 'react_central.bookmarks': -1 } };

        await VEUrl.findOneAndUpdate(
            { ve_id: req.params.id },
            update
        );

        res.json({ message: `Video ${action}ed successfully` });
    } catch (error) {
        console.error('Bookmark action error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User profile API
app.get('/api/user/profile', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password_hash');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's videos
        const userVideos = await VEUrl.find({ creator_id: req.user.userId })
            .select('ve_id title description metadata creator_info react_central')
            .sort({ 'metadata.created_at': -1 });

        // Calculate statistics
        const totalViews = userVideos.reduce((sum, video) => sum + (video.metadata?.view_count || 0), 0);
        const totalLikes = userVideos.reduce((sum, video) => sum + (video.react_central?.likes || 0), 0);

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            },
            stats: {
                videos_count: userVideos.length,
                total_views: totalViews,
                total_likes: totalLikes,
                member_since: user.created_at
            },
            videos: userVideos
        });
    } catch (error) {
        console.error('User profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User videos API
app.get('/api/user/videos', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const { page = 1, limit = 12 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const videos = await VEUrl.find({ creator_id: req.user.userId })
            .select('ve_id title description reaction_url original_url metadata creator_info react_central')
            .sort({ 'metadata.created_at': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await VEUrl.countDocuments({ creator_id: req.user.userId });

        res.json({
            videos: videos,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                total_count: totalCount,
                has_next: skip + videos.length < totalCount
            }
        });
    } catch (error) {
        console.error('User videos error:', error);
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

// React Central page
app.get('/react-central.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'react-central.html'));
});

// Authentication pages
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Profile page
app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Server status page
app.get('/server-status.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'server-status.html'));
});

// src/viewer/ 경로의 파일들 서빙 (정리됨 - 실제로는 src/server/public/ 사용)

// src/recorder/ 경로의 파일들 서빙
app.get('/src/recorder/recorder.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'recorder', 'recorder.html'));
});

app.get('/src/recorder/recorder.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'recorder', 'recorder.js'));
});

// recorder에서 로고 접근을 위한 라우트
app.get('/src/recorder/logo/(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo', req.params[0]));
});

// recorder 폴더의 로고 파일 서빙
app.get('/src/recorder/whitered_mini.png', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'recorder', 'whitered_mini.png'));
});

// editor 폴더의 파일들 서빙
app.get('/src/editor/favicon.png', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'favicon.png'));
});

app.get('/src/editor/whitered_mini.png', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'whitered_mini.png'));
});

// src/editor/ 경로의 파일들 서빙
app.get('/src/editor/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'index.html'));
});

app.get('/src/editor/css/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'css', 'style.css'));
});

// 새로운 모듈 시스템 파일들 서빙
app.get('/src/editor/js/SimpleEditor.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'SimpleEditor.js'));
});

app.get('/src/editor/js/config/TimelineConfig.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'config', 'TimelineConfig.js'));
});

app.get('/src/editor/js/modules/TimelineRenderer.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'TimelineRenderer.js'));
});

app.get('/src/editor/js/modules/DragDropManager.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'DragDropManager.js'));
});

app.get('/src/editor/js/modules/ZoomController.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'ZoomController.js'));
});

app.get('/src/editor/js/modules/PreviewManager.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'PreviewManager.js'));
});

app.get('/src/editor/js/modules/AdvancedEditor.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'AdvancedEditor.js'));
});

app.get('/src/editor/js/modules/FileManager.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'FileManager.js'));
});

app.get('/src/editor/js/modules/HistoryManager.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'HistoryManager.js'));
});

app.get('/src/editor/js/modules/LayoutManager.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'editor', 'js', 'modules', 'LayoutManager.js'));
});

// 레거시 파일들 (호환성을 위해 유지)
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

app.get('/timestamp_1751179878134.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'assets', 'samples', 'timestamp_1751179878134.json'));
});

// 로고 파일들 서빙
app.get('/logo/whitered_full.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo', 'whitered_full.png'));
});

app.get('/logo/whitered_mini.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo', 'whitered_mini.png'));
});

app.get('/logo/blackred_full.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo', 'blackred_full.png'));
});

app.get('/logo/blackred_mini.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo', 'blackred_mini.png'));
});

// 짧은 URL 라우트 추가
app.get('/ve/:id', ensureMongoConnection, async (req, res) => {
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
        
        // 연결 시도
        let connectionTest = 'not_attempted';
        if (dbState !== 1) {
            try {
                await connectToMongoDB();
                connectionTest = 'success';
            } catch (error) {
                connectionTest = 'failed';
                console.error('Connection test failed:', error);
            }
        } else {
            connectionTest = 'already_connected';
        }
        
        res.json({
            status: 'MongoDB Test',
            connection_state: states[mongoose.connection.readyState],
            ready_state: mongoose.connection.readyState,
            connection_test: connectionTest,
            timestamp: new Date().toISOString(),
            mongodb_uri_set: !!process.env.MONGODB_URI,
            mongodb_uri_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
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