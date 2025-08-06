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

// MongoDB 연결 설정 개선
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,  // 15초로 증가
    connectTimeoutMS: 15000,          // 15초로 증가
    socketTimeoutMS: 45000,           // 45초로 증가
    maxPoolSize: 20,                  // 풀 크기 증가
    minPoolSize: 5,                   // 최소 풀 크기 증가
    maxIdleTimeMS: 60000,             // 60초로 증가
    retryWrites: true,
    w: 'majority',
    retryReads: true,
    bufferCommands: false,            // 버퍼링 비활성화
    bufferMaxEntries: 0
});

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
// connectToMongoDB().catch(console.error); // 이 부분은 더 이상 필요 없음

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
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
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
        console.log('📥 Received VE URL creation request');
        console.log('📥 Request body keys:', Object.keys(req.body));
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            reactionUrl,
            originalUrl,
            timestampData,
            settings,
            metadata,
            userInfo,
            accessControl
        } = req.body;

        // 필수 필드 검증
        if (!reactionUrl || !originalUrl || !timestampData || !userInfo) {
            console.log('❌ Missing required fields');
            console.log('❌ reactionUrl:', !!reactionUrl);
            console.log('❌ originalUrl:', !!originalUrl);
            console.log('❌ timestampData:', !!timestampData);
            console.log('❌ userInfo:', !!userInfo);
            return res.status(400).json({ 
                error: 'Missing required fields: reactionUrl, originalUrl, timestampData, userInfo' 
            });
        }

        console.log('✅ All required fields present');

        // 고유 VE ID 생성
        const ve_id = 've_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('✅ Generated VE ID:', ve_id);

        // 사용자 정보 처리 (인증 없이도 작동)
        let creator_id = null;
        if (userInfo && userInfo.email) {
            try {
                console.log('👤 Processing user info for email:', userInfo.email);
                // 기존 사용자 확인 또는 새 사용자 생성
                const userPromise = User.findOne({ email: userInfo.email });
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('User lookup timeout')), 5000)
                );
                
                let user = await Promise.race([userPromise, timeoutPromise]);
                
                if (!user) {
                    console.log('👤 Creating new user');
                    // 새 사용자 생성 (임시)
                    const password_hash = await bcrypt.hash(userInfo.password || 'temp123', 10);
                    user = new User({
                        username: userInfo.username || 'Anonymous',
                        email: userInfo.email,
                        password_hash
                    });
                    
                    // 사용자 저장 시도 함수
                    const saveUserWithRetry = async (user, maxRetries = 3) => {
                        for (let attempt = 1; attempt <= maxRetries; attempt++) {
                            try {
                                console.log(`👤 User save attempt ${attempt}/${maxRetries}...`);
                                
                                const savePromise = user.save();
                                const saveTimeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error(`User save timeout (attempt ${attempt})`)), 10000)
                                );
                                
                                await Promise.race([savePromise, saveTimeoutPromise]);
                                console.log(`✅ User saved successfully on attempt ${attempt}`);
                                return;
                            } catch (error) {
                                console.error(`❌ User save attempt ${attempt} failed:`, error.message);
                                if (attempt === maxRetries) {
                                    throw error;
                                }
                                // 잠시 대기 후 재시도
                                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                            }
                        }
                    };
                    
                    await saveUserWithRetry(user);
                    console.log('✅ New user created');
                } else {
                    console.log('✅ Existing user found');
                }
                creator_id = user._id;
            } catch (userError) {
                console.error('❌ User creation error:', userError);
                // 사용자 생성 실패해도 VE URL은 생성
            }
        } else {
            console.log('👤 No user email provided, creating anonymous VE URL');
        }

        console.log('🏗️ Creating VE URL object...');
        const veUrl = new VEUrl({
            ve_id,
            creator_id: creator_id,
            title: metadata?.title || 'Synchronized Reaction Video',
            description: metadata?.description || 'Reaction video synchronized with original video',
            reaction_url: reactionUrl,
            original_url: originalUrl,
            timestamp_data: timestampData,
            settings: settings || {
                overlay_position: 'top-right',
                overlay_size: 50,
                youtube_volume: 100
            },
            access_control: accessControl || {
                is_public: true,
                allowed_users: [],
                password: null
            },
            metadata: {
                created_at: new Date(),
                updated_at: new Date(),
                view_count: 0,
                is_public: true
            }
        });

        console.log('💾 Saving VE URL to database...');
        
        // 저장 시도 함수
        const saveWithRetry = async (veUrl, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`💾 Save attempt ${attempt}/${maxRetries}...`);
                    
                    // 타임아웃과 함께 저장
                    const savePromise = veUrl.save();
                    const saveTimeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`VE URL save timeout (attempt ${attempt})`)), 15000)
                    );
                    
                    await Promise.race([savePromise, saveTimeoutPromise]);
                    console.log(`✅ VE URL saved successfully on attempt ${attempt}`);
                    return;
                } catch (error) {
                    console.error(`❌ Save attempt ${attempt} failed:`, error.message);
                    if (attempt === maxRetries) {
                        throw error;
                    }
                    // 잠시 대기 후 재시도
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        };
        
        await saveWithRetry(veUrl);
        console.log('✅ VE URL saved to database:', veUrl.ve_id);

        // 사용자가 있는 경우 ve_urls 배열에 추가 (선택적)
        if (creator_id) {
            try {
                console.log('👤 Updating user with VE URL reference...');
                
                // 사용자 업데이트 시도 함수
                const updateUserWithRetry = async (creator_id, veUrl_id, maxRetries = 3) => {
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`👤 User update attempt ${attempt}/${maxRetries}...`);
                            
                            const updatePromise = User.findByIdAndUpdate(
                                creator_id,
                                { $push: { ve_urls: veUrl_id } }
                            );
                            const updateTimeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error(`User update timeout (attempt ${attempt})`)), 10000)
                            );
                            
                            await Promise.race([updatePromise, updateTimeoutPromise]);
                            console.log(`✅ User updated successfully on attempt ${attempt}`);
                            return;
                        } catch (error) {
                            console.error(`❌ User update attempt ${attempt} failed:`, error.message);
                            if (attempt === maxRetries) {
                                throw error;
                            }
                            // 잠시 대기 후 재시도
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }
                    }
                };
                
                await updateUserWithRetry(creator_id, veUrl._id);
                console.log('✅ User updated with VE URL reference');
            } catch (updateError) {
                console.error('❌ User update error:', updateError);
                // 사용자 업데이트 실패해도 VE URL 생성은 성공
            }
        }

        const fullUrl = `${req.protocol}://${req.get('host')}/viewer.html?ve_server=${veUrl.ve_id}`;
        const shortUrl = `${req.protocol}://${req.get('host')}/ve/${veUrl.ve_id}`;
        
        console.log('🔗 Generated URLs:');
        console.log('🔗 Full URL:', fullUrl);
        console.log('🔗 Short URL:', shortUrl);
        
        const response = {
            message: 'VE URL created successfully',
            ve_url: {
                id: veUrl._id,
                ve_id: veUrl.ve_id,
                title: veUrl.title,
                share_url: shortUrl,
                full_url: fullUrl
            }
        };
        
        console.log('📤 Sending response:', JSON.stringify(response, null, 2));
        res.status(201).json(response);
        
    } catch (error) {
        console.error('❌ VE URL creation error:', error);
        
        // MongoDB 연결 오류인지 확인
        if (error.message.includes('buffering timed out') || error.message.includes('MongoNetworkError')) {
            res.status(503).json({ 
                error: 'Database connection timeout. Please try again in a few moments.' 
            });
        } else {
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
});

