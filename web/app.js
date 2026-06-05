// Global state
let loadedCookieData = "";
let defaultDownloadDir = "";
let clearedTaskIds = new Set();
let isPolling = false;
let pollingInterval = null;
let activeLogScrolls = {}; // Keeps track of scroll positions of console logs

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    initFileDropzone();
    fetchConfig();
    setupEventListeners();
    startPolling();
});

// Toast Manager
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-msg">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

// Fetch config from backend
async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const data = await response.json();
            defaultDownloadDir = data.default_download_dir;
            const dirInput = document.getElementById('download-dir');
            dirInput.value = defaultDownloadDir;
            dirInput.placeholder = defaultDownloadDir;
        }
    } catch (err) {
        console.error('获取默认配置失败:', err);
        showToast('未能连接到后台服务器', 'error');
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Download button
    document.getElementById('btn-start-download').addEventListener('click', handleDownloadStart);
    
    // Use default dir button
    document.getElementById('btn-use-default').addEventListener('click', () => {
        document.getElementById('download-dir').value = defaultDownloadDir;
        showToast('已恢复默认下载目录', 'info');
    });
    
    // Clear completed tasks button
    document.getElementById('btn-clear-completed').addEventListener('click', handleClearCompleted);
    
    // Clear cookies button
    document.getElementById('btn-remove-cookie').addEventListener('click', (e) => {
        e.stopPropagation();
        resetCookieUpload();
    });
}

// File Drag & Drop Handlers
function initFileDropzone() {
    const dropzone = document.getElementById('cookie-dropzone');
    const fileInput = document.getElementById('cookie-file');
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleCookieFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleCookieFile(fileInput.files[0]);
        }
    });
}

function handleCookieFile(file) {
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showToast('只支持 .txt 格式的 Cookie 文件', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        loadedCookieData = e.target.result;
        
        // Update UI to show uploaded file
        document.querySelector('.upload-placeholder').classList.add('hidden');
        const infoContainer = document.getElementById('file-info-container');
        infoContainer.classList.remove('hidden');
        
        // Hide the absolute-positioned file input so it doesn't block the delete button
        document.getElementById('cookie-file').classList.add('hidden');
        
        document.getElementById('uploaded-file-name').textContent = file.name;
        document.getElementById('uploaded-file-size').textContent = formatBytes(file.size);
        
        showToast('Cookie 文件载入成功', 'success');
    };
    reader.onerror = () => {
        showToast('无法读取文件内容', 'error');
        resetCookieUpload();
    };
    reader.readAsText(file);
}

function resetCookieUpload() {
    loadedCookieData = "";
    document.getElementById('cookie-file').value = "";
    document.querySelector('.upload-placeholder').classList.remove('hidden');
    document.getElementById('file-info-container').classList.add('hidden');
    
    // Show the file input again so a new file can be selected
    document.getElementById('cookie-file').classList.remove('hidden');
}

// Download triggering
async function handleDownloadStart() {
    const urlsText = document.getElementById('video-urls').value;
    const downloadDir = document.getElementById('download-dir').value;
    const cookiesBrowser = document.getElementById('cookies-browser').value;
    
    // Parse URLs
    const urls = urlsText.split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);
        
    if (urls.length === 0) {
        showToast('请输入至少一个视频链接', 'error');
        return;
    }
    
    const startBtn = document.getElementById('btn-start-download');
    startBtn.disabled = true;
    startBtn.querySelector('span').textContent = '正在发起请求...';
    
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                urls: urls,
                cookie_data: loadedCookieData,
                cookies_from_browser: cookiesBrowser,
                download_dir: downloadDir
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast('任务已成功发起到后台', 'success');
            document.getElementById('video-urls').value = ''; // Clean input
        } else {
            showToast(result.error || '创建下载任务失败', 'error');
        }
    } catch (err) {
        console.error('提交任务失败:', err);
        showToast('网络连接失败，请检查后端服务', 'error');
    } finally {
        startBtn.disabled = false;
        startBtn.querySelector('span').textContent = '一键高速下载';
    }
}

// Polling tasks progress
function startPolling() {
    if (isPolling) return;
    isPolling = true;
    
    pollTasks();
    pollingInterval = setInterval(pollTasks, 800);
}

async function pollTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) return;
        const tasks = await response.json();
        
        // Filter out cleared tasks
        const visibleTasks = tasks.filter(t => !clearedTaskIds.has(t.id));
        
        renderTasksList(visibleTasks);
    } catch (err) {
        console.error('轮询任务失败:', err);
    }
}

