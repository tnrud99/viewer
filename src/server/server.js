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
        console.log('Environment:', process.env.NODE_ENV);
        
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
            serverSelectionTimeoutMS: 5000,  // 서버리스 환경에서는 더 짧은 타임아웃
            socketTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            maxPoolSize: 10,  // 서버리스 환경에서는 더 큰 풀 크기
            minPoolSize: 0,
            maxIdleTimeMS: 30000,
            bufferCommands: false,
            retryWrites: true,
            w: 'majority',
            // 서버리스 환경을 위한 추가 옵션
            bufferMaxEntries: 0,
            useCreateIndex: true,
            useFindAndModify: false
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
                const { nickname, email, isPublic, category } = userInfo;
        
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
        
        return {
            nickname: trimmedNickname,
            email: processedEmail,
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
        
        console.log('✅ MongoDB connection verified');
        next();
        
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
    ve_urls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VEUrl' }],
    bookmarks: [{ type: String }], // 북마크한 비디오 ID들
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // 구독한 사용자 ID들
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
        is_public: { type: Boolean, default: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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

    console.log('🔐 authenticateToken called for:', req.path);
    console.log('🔐 Auth header exists:', !!authHeader);
    console.log('🔐 Token exists:', !!token);

    if (!token) {
        console.error('❌ No token provided');
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('❌ JWT verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        console.log('✅ JWT verification successful, user:', user);
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
app.post('/api/auth/register', ensureMongoConnection, async (req, res) => {
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

app.post('/api/auth/login', ensureMongoConnection, async (req, res) => {
    try {
        console.log('🔐 Login attempt:', { email: req.body.email, rememberMe: req.body.rememberMe });
        console.log('🔐 MongoDB connection state:', mongoose.connection.readyState);
        
        const { email, password, rememberMe } = req.body;

        // 사용자 찾기
        const user = await User.findOne({ email });
        console.log('🔐 User found:', user ? 'Yes' : 'No');
        if (!user) {
            console.log('🔐 No user found with email:', email);
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
        console.error('❌ Login API Error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
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
                is_public: processedUserInfo.isPublic,
                user_id: processedUserInfo.userId || null // 사용자 ID 저장
            },
            react_central: {
                categories: Array.isArray(processedUserInfo.category) ? processedUserInfo.category : (processedUserInfo.category ? [processedUserInfo.category] : []), // 카테고리 정보 (배열)
                likes: 0, // 초기 좋아요 수
                bookmarks: 0 // 초기 북마크 수
            },

        });

        // 데이터베이스 저장
        await veUrlDoc.save();
        console.log('✅ VE URL saved to database:', veId);
        console.log('✅ VE URL creator_info:', {
            nickname: veUrlDoc.creator_info.nickname,
            user_id: veUrlDoc.creator_info.user_id,
            is_public: veUrlDoc.creator_info.is_public
        });

        // 사용자의 ve_urls 배열에 추가 (userId가 있는 경우에만)
        if (processedUserInfo.userId) {
            try {
                console.log('🔍 Adding VE URL to user array:');
                console.log('🔍 User ID:', processedUserInfo.userId);
                console.log('🔍 VE URL ID:', veUrlDoc._id);
                console.log('🔍 VE URL ID type:', typeof veUrlDoc._id);
                
                const updatedUser = await User.findByIdAndUpdate(
                    processedUserInfo.userId,
                    { $push: { ve_urls: veUrlDoc._id } },
                    { new: true }
                );
                
                console.log('✅ VE URL added to user\'s ve_urls array:', processedUserInfo.userId);
                console.log('✅ Updated user ve_urls:', updatedUser?.ve_urls);
            } catch (error) {
                console.error('❌ Failed to update user\'s ve_urls array:', error);
                // 이 오류는 VE URL 생성에는 영향을 주지 않음
            }
        } else {
            console.log('⚠️ No userId provided, skipping user array update');
        }

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
            console.log('🔍 My Videos API called');
            console.log('🔍 Token exists:', !!token);
            console.log('🔍 Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
            
            if (!token) {
                console.error('❌ No token provided for My Videos');
                return res.status(401).json({ error: 'Authentication required for My Videos' });
            }
            
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                console.log('🔍 Decoded JWT payload:', decoded);
                console.log('🔍 Decoded user ID:', decoded.userId);
                console.log('🔍 Decoded user ID type:', typeof decoded.userId);
                console.log('🔍 Decoded user ID string:', String(decoded.userId));
                
                query['creator_info.user_id'] = decoded.userId;
                console.log('🔍 Query for My Videos:', query);
                
                // 해당 사용자의 모든 VE URL 조회 (디버깅용)
                const allUserVeUrls = await VEUrl.find({ 'creator_info.user_id': decoded.userId });
                console.log('🔍 All VE URLs for this user:', allUserVeUrls.length);
                console.log('🔍 VE URL IDs:', allUserVeUrls.map(v => v._id));
                console.log('🔍 VE URL titles:', allUserVeUrls.map(v => v.title));
                console.log('🔍 VE URL creator_info.user_id:', allUserVeUrls.map(v => v.creator_info?.user_id));
                
                // 사용자 정보도 조회해보기
                const user = await User.findById(decoded.userId);
                console.log('🔍 User found:', user ? 'Yes' : 'No');
                if (user) {
                    console.log('🔍 User ve_urls array:', user.ve_urls);
                    console.log('🔍 User ve_urls length:', user.ve_urls?.length || 0);
                }
                
            } catch (error) {
                console.error('❌ JWT verification failed for My Videos:', error.message);
                console.error('❌ JWT error details:', error);
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
        
        console.log('📊 Found videos:', videos.length);
        if (category === 'my') {
            console.log('📊 My Videos query result:', videos.map(v => ({
                ve_id: v.ve_id,
                title: v.title,
                user_id: v.creator_info?.user_id,
                is_public: v.creator_info?.is_public
            })));
        }
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
        console.log('🔍 /api/user/profile called for userId:', req.user.userId);
        const user = await User.findById(req.user.userId).select('-password_hash');
        
        console.log('🔍 User found:', user);
        
        if (!user) {
            console.error('❌ User not found for userId:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's videos
        const userVideos = await VEUrl.find({ 'creator_info.user_id': req.user.userId })
            .select('ve_id title description metadata creator_info react_central')
            .sort({ 'metadata.created_at': -1 });

        // Calculate statistics
        const totalViews = userVideos.reduce((sum, video) => sum + (video.metadata?.view_count || 0), 0);
        const totalLikes = userVideos.reduce((sum, video) => sum + (video.react_central?.likes || 0), 0);

        const responseData = {
            user: {
                _id: user._id,
                username: user.username,
                nickname: user.nickname || user.username,
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
        };
        
        console.log('📤 Sending response data:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('❌ User profile error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

// User profile update API
app.put('/api/user/profile', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const { nickname, email } = req.body;
        const userId = req.user.userId;
        
        console.log('🔍 Profile update request for userId:', userId);
        console.log('🔍 Update data:', { nickname, email });
        
        // 입력 검증
        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({ error: 'Nickname is required' });
        }
        
        // 사용자 정보 업데이트
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                nickname: nickname.trim(),
                ...(email && { email: email.trim() })
            },
            { new: true, select: '-password_hash' }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // 해당 사용자의 모든 VEUrl의 creator_info.nickname도 업데이트
        const updateResult = await VEUrl.updateMany(
            { 'creator_info.user_id': userId },
            { $set: { 'creator_info.nickname': nickname.trim() } }
        );
        
        console.log(`✅ Updated ${updateResult.modifiedCount} VEUrls with new nickname`);
        
        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                username: updatedUser.username,
                nickname: updatedUser.nickname,
                email: updatedUser.email,
                created_at: updatedUser.created_at
            },
            updated_videos_count: updateResult.modifiedCount
        });
        
    } catch (error) {
        console.error('❌ Profile update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 북마크 API 테스트
app.get('/api/user/bookmark/test', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        console.log('🧪 Bookmark test API called');
        const userId = req.user.userId;
        console.log('🧪 User ID:', userId);
        console.log('🧪 MongoDB state:', mongoose.connection.readyState);
        
        const user = await User.findById(userId).select('username email bookmarks');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                bookmarks: user.bookmarks || []
            },
            mongoState: mongoose.connection.readyState
        });
    } catch (error) {
        console.error('❌ Bookmark test error:', error);
        res.status(500).json({ 
            error: 'Test failed',
            details: error.message 
        });
    }
});

// 북마크 API
// 북마크 추가/제거
app.post('/api/user/bookmark', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        console.log('🔖 Bookmark API called');
        const { ve_id } = req.body;
        const userId = req.user.userId;
        
        console.log('🔖 Request data:', { ve_id, userId });
        
        if (!ve_id) {
            console.log('❌ Missing ve_id');
            return res.status(400).json({ error: 'Video ID is required' });
        }
        
        console.log('🔖 Finding user:', userId);
        console.log('🔖 MongoDB connection state:', mongoose.connection.readyState);
        
        const user = await User.findById(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('🔖 User found, current bookmarks:', user.bookmarks);
        
        // 북마크 배열이 없으면 초기화 (기존 사용자 호환성)
        if (!user.bookmarks || !Array.isArray(user.bookmarks)) {
            user.bookmarks = [];
            console.log('🔖 Initialized bookmarks array for user');
        }
        
        // 북마크 배열에서 해당 비디오 ID 찾기
        const bookmarkIndex = user.bookmarks.indexOf(ve_id);
        
        if (bookmarkIndex === -1) {
            // 북마크 추가
            console.log('🔖 Adding bookmark for:', ve_id);
            user.bookmarks.push(ve_id);
            
            try {
                await user.save();
                console.log('✅ Bookmark added, new bookmarks:', user.bookmarks);
            } catch (saveError) {
                console.error('❌ Failed to save user:', saveError);
                throw new Error('Failed to save bookmark: ' + saveError.message);
            }
            
            // VEUrl의 북마크 카운트 증가 (선택적)
            try {
                await VEUrl.findOneAndUpdate(
                    { ve_id: ve_id },
                    { $inc: { 'react_central.bookmarks': 1 } }
                );
                console.log('✅ VEUrl bookmark count updated');
            } catch (veError) {
                console.log('⚠️ VEUrl update failed (non-critical):', veError.message);
            }
            
            res.json({ 
                success: true, 
                action: 'added',
                message: 'Video bookmarked successfully' 
            });
        } else {
            // 북마크 제거
            console.log('🔖 Removing bookmark for:', ve_id);
            user.bookmarks.splice(bookmarkIndex, 1);
            
            try {
                await user.save();
                console.log('✅ Bookmark removed, new bookmarks:', user.bookmarks);
            } catch (saveError) {
                console.error('❌ Failed to save user:', saveError);
                throw new Error('Failed to remove bookmark: ' + saveError.message);
            }
            
            // VEUrl의 북마크 카운트 감소 (선택적)
            try {
                await VEUrl.findOneAndUpdate(
                    { ve_id: ve_id },
                    { $inc: { 'react_central.bookmarks': -1 } }
                );
                console.log('✅ VEUrl bookmark count updated');
            } catch (veError) {
                console.log('⚠️ VEUrl update failed (non-critical):', veError.message);
            }
            
            res.json({ 
                success: true, 
                action: 'removed',
                message: 'Bookmark removed successfully' 
            });
        }
        
    } catch (error) {
        console.error('❌ Bookmark API error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            error: 'Failed to update bookmark',
            details: error.message 
        });
    }
});

// 사용자의 북마크 목록 조회
app.get('/api/user/bookmarks', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const user = await User.findById(userId).select('bookmarks');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            bookmarks: user.bookmarks || [] 
        });
        
    } catch (error) {
        console.error('❌ Get bookmarks API error:', error);
        res.status(500).json({ error: 'Failed to get bookmarks' });
    }
});

