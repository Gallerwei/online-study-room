// ============ 数据存储 ============
let rooms = [
    { id: 'zpp', name: 'zpp', currentCount: 0, maxCount: 10, hasPassword: false },
    { id: 'bdecab7a', name: 'bdecab7a', currentCount: 0, maxCount: 10, hasPassword: false }
];
let currentRoom = null;
let currentUserName = '';
let localStream = null;
let micEnabled = true;
let cameraEnabled = true;

// 番茄钟变量
let timerSeconds = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let timerStatus = '专注时间';

// 聊天
let messages = [];

// ============ DOM 元素 ============
const roomsGrid = document.getElementById('roomsGrid');
const createModal = document.getElementById('createModal');
const aboutModal = document.getElementById('aboutModal');
const roomView = document.getElementById('roomView');
const roomInfo = document.getElementById('roomInfo');
const localVideo = document.getElementById('localVideo');
const videoGrid = document.getElementById('videoGrid');
const toggleMicBtn = document.getElementById('toggleMicBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const timerDisplay = document.getElementById('timerDisplay');
const timerStatusEl = document.getElementById('timerStatus');
const startTimerBtn = document.getElementById('startTimerBtn');
const pauseTimerBtn = document.getElementById('pauseTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');

// ============ 辅助函数 ============
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timerSeconds);
}