// Clear finished / error task cards from viewport
function handleClearCompleted() {
    const cards = document.querySelectorAll('.task-card');
    let clearedCount = 0;
    
    cards.forEach(card => {
        const taskId = card.id.replace('task-', '');
        const statusBadge = card.querySelector('.task-status-badge');
        
        if (statusBadge) {
            const hasFinished = statusBadge.classList.contains('status-finished') || 
                               statusBadge.classList.contains('status-cancelled') || 
                               statusBadge.classList.contains('status-error');
            if (hasFinished) {
                clearedTaskIds.add(taskId);
                card.remove();
                clearedCount++;
            }
        }
    });
    
    if (clearedCount > 0) {
        showToast(`已隐藏 ${clearedCount} 个已完成的任务卡片`, 'info');
    } else {
        showToast('没有可清除的非活动任务', 'info');
    }
    
    // Check if view is now empty
    const remainingCards = document.querySelectorAll('.task-card');
    if (remainingCards.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
    }
}

// Dom Renderer (Selective update to prevent flicker/scroll issues)
function renderTasksList(tasks) {
    const container = document.getElementById('tasks-container');
    const emptyState = document.getElementById('empty-state');
    
    if (tasks.length === 0) {
        emptyState.classList.remove('hidden');
        // Clear all elements other than emptyState
        Array.from(container.children).forEach(child => {
            if (child !== emptyState) child.remove();
        });
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Track existing DOM task IDs
    const currentDomIds = new Set();
    
    tasks.forEach(task => {
        currentDomIds.add(`task-${task.id}`);
        updateOrCreateTaskCard(container, task);
    });
    
    // Remove tasks that are no longer returned by server (and not manually blacklisted)
    Array.from(container.children).forEach(child => {
        if (child !== emptyState && !currentDomIds.has(child.id)) {
            child.remove();
        }
    });
}

function updateOrCreateTaskCard(container, task) {
    let card = document.getElementById(`task-${task.id}`);
    
    // Translate status to Chinese
    let statusText = '准备中';
    let statusClass = 'status-pending';
    let fillClass = 'neutral';
    
    if (task.status === 'downloading') {
        statusText = `下载中 ${task.current_url_index}/${task.total_urls_count}`;
        statusClass = 'status-downloading';
        fillClass = 'primary';
    } else if (task.status === 'finished') {
        statusText = '已完成';
        statusClass = 'status-finished';
        fillClass = 'success';
    } else if (task.status === 'cancelled') {
        statusText = '已取消';
        statusClass = 'status-cancelled';
        fillClass = 'neutral';
    } else if (task.status === 'error') {
        statusText = '错误';
        statusClass = 'status-error';
        fillClass = 'danger';
    }
    
    const formattedSpeed = task.speed ? `${(task.speed / (1024 * 1024)).toFixed(1)} MB/s` : '--';
    const formattedEta = task.eta ? formatSeconds(task.eta) : '--';
    const formattedSize = task.total_bytes ? formatBytes(task.total_bytes) : '--';
    const formattedDownloaded = task.downloaded_bytes ? formatBytes(task.downloaded_bytes) : '0 B';
    const isFinished = ['finished', 'cancelled', 'error'].includes(task.status);
    
    if (!card) {
        // Create new task card
        card = document.createElement('div');
        card.className = 'task-card';
        card.id = `task-${task.id}`;
        
        card.innerHTML = `
            <div class="task-header">
                <div class="task-title-area">
                    <span class="task-title" title="${task.filename || task.urls[0]}">${task.filename || task.urls[0]}</span>
                    <span class="task-url" title="${task.urls.join(', ')}">${task.urls.join(', ')}</span>
                </div>
                <span class="task-status-badge ${statusClass}">${statusText}</span>
            </div>
            
            <div class="task-stats">
                <div class="stat-item">
                    <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-3-3.1-5.4-6.1-5.7-4-.4-7.3 2.7-7.3 6.6 0 1.2.3 2.4 1 3.4M12 12v4M12 12l2 2M12 12l-2 2"/></svg>
                    <span class="stat-label">进度:</span>
                    <span class="stat-value text-progress">${formattedDownloaded} / ${formattedSize}</span>
                </div>
                <div class="stat-item">
                    <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
                    <span class="stat-label">速度:</span>
                    <span class="stat-value text-speed">${formattedSpeed}</span>
                </div>
                <div class="stat-item">
                    <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span class="stat-label">剩余时间:</span>
                    <span class="stat-value text-eta">${formattedEta}</span>
                </div>
            </div>
            
            <div class="progress-container">
                <div class="progress-track">
                    <div class="progress-fill ${fillClass}" style="width: ${task.percent}%"></div>
                </div>
                <span class="progress-percent ${fillClass}">${task.percent.toFixed(1)}%</span>
            </div>
            
            <div class="task-actions">
                <button class="btn-action-small btn-action-danger btn-cancel" ${isFinished ? 'style="display:none"' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                    <span>取消下载</span>
                </button>
                <button class="btn-action-small btn-action-primary btn-open-folder" ${!isFinished ? 'style="display:none"' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    <span>打开文件夹</span>
                </button>
            </div>
            
            <div class="log-accordion">
                <div class="log-header">
                    <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:0.85rem;height:0.85rem;"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        控制台输出日志
                    </span>
                    <svg class="log-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="log-content">
                    <div class="log-console"></div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Event listener for log collapse
        const logHeader = card.querySelector('.log-header');
        const logContent = card.querySelector('.log-content');
        const logArrow = card.querySelector('.log-arrow');
        
        logHeader.addEventListener('click', () => {
            const isOpen = logContent.classList.toggle('open');
            logArrow.classList.toggle('open', isOpen);
        });
        
        // Event listeners for actions
        card.querySelector('.btn-cancel').addEventListener('click', () => cancelTask(task.id));
        card.querySelector('.btn-open-folder').addEventListener('click', () => openTaskFolder(task.id));
        
    } else {
        // Update existing card
        
        // Title (only update if filename becomes available/changes)
        const titleEl = card.querySelector('.task-title');
        if (task.filename && titleEl.textContent !== task.filename) {
            titleEl.textContent = task.filename;
            titleEl.title = task.filename;
        }
        
        // Status Badge
        const badge = card.querySelector('.task-status-badge');
        badge.className = `task-status-badge ${statusClass}`;
        badge.textContent = statusText;
        
        // Stats
        card.querySelector('.text-progress').textContent = `${formattedDownloaded} / ${formattedSize}`;
        card.querySelector('.text-speed').textContent = formattedSpeed;
        card.querySelector('.text-eta').textContent = formattedEta;
        
        // Progress Fill
        const fill = card.querySelector('.progress-fill');
        fill.className = `progress-fill ${fillClass}`;
        fill.style.width = `${task.percent}%`;
        
        // Progress Percent
        const percentEl = card.querySelector('.progress-percent');
        percentEl.className = `progress-percent ${fillClass}`;
        percentEl.textContent = `${task.percent.toFixed(1)}%`;
        
        // Control buttons
        const cancelBtn = card.querySelector('.btn-cancel');
        const openBtn = card.querySelector('.btn-open-folder');
        
        if (isFinished) {
            cancelBtn.style.display = 'none';
            openBtn.style.display = 'inline-flex';
        } else {
            cancelBtn.style.display = 'inline-flex';
            openBtn.style.display = 'none';
        }
    }
    
    // Update logs content if it has changed
    const consoleEl = card.querySelector('.log-console');
    const oldLogLinesCount = consoleEl.children.length;
    
    if (task.logs && task.logs.length !== oldLogLinesCount) {
        // Find if user is currently scrolled up in this specific log window
        const isAtBottom = consoleEl.scrollHeight - consoleEl.clientHeight <= consoleEl.scrollTop + 30;
        
        // Re-render logs using lines structure
        consoleEl.innerHTML = '';
        task.logs.forEach(line => {
            const lineEl = document.createElement('div');
            let logType = 'info';
            
            if (line.includes('[WARNING]')) {
                logType = 'warning';
            } else if (line.includes('[ERROR]')) {
                logType = 'error';
            }
            
            lineEl.className = `log-line ${logType}`;
            lineEl.textContent = line;
            consoleEl.appendChild(lineEl);
        });
        
        // Scroll to bottom if user was already at the bottom or it is a new card
        if (isAtBottom || oldLogLinesCount === 0) {
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }
}

// Action callers
async function cancelTask(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}/cancel`, { method: 'POST' });
        if (response.ok) {
            showToast('已发送取消请求', 'info');
        } else {
            showToast('无法取消该任务', 'error');
        }
    } catch (err) {
        showToast('网络连接错误', 'error');
    }
}

async function openTaskFolder(taskId) {
    try {
        const response = await fetch(`/api/task/${taskId}/open`, { method: 'POST' });
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showToast('已在文件管理器中打开保存文件夹', 'success');
            } else {
                showToast(`打开失败: ${result.error}`, 'error');
            }
        } else {
            showToast('服务器请求失败', 'error');
        }
    } catch (err) {
        showToast('网络连接错误', 'error');
    }
}

// Byte utility
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Seconds utility
function formatSeconds(secs) {
    if (secs === Infinity || isNaN(secs) || secs === null) return '--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