// 구독 API
app.post('/api/user/subscription', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        console.log('📺 Subscription API called');
        const { creator_id, action } = req.body;
        const userId = req.user.userId;
        
        console.log('📺 Request data:', { creator_id, action, userId });
        
        if (!creator_id || !action) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'Creator ID and action are required' });
        }
        
        if (action !== 'subscribe' && action !== 'unsubscribe') {
            console.log('❌ Invalid action');
            return res.status(400).json({ error: 'Action must be "subscribe" or "unsubscribe"' });
        }
        
        if (userId === creator_id) {
            console.log('❌ Cannot subscribe to yourself');
            return res.status(400).json({ error: 'Cannot subscribe to yourself' });
        }
        
        console.log('📺 Finding user:', userId);
        const user = await User.findById(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // 구독 대상 사용자 확인
        const creator = await User.findById(creator_id);
        if (!creator) {
            console.log('❌ Creator not found:', creator_id);
            return res.status(404).json({ error: 'Creator not found' });
        }
        
        console.log('📺 User found, current subscriptions:', user.subscriptions);
        
        // 구독 배열이 없으면 초기화
        if (!user.subscriptions || !Array.isArray(user.subscriptions)) {
            user.subscriptions = [];
            console.log('📺 Initialized subscriptions array for user');
        }
        
        // 구독 배열에서 해당 크리에이터 ID 찾기
        const subscriptionIndex = user.subscriptions.findIndex(id => id.toString() === creator_id);
        
        if (action === 'subscribe') {
            if (subscriptionIndex === -1) {
                // 구독 추가
                console.log('📺 Adding subscription for:', creator_id);
                user.subscriptions.push(creator_id);
                
                try {
                    await user.save();
                    console.log('✅ Subscription added, new subscriptions:', user.subscriptions);
                } catch (saveError) {
                    console.error('❌ Failed to save user:', saveError);
                    throw new Error('Failed to save subscription: ' + saveError.message);
                }
                
                res.json({ 
                    success: true, 
                    action: 'subscribed',
                    message: 'Successfully subscribed to creator' 
                });
            } else {
                res.json({ 
                    success: true, 
                    action: 'already_subscribed',
                    message: 'Already subscribed to this creator' 
                });
            }
        } else if (action === 'unsubscribe') {
            if (subscriptionIndex !== -1) {
                // 구독 제거
                console.log('📺 Removing subscription for:', creator_id);
                user.subscriptions.splice(subscriptionIndex, 1);
                
                try {
                    await user.save();
                    console.log('✅ Subscription removed, new subscriptions:', user.subscriptions);
                } catch (saveError) {
                    console.error('❌ Failed to save user:', saveError);
                    throw new Error('Failed to remove subscription: ' + saveError.message);
                }
                
                res.json({ 
                    success: true, 
                    action: 'unsubscribed',
                    message: 'Successfully unsubscribed from creator' 
                });
            } else {
                res.json({ 
                    success: true, 
                    action: 'not_subscribed',
                    message: 'Not subscribed to this creator' 
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Subscription API error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            error: 'Failed to update subscription',
            details: error.message 
        });
    }
});

