const http = require('http');
const url = require('url');

const LIVEKIT_URL = "wss://online-study-room-97165lrg.livekit.cloud";
const API_KEY = "APIzU5ULUK3iCrE";
const API_SECRET = "m4Z24PNNwR1YBoKPiER7kYP2XPdHYkDCpnl80INFOEJ";

let AccessToken;
try {
    const livekit = require('livekit-server-sdk');
    AccessToken = livekit.AccessToken;
    console.log('✅ livekit-server-sdk 加载成功');
} catch (e) {
    console.log('❌ 请先运行: npm install livekit-server-sdk');
    console.log('错误详情:', e.message);
    process.exit(1);
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/token' && req.method === 'GET') {
        const roomName = parsedUrl.query.roomName || 'default-room';
        const participantName = parsedUrl.query.participantName || 'anonymous';
        
        console.log(`📝 生成Token: 房间=${roomName}, 用户=${participantName}`);
        
        try {
            const at = new AccessToken(API_KEY, API_SECRET, {
                identity: participantName,
                ttl: 24 * 3600,
            });
            
            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true,
            });
            
            const token = at.toJwt();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token: token, success: true }));
        } catch (err) {
            console.error('❌ 生成失败:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message, success: false }));
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('✅ Token 生成服务已启动！');
    console.log(`📡 地址: http://localhost:${PORT}/token`);
    console.log('========================================');
    console.log('');
});