import { supabase } from './config.js';

let currentPage = 0;
const itemsPerPage = 10;
let allKeys = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadDashboard();
});

// Auth Check
function checkAuth() {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
        window.location.href = 'login.html';
    }
}

// Event Listeners
function setupEventListeners() {
    // Menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('apiKey');
        window.location.href = 'login.html';
    });

    // Generate Form
    document.getElementById('generateForm').addEventListener('submit', generateKey);

    // Search & Filter
    document.getElementById('searchInput').addEventListener('input', filterKeys);
    document.getElementById('filterType').addEventListener('change', filterKeys);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            displayKeys();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if ((currentPage + 1) * itemsPerPage < allKeys.length) {
            currentPage++;
            displayKeys();
        }
    });
}

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'keys') {
        loadKeys();
    } else if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'settings') {
        loadSettings();
    }
}

// Dashboard
async function loadDashboard() {
    const apiKey = localStorage.getItem('apiKey');
    
    try {
        const response = await fetch(`/api/keys?api_key=${apiKey}&limit=1000`);
        const data = await response.json();

        if (!data.success) throw new Error('Failed to load keys');

        const keys = data.keys;
        const total = data.total;
        const used = keys.filter(k => k.is_used).length;
        const unused = total - used;
        const banned = keys.filter(k => k.is_banned).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-used').textContent = used;
        document.getElementById('stat-unused').textContent = unused;
        document.getElementById('stat-banned').textContent = banned;

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// Generate Key
async function generateKey(e) {
    e.preventDefault();
    const apiKey = localStorage.getItem('apiKey');

    const keyType = document.getElementById('keyType').value;
    const expiresIn = document.getElementById('expiresIn').value;
    const notes = document.getElementById('notes').value;

    try {
        const response = await fetch('/api/generate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                key_type: keyType,
                expires_in_days: expiresIn ? parseInt(expiresIn) : null,
                notes,
            }),
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Show result
        document.getElementById('generatedKey').style.display = 'block';
        document.getElementById('keyCode').textContent = data.key;
        document.getElementById('keyInfo').innerHTML = `
            <p><strong>Türü:</strong> ${keyType}</p>
            <p><strong>Oluşturulma:</strong> ${new Date(data.created_at).toLocaleString('tr-TR')}</p>
            ${data.expires_at ? `<p><strong>Bitiş:</strong> ${new Date(data.expires_at).toLocaleString('tr-TR')}</p>` : ''}
        `;

        // Reset form
        document.getElementById('generateForm').reset();

        // Reload dashboard
        loadDashboard();

    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
}

// Load Keys
async function loadKeys() {
    const apiKey = localStorage.getItem('apiKey');

    try {
        const response = await fetch(`/api/keys?api_key=${apiKey}&limit=1000`);
        const data = await response.json();

        if (!data.success) throw new Error('Failed to load keys');

        allKeys = data.keys;
        currentPage = 0;
        displayKeys();

    } catch (error) {
        alert('Anahtarlar yüklenemedi: ' + error.message);
    }
}

// Display Keys
function displayKeys() {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const keysToShow = allKeys.slice(start, end);

    const tbody = document.getElementById('keysTable');
    tbody.innerHTML = '';

    keysToShow.forEach(key => {
        const row = document.createElement('tr');
        
        const statusClass = key.is_banned ? 'status-banned' : key.is_used ? 'status-used' : 'status-active';
        const statusText = key.is_banned ? 'Yasaklı' : key.is_used ? 'Kullanıldı' : 'Aktif';

        const expiresText = key.expires_at 
            ? new Date(key.expires_at).toLocaleDateString('tr-TR')
            : 'Asla';

        const createdText = new Date(key.created_at).toLocaleDateString('tr-TR');

        row.innerHTML = `
            <td><code>${key.key_display}...</code></td>
            <td>${key.key_type}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${key.usage_count}</td>
            <td>${expiresText}</td>
            <td>${createdText}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn action-btn-copy" onclick="copyKeyById('${key.id}')">📋</button>
                    <button class="action-btn action-btn-delete" onclick="deleteKey('${key.id}')">🗑️</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Pagination
    const totalPages = Math.ceil(allKeys.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Sayfa ${currentPage + 1} / ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 0;
    document.getElementById('nextBtn').disabled = (currentPage + 1) >= totalPages;
}

// Filter Keys
function filterKeys() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;

    let filtered = allKeys.filter(key => {
        const matchesSearch = !searchText || 
            key.key_display.toLowerCase().includes(searchText) ||
            (key.notes && key.notes.toLowerCase().includes(searchText));

        const matchesType = !typeFilter || key.key_type === typeFilter;

        return matchesSearch && matchesType;
    });

    allKeys = filtered;
    currentPage = 0;
    displayKeys();
}

// Delete Key
async function deleteKey(keyId) {
    if (!confirm('🗑️ Bu anahtarı silmek istediğinizden emin misiniz?')) return;

    const apiKey = localStorage.getItem('apiKey');

    try {
        const response = await fetch('/api/delete-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                key_id: keyId,
                soft_delete: true,
            }),
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Anahtar başarıyla silindi!');
            loadKeys();
            loadDashboard();
        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
}

// Copy Functions
function copyKey() {
    const keyText = document.getElementById('keyCode').textContent;
    navigator.clipboard.writeText(keyText).then(() => {
        alert('✅ Anahtar kopyalandı!');
    });
}

function copyKeyById(keyId) {
    const key = allKeys.find(k => k.id === keyId);
    if (key) {
        alert('💡 Anahtar ID: ' + keyId);
    }
}

function copyApiKey() {
    const apiKey = localStorage.getItem('apiKey');
    navigator.clipboard.writeText(apiKey).then(() => {
        alert('✅ API Anahtarı kopyalandı!');
    });
}

function showApiKey() {
    const apiKeyEl = document.getElementById('apiKey');
    const apiKey = localStorage.getItem('apiKey');
    
    if (apiKeyEl.textContent === '••••••••••••••••') {
        apiKeyEl.textContent = apiKey;
    } else {
        apiKeyEl.textContent = '••••••••••••••••';
    }
}

// Analytics
async function loadAnalytics() {
    // Basit analytics - Gerçek uygulamada daha detaylı olabilir
    const apiKey = localStorage.getItem('apiKey');

    try {
        const response = await fetch(`/api/keys?api_key=${apiKey}&limit=1000`);
        const data = await response.json();

        const keys = data.keys;
        const validationRate = keys.length > 0 
            ? ((keys.filter(k => k.is_used).length / keys.length) * 100).toFixed(1)
            : 0;

        const avgUsage = keys.length > 0
            ? (keys.reduce((sum, k) => sum + k.usage_count, 0) / keys.length).toFixed(1)
            : 0;

        document.getElementById('validationRate').textContent = validationRate + '%';
        document.getElementById('avgUsage').textContent = avgUsage;

    } catch (error) {
        console.error('Analytics error:', error);
    }
}

// Settings
function loadSettings() {
    const apiKey = localStorage.getItem('apiKey');
    document.getElementById('apiKey').textContent = apiKey.substring(0, 8) + '••••••••';
}

// Modal
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function resetAllData() {
    if (!confirm('⚠️ TÜM VERİLER SİLİNECEK! Emin misiniz?')) return;
    alert('Lütfen Supabase kontrol panelinde manuel olarak sıfırlayın');
}

window.copyKey = copyKey;
window.copyApiKey = copyApiKey;
window.showApiKey = showApiKey;
window.deleteKey = deleteKey;
window.copyKeyById = copyKeyById;
window.resetAllData = resetAllData;