// 구독한 채널의 비디오 조회 API
app.get('/api/user/subscriptions/videos', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        console.log('📺 Subscribed videos API called');
        const userId = req.user.userId;
        const { page = 1, limit = 12 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        console.log('📺 User ID:', userId);
        
        const user = await User.findById(userId).select('subscriptions');
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('📺 User subscriptions:', user.subscriptions);
        
        if (!user.subscriptions || user.subscriptions.length === 0) {
            console.log('📺 No subscriptions found');
            return res.json({
                videos: [],
                pagination: {
                    current_page: parseInt(page),
                    total_pages: 0,
                    total_count: 0,
                    has_next: false
                }
            });
        }
        
        // 구독한 사용자들의 비디오 조회
        const videos = await VEUrl.find({
            'creator_info.user_id': { $in: user.subscriptions },
            'creator_info.is_public': true
        })
        .select('ve_id title description reaction_url original_url metadata creator_info react_central')
        .sort({ 'metadata.created_at': -1 })
        .skip(skip)
        .limit(parseInt(limit));
        
        console.log('📺 Found subscribed videos:', videos.length);
        
        // 전체 개수 조회
        const totalCount = await VEUrl.countDocuments({
            'creator_info.user_id': { $in: user.subscriptions },
            'creator_info.is_public': true
        });
        
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
        console.error('❌ Subscribed videos API error:', error);
        res.status(500).json({ error: 'Failed to get subscribed videos' });
    }
});