function addChatMessage(name, text, time = null) {
    const msgTime = time || new Date().toLocaleTimeString();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.innerHTML = `
        <span class="chat-name">${escapeHtml(name)}：</span>
        <span class="chat-text">${escapeHtml(text)}</span>
        <span class="chat-time">${msgTime}</span>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ 渲染房间列表 ============
function renderRooms() {
    roomsGrid.innerHTML = '';
    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.onclick = () => joinRoom(room.id);
        card.innerHTML = `
            <div class="room-name">${escapeHtml(room.name)}</div>
            <div class="room-id">${room.id}</div>
            <div class="room-info">${room.currentCount}/${room.maxCount}人</div>
            <div class="room-type">${room.hasPassword ? '🔒 私密' : '🌐 公开'}</div>
        `;
        roomsGrid.appendChild(card);
    });
}

// ============ 加入房间 ============
async function joinRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        alert('房间不存在');
        return;
    }
    
    currentRoom = { ...room, currentCount: room.currentCount + 1 };
    room.currentCount++;
    
    renderRooms();
    
    // 显示自习室界面
    roomView.style.display = 'flex';
    roomInfo.textContent = `🏠 房间号：${currentRoom.id} | 👥 在线：${currentRoom.currentCount}人`;
    
    // 初始化摄像头
    await initCamera();
    
    // 加载聊天记录
    loadChatHistory();
}

// ============ 初始化摄像头 ============
async function initCamera() {
    try {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error('无法获取摄像头:', err);
        alert('无法获取摄像头/麦克风，请检查权限');
    }
}

// ============ 创建房间 ============
function createRoom() {
    const name = document.getElementById('roomName').value.trim();
    const maxCount = parseInt(document.getElementById('maxCount').value);
    const password = document.getElementById('roomPassword').value;
    
    if (!name) {
        alert('请输入房间名称');
        return;
    }
    
    const roomId = Math.random().toString(36).substring(2, 10);
    const newRoom = {
        id: roomId,
        name: name,
        currentCount: 1,
        maxCount: maxCount,
        hasPassword: password !== ''
    };
    
    rooms.unshift(newRoom);
    renderRooms();
    
    // 关闭弹窗
    createModal.style.display = 'none';
    
    // 自动加入新房间
    currentRoom = newRoom;
    roomView.style.display = 'flex';
    roomInfo.textContent = `🏠 房间号：${currentRoom.id} | 👥 在线：${currentRoom.currentCount}人`;
    initCamera();
    loadChatHistory();
    
    // 清空表单
    document.getElementById('roomName').value = '';
    document.getElementById('maxCount').value = '10';
    document.getElementById('roomPassword').value = '';
}

// ============ 离开房间 ============
function leaveRoom() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (currentRoom) {
        const room = rooms.find(r => r.id === currentRoom.id);
        if (room) {
            room.currentCount--;
            renderRooms();
        }
    }
    currentRoom = null;
    roomView.style.display = 'none';
    
    // 重置番茄钟
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerRunning = false;
    timerSeconds = 25 * 60;
    timerStatus = '专注时间';
    updateTimerDisplay();
    timerStatusEl.textContent = timerStatus;
}

// ============ 番茄钟功能 ============
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerRunning = true;
    startTimerBtn.style.display = 'none';
    pauseTimerBtn.style.display = 'inline-block';
    
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            pauseTimer();
            alert('番茄钟时间到！休息一下吧~');
            timerStatus = timerStatus === '专注时间' ? '休息时间' : '专注时间';
            timerSeconds = timerStatus === '专注时间' ? 25 * 60 : 5 * 60;
            timerStatusEl.textContent = timerStatus;
            updateTimerDisplay();
            startTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerRunning = false;
    startTimerBtn.style.display = 'inline-block';
    pauseTimerBtn.style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 25 * 60;
    timerStatus = '专注时间';
    timerStatusEl.textContent = timerStatus;
    updateTimerDisplay();
}

// ============ 聊天功能 ============
function loadChatHistory() {
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        addChatMessage(msg.name, msg.text, msg.time);
    });
    if (messages.length === 0) {
        addChatMessage('系统', '欢迎来到自习室！');
    }
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    const name = document.getElementById('quickJoinName').value.trim() || '匿名';
    const message = {
        name: name,
        text: text,
        time: new Date().toLocaleTimeString()
    };
    messages.push(message);
    addChatMessage(name, text, message.time);
    chatInput.value = '';
}

// ============ 视频控制 ============
function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            micEnabled = audioTrack.enabled;
            toggleMicBtn.textContent = micEnabled ? '🎤 关闭麦克风' : '🎤 开启麦克风';
        }
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            cameraEnabled = videoTrack.enabled;
            toggleCameraBtn.textContent = cameraEnabled ? '📷 关闭摄像头' : '📷 开启摄像头';
        }
    }
}

// ============ Tab 切换 ============
function switchTab(tabId) {
    const videoPanel = document.getElementById('videoPanel');
    const pomodoroPanel = document.getElementById('pomodoroPanel');
    const chatPanel = document.getElementById('chatPanel');
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    
    videoPanel.style.display = 'none';
    pomodoroPanel.style.display = 'none';
    chatPanel.style.display = 'none';
    
    if (tabId === 'video') {
        videoPanel.style.display = 'flex';
        tabs[0].classList.add('active');
    } else if (tabId === 'pomodoro') {
        pomodoroPanel.style.display = 'block';
        tabs[1].classList.add('active');
    } else if (tabId === 'chat') {
        chatPanel.style.display = 'flex';
        tabs[2].classList.add('active');
    }
}

// ============ 事件绑定 ============
function bindEvents() {
    document.getElementById('createRoomBtn').onclick = () => {
        createModal.style.display = 'flex';
    };
    document.getElementById('cancelCreateBtn').onclick = () => {
        createModal.style.display = 'none';
    };
    document.getElementById('confirmCreateBtn').onclick = createRoom;
    document.getElementById('createModalOverlay').onclick = () => {
        createModal.style.display = 'none';
    };
    
    document.getElementById('aboutBtn').onclick = () => {
        aboutModal.style.display = 'flex';
    };
    document.getElementById('closeAboutBtn').onclick = () => {
        aboutModal.style.display = 'none';
    };
    document.getElementById('aboutModalOverlay').onclick = () => {
        aboutModal.style.display = 'none';
    };
    
    document.getElementById('quickJoinBtn').onclick = () => {
        const roomId = document.getElementById('quickJoinRoomId').value.trim();
        if (roomId) {
            joinRoom(roomId);
        } else {
            alert('请输入房间号');
        }
    };
    
    document.getElementById('refreshBtn').onclick = () => {
        renderRooms();
    };
    
    document.getElementById('leaveRoomBtn').onclick = leaveRoom;
    
    toggleMicBtn.onclick = toggleMic;
    toggleCameraBtn.onclick = toggleCamera;
    
    startTimerBtn.onclick = startTimer;
    pauseTimerBtn.onclick = pauseTimer;
    resetTimerBtn.onclick = resetTimer;
    
    sendMsgBtn.onclick = sendMessage;
    chatInput.onkeyup = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    const tabs = document.querySelectorAll('.tab');
    tabs[0].onclick = () => switchTab('video');
    tabs[1].onclick = () => switchTab('pomodoro');
    tabs[2].onclick = () => switchTab('chat');
}

// ============ 初始化 ============
renderRooms();
bindEvents();

// 设置初始数据
messages = [
    { name: '系统', text: '欢迎来到自习室！', time: '刚刚' },
    { name: '同学A', text: '大家加油学习！', time: '刚刚' }
];
loadChatHistory();