// VE URL 조회 엔드포인트 추가
app.get('/api/ve-urls/:id', async (req, res) => {
    try {
        console.log('📥 VE URL lookup request for ID:', req.params.id);
        
        const veUrl = await VEUrl.findOne({ ve_id: req.params.id });
        
        if (!veUrl) {
            console.log('❌ VE URL not found:', req.params.id);
            return res.status(404).json({ error: 'VE URL not found' });
        }
        
        console.log('✅ VE URL found:', veUrl.ve_id);
        
        // 조회수 증가 (타임아웃 처리)
        try {
            veUrl.metadata.view_count += 1;
            const savePromise = veUrl.save();
            const saveTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('View count save timeout')), 5000)
            );
            await Promise.race([savePromise, saveTimeoutPromise]);
            console.log('✅ View count updated');
        } catch (saveError) {
            console.error('❌ View count save error:', saveError);
            // 조회수 저장 실패해도 데이터는 반환
        }
        
        // 뷰어에서 필요한 형식으로 데이터 반환
        const veData = {
            ve_url: {
                ve_id: veUrl.ve_id,
                title: veUrl.title,
                description: veUrl.description,
                reaction_url: veUrl.reaction_url,
                original_url: veUrl.original_url,
                timestamp_data: veUrl.timestamp_data,
                settings: veUrl.settings,
                access_control: veUrl.access_control,
                metadata: veUrl.metadata
            }
        };
        
        console.log('📤 Sending VE URL data to viewer');
        res.json(veData);
        
    } catch (error) {
        console.error('❌ VE URL lookup error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
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
        if (veUrl.creator_id && veUrl.creator_id.toString() !== req.user.userId) {
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
        if (veUrl.creator_id && veUrl.creator_id.toString() !== req.user.userId) {
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

        // 조회수 증가 (타임아웃 처리 추가)
        try {
            veUrl.metadata.view_count += 1;
            const savePromise = veUrl.save();
            const saveTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('View count save timeout')), 5000)
            );
            await Promise.race([savePromise, saveTimeoutPromise]);
        } catch (saveError) {
            console.error('View count save error:', saveError);
            // 조회수 저장 실패해도 리다이렉트는 진행
        }

        // viewer.html로 리다이렉트
        const viewerUrl = `${req.protocol}://${req.get('host')}/viewer.html?ve_server=${veUrl.ve_id}`;
        res.redirect(viewerUrl);
    } catch (error) {
        console.error('Short URL route error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
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