// 사용자의 구독 목록 조회
app.get('/api/user/subscriptions', authenticateToken, ensureMongoConnection, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const user = await User.findById(userId).populate('subscriptions', 'username nickname email');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            subscriptions: user.subscriptions || [] 
        });
        
    } catch (error) {
        console.error('❌ Get subscriptions API error:', error);
        res.status(500).json({ error: 'Failed to get subscriptions' });
    }
});

// 북마크 필드 마이그레이션 (임시)
app.post('/api/migrate/bookmarks', ensureMongoConnection, async (req, res) => {
    try {
        console.log('🔄 Starting bookmarks migration...');
        
        const result = await User.updateMany(
            { bookmarks: { $exists: false } },
            { $set: { bookmarks: [] } }
        );
        
        console.log('✅ Migration completed:', result);
        
        res.json({
            success: true,
            message: 'Bookmarks field added to all users',
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });
    } catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});

// 디버깅: 사용자 데이터 직접 조회
app.get('/api/debug/user-data/:userId', ensureMongoConnection, async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('🔍 Debug API called for user:', userId);
        
        // 사용자 정보 조회
        const user = await User.findById(userId);
        console.log('🔍 User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('🔍 User ve_urls array:', user.ve_urls);
            console.log('🔍 User ve_urls length:', user.ve_urls?.length || 0);
        }
        
        // 해당 사용자의 VE URL들 조회 (creator_info.user_id로)
        const veUrlsByCreator = await VEUrl.find({ 'creator_info.user_id': userId });
        console.log('🔍 VE URLs by creator_info.user_id:', veUrlsByCreator.length);
        console.log('🔍 VE URL IDs by creator:', veUrlsByCreator.map(v => v._id));
        
        // users 배열의 ObjectId로 VE URL들 조회
        if (user && user.ve_urls && user.ve_urls.length > 0) {
            const veUrlsByArray = await VEUrl.find({ _id: { $in: user.ve_urls } });
            console.log('🔍 VE URLs by user array:', veUrlsByArray.length);
            console.log('🔍 VE URL IDs by array:', veUrlsByArray.map(v => v._id));
        }
        
        res.json({
            user: user ? {
                _id: user._id,
                username: user.username,
                nickname: user.nickname,
                ve_urls: user.ve_urls,
                ve_urls_count: user.ve_urls?.length || 0
            } : null,
            ve_urls_by_creator: veUrlsByCreator.map(v => ({
                _id: v._id,
                ve_id: v.ve_id,
                title: v.title,
                creator_user_id: v.creator_info?.user_id
            })),
            ve_urls_by_array: user && user.ve_urls ? 
                (await VEUrl.find({ _id: { $in: user.ve_urls } })).map(v => ({
                    _id: v._id,
                    ve_id: v.ve_id,
                    title: v.title,
                    creator_user_id: v.creator_info?.user_id
                })) : []
        });
        
    } catch (error) {
        console.error('❌ Debug API error:', error);
        res.status(500).json({ error: 'Debug failed' });
    }
});

