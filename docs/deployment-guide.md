# VE URL Server Deployment Guide

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ve-url-system

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp server-example/env.example server-example/.env
# Edit .env file with your configuration

# 4. Install MongoDB (or use MongoDB Atlas)
# Local: brew install mongodb-community (macOS)
# Or use MongoDB Atlas cloud service

# 5. Start the server
cd server-example
npm run dev
```

### 2. Production Deployment

#### Option A: Heroku Deployment

```bash
# 1. Install Heroku CLI
# Download from https://devcenter.heroku.com/articles/heroku-cli

# 2. Login to Heroku
heroku login

# 3. Create Heroku app
heroku create your-ve-url-app

# 4. Add MongoDB addon
heroku addons:create mongolab

# 5. Set environment variables
heroku config:set JWT_SECRET=your-production-secret
heroku config:set NODE_ENV=production

# 6. Deploy
git push heroku main
```

#### Option B: AWS EC2 Deployment

```bash
# 1. Launch EC2 instance (Ubuntu 20.04)
# 2. Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Install Node.js and MongoDB
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 4. Clone and setup application
git clone <your-repo-url>
cd ve-url-system/server-example
npm install

# 5. Setup environment
cp env.example .env
# Edit .env file

# 6. Setup PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name "ve-url-server"

# 7. Setup Nginx (optional)
sudo apt-get install nginx
# Configure nginx to proxy to Node.js app
```

#### Option C: DigitalOcean Droplet

```bash
# 1. Create Droplet (Ubuntu 20.04)
# 2. Connect to droplet
ssh root@your-droplet-ip

# 3. Follow AWS EC2 steps (same process)
# 4. Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ve_url_system
JWT_SECRET=your-super-secret-key

# Optional
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
```

### Database Setup

#### MongoDB Atlas (Recommended)
1. Create account at https://cloud.mongodb.com
2. Create new cluster
3. Get connection string
4. Add to MONGODB_URI

#### Local MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database
mongo
use ve_url_system
```

## 🔐 Security Setup

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Or iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 📊 Monitoring

### PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "ve-url-server"

# Monitor
pm2 monit
pm2 logs

# Auto-restart on server reboot
pm2 startup
pm2 save
```

### Logging
```bash
# View logs
pm2 logs ve-url-server

# Or with timestamps
pm2 logs ve-url-server --timestamp
```

## 🚀 Scaling

### Load Balancer (Nginx)
```nginx
# /etc/nginx/sites-available/ve-url
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Multiple Instances
```bash
# Start multiple instances
pm2 start server.js --name "ve-url-server-1" --instances 1
pm2 start server.js --name "ve-url-server-2" --instances 1
pm2 start server.js --name "ve-url-server-3" --instances 1
```

## 💰 Cost Optimization

### AWS Cost Optimization
- Use EC2 Spot Instances for development
- Use S3 Intelligent Tiering for storage
- Enable CloudFront CDN for global access
- Use AWS Lambda for serverless functions

### DigitalOcean Cost Optimization
- Use basic droplets for development
- Upgrade only when needed
- Use object storage for file uploads
- Enable CDN for static assets

## 🔍 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check logs
sudo journalctl -u mongod
```

#### 2. Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h

# Increase Node.js memory limit
node --max-old-space-size=4096 server.js
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

## 📈 Performance Optimization

### Database Optimization
```javascript
// Add indexes to MongoDB
db.ve_urls.createIndex({ "ve_id": 1 })
db.ve_urls.createIndex({ "creator_id": 1 })
db.ve_urls.createIndex({ "metadata.created_at": -1 })
```

### Caching
```javascript
// Add Redis for caching
const redis = require('redis');
const client = redis.createClient();

// Cache VE URL data
app.get('/api/ve-urls/:id', async (req, res) => {
    const cached = await client.get(`ve_url:${req.params.id}`);
    if (cached) {
        return res.json(JSON.parse(cached));
    }
    // ... fetch from database
    await client.setex(`ve_url:${req.params.id}`, 3600, JSON.stringify(data));
});
```

### CDN Setup
```bash
# CloudFlare (Free)
# 1. Add domain to CloudFlare
# 2. Update nameservers
# 3. Enable CDN

# AWS CloudFront
# 1. Create distribution
# 2. Point to your domain
# 3. Update DNS records
```

## 🎯 Next Steps

1. **Set up monitoring** (New Relic, DataDog)
2. **Implement backup strategy** (automated MongoDB backups)
3. **Add CI/CD pipeline** (GitHub Actions, GitLab CI)
4. **Set up alerts** (UptimeRobot, Pingdom)
5. **Implement analytics** (Google Analytics, Mixpanel)
6. **Add rate limiting** (express-rate-limit)
7. **Implement caching** (Redis)
8. **Add file upload** (AWS S3, Cloudinary) 