// 정리: 잘못된 ObjectId 제거 및 올바른 ObjectId 추가
app.post('/api/cleanup/user-ve-urls', ensureMongoConnection, async (req, res) => {
    try {
        console.log('🧹 Starting cleanup: fixing user ve_urls array...');
        
        // 모든 사용자 조회
        const users = await User.find({ ve_urls: { $exists: true, $ne: [] } });
        console.log(`📊 Found ${users.length} users with ve_urls array`);
        
        let cleanedCount = 0;
        let errorCount = 0;
        
        for (const user of users) {
            try {
                console.log(`🔍 Processing user: ${user.username} (${user._id})`);
                console.log(`🔍 Current ve_urls:`, user.ve_urls);
                
                // 이 사용자가 생성한 실제 VE URL들 조회
                const actualVeUrls = await VEUrl.find({ 'creator_info.user_id': user._id.toString() });
                console.log(`🔍 Found ${actualVeUrls.length} actual VE URLs for this user`);
                
                // 실제 VE URL의 ObjectId들만 추출
                const correctVeUrlIds = actualVeUrls.map(veUrl => veUrl._id);
                console.log(`🔍 Correct VE URL IDs:`, correctVeUrlIds);
                
                // 사용자의 ve_urls 배열을 올바른 ObjectId들로 업데이트
                await User.findByIdAndUpdate(
                    user._id,
                    { $set: { ve_urls: correctVeUrlIds } },
                    { new: true }
                );
                
                console.log(`✅ Cleaned up user ${user.username}`);
                cleanedCount++;
                
            } catch (error) {
                console.error(`❌ Failed to cleanup user ${user.username}:`, error);
                errorCount++;
            }
        }
        
        console.log(`✅ Cleanup completed: ${cleanedCount} cleaned, ${errorCount} errors`);
        res.json({
            message: 'Cleanup completed',
            total: users.length,
            cleaned: cleanedCount,
            errors: errorCount
        });
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// 마이그레이션: 기존 VE URL들을 users 배열에 추가
app.post('/api/migrate/user-ve-urls', ensureMongoConnection, async (req, res) => {
    try {
        console.log('🔄 Starting migration: adding VE URLs to users array...');
        
        // 모든 VE URL 조회
        const veUrls = await VEUrl.find({ 'creator_info.user_id': { $exists: true } });
        console.log(`📊 Found ${veUrls.length} VE URLs with user_id`);
        
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const veUrl of veUrls) {
            try {
                const userId = veUrl.creator_info.user_id;
                if (userId) {
                    // 사용자의 ve_urls 배열에 추가 (중복 방지)
                    await User.findByIdAndUpdate(
                        userId,
                        { $addToSet: { ve_urls: veUrl._id } },
                        { new: true }
                    );
                    updatedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to update user ${veUrl.creator_info.user_id}:`, error);
                errorCount++;
            }
        }
        
        console.log(`✅ Migration completed: ${updatedCount} updated, ${errorCount} errors`);
        res.json({
            message: 'Migration completed',
            total: veUrls.length,
            updated: updatedCount,
            errors: errorCount
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({ error: 'Migration failed' });
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