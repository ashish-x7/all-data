/**
 * Google Sheets Live Dashboard - Core Logic (Phase 1)
 * Features: Connection config, Dynamic Tab rendering, Fetching, Parsing, Sorting, Searching, Pagination, and CSV Export.
 */

// ==========================================
// APEXCHARTS INSTANCES CACHE
// ==========================================
const chartInstances = {
    trend: null,
    share: null,
    hourly: null,
    vendors: null,
    saleDist: null,
    purchaseDist: null,
    dayActivity: null
};

// ==========================================
// APPLICATION STATE
// ==========================================
const state = {
    // Connection Config
    activeMode: 'invoices', // 'invoices', 'returns', or 'monthly'
    
    // Invoice Sheet
    sheetUrl: 'https://docs.google.com/spreadsheets/d/119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k/edit?gid=0#gid=0',
    sheetId: '119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k',
    invoiceTabs: [],
    
    // Return Sheet
    returnSheetUrl: 'https://docs.google.com/spreadsheets/d/1cMywn5iuMtaRXP9GlDgWP85-1HGdT6mPy4__DqRW0IQ/edit?usp=sharing',
    returnSheetId: '1cMywn5iuMtaRXP9GlDgWP85-1HGdT6mPy4__DqRW0IQ',
    returnTabs: [],

    // Monthly Sheet
    monthlySheetUrl: 'https://docs.google.com/spreadsheets/d/13XegFLinVbeFDOElX7ShcuxGGy7If73jX79Bi2w0Dk4/edit?usp=sharing',
    monthlySheetId: '13XegFLinVbeFDOElX7ShcuxGGy7If73jX79Bi2w0Dk4',
    monthlyTabs: [],
    
    tabs: [], // Current active tabs array (pointing to invoiceTabs, returnTabs, or monthlyTabs)
    activeTab: '',
    viewMode: 'both', // 'both', 'data', or 'chart'
    refreshRate: 300, // in seconds (5 minutes default)
    
    // Core Data
    columns: [], // Raw columns list: { id, label, type }
    rawData: [], // Array of objects containing cell objects: { colName: { v, f } }
    filteredData: [], // Array of objects after search is applied
    
    // UI Table State
    currentPage: 1,
    pageSize: 25,
    sortBy: null,
    sortOrder: 'asc', // 'asc' or 'desc'
    
    // Status
    isDemoMode: false,
    isLoading: false,
    
    // Timers
    refreshTimerId: null,
    countdownTimerId: null,
    nextRefreshTime: null
};

// ==========================================
// MOCK DATA (DEMO MODE)
// ==========================================
const DEMO_DATA = {
    'Invoices': {
        cols: [
            { id: 'A', label: 'INVOICE ID', type: 'string' },
            { id: 'B', label: 'INVOICE NO.', type: 'string' },
            { id: 'C', label: 'INVOICE DATE', type: 'string' },
            { id: 'D', label: 'QTY', type: 'number' },
            { id: 'E', label: 'SALE AMOUNT', type: 'string' },
            { id: 'F', label: 'BILL NO.', type: 'string' },
            { id: 'G', label: 'PURCHASE AMOUNT', type: 'string' },
            { id: 'H', label: 'REMARK', type: 'string' },
            { id: 'I', label: 'VENDOR NAME', type: 'string' },
            { id: 'J', label: 'USER', type: 'string' }
        ],
        rows: [
            { c: [{v: "T1Csq8tHD-8x"}, {v: "KT27S844-26"}, {v: "01-06-2026"}, {v: 8}, {v: "₹ 5,059.00"}, {v: "KT27P844-26"}, {v: "₹ 3,592.22"}, {v: "ALL CLEAR"}, {v: "844-Air-O-Matic-Amazon"}, {v: "AFSANA"}] },
            { c: [{v: "TGDmBzw8D-1x"}, {v: "CB27S299-11"}, {v: "01-06-2026"}, {v: 1}, {v: "₹ 831.00"}, {v: "CB27P299-11"}, {v: "₹ 683.40"}, {v: "ALL CLEAR"}, {v: "299-Aadhirajan-Amazon"}, {v: "AFSANA"}] },
            { c: [{v: "TcdMSC2vD-2x"}, {v: "CB27S305-13"}, {v: "01-06-2026"}, {v: 2}, {v: "₹ 447.00"}, {v: "CB27P305-13"}, {v: "₹ 432.77"}, {v: "DISPUTE"}, {v: "305-THE TEXTILE HUB-Amazon"}, {v: "AFSANA"}] },
            { c: [{v: "TNHtqVV3D-268x"}, {v: "CB27S101-30"}, {v: "01-06-2026"}, {v: 272}, {v: "₹ 2,00,778.00"}, {v: "CB27P101-30"}, {v: "₹ 1,41,367.80"}, {v: "ALL CLEAR"}, {v: "101-Bharvita-Amazon"}, {v: "GEETA"}] },
            { c: [{v: "TwtVQDVnD-8x"}, {v: "CB27S129-27"}, {v: "01-06-2026"}, {v: 13}, {v: "₹ 10,700.00"}, {v: "CB27P129-27"}, {v: "₹ 9,234.54"}, {v: "ALL CLEAR"}, {v: "129-N.b.f Fashion-Amazon"}, {v: "GEETA"}] },
            { c: [{v: "Twt6JhVWD-58x"}, {v: "CB27S149-35"}, {v: "01-06-2026"}, {v: 60}, {v: "₹ 33,788.00"}, {v: "CB27P149-35"}, {v: "₹ 29,608.16"}, {v: "ALL CLEAR"}, {v: "149-FINIVO FASHION-Amazon"}, {v: "GEETA"}] },
            { c: [{v: "TnywD9tGD-141x"}, {v: "CB27S150-41"}, {v: "01-06-2026"}, {v: 150}, {v: "₹ 73,550.00"}, {v: "CB27P150-41"}, {v: "₹ 64,614.06"}, {v: "DISPUTE"}, {v: "150- Zombom-Amazon"}, {v: "GEETA"}] },
            { c: [{v: "TGvG5kBrD-20x"}, {v: "CB27S152-30"}, {v: "01-06-2026"}, {v: 23}, {v: "₹ 15,664.00"}, {v: "CB27P152-30"}, {v: "₹ 13,300.00"}, {v: "ALL CLEAR"}, {v: "152-Angel f Studio-Amazon"}, {v: "GEETA"}] },
            { c: [{v: "T66jFjbpD-1x"}, {v: "CB27S265-36"}, {v: "01-06-2026"}, {v: 1}, {v: "₹ 729.00"}, {v: "CB27P265-36"}, {v: "₹ 599.40"}, {v: "ALL CLEAR"}, {v: "265-TWINLIGHT-Amazon"}, {v: "HITESH"}] },
            { c: [{v: "Tw3v0KbmD-26x"}, {v: "CB27S163-31"}, {v: "01-06-2026"}, {v: 26}, {v: "₹ 12,776.00"}, {v: "CB27P163-31"}, {v: "₹ 10,211.96"}, {v: "ALL CLEAR"}, {v: "163-BLOOD PANTHER-Amazon"}, {v: "GEETA"}] }
        ]
    },
    'Vendors List': {
        cols: [
            { id: 'A', label: 'VENDOR NAME', type: 'string' },
            { id: 'B', label: 'CONTACT PERSON', type: 'string' },
            { id: 'C', label: 'RATING', type: 'string' },
            { id: 'D', label: 'REMARK', type: 'string' }
        ],
        rows: [
            { c: [{v: "844-Air-O-Matic-Amazon"}, {v: "Afsana Khan"}, {v: "⭐"}, {v: "Top Performing"}] },
            { c: [{v: "299-Aadhirajan-Amazon"}, {v: "Hitesh Patel"}, {v: "⭐"}, {v: "Good Response"}] },
            { c: [{v: "101-Bharvita-Amazon"}, {v: "Geeta Sharma"}, {v: "⭐"}, {v: "Clear Accounts"}] },
            { c: [{v: "129-N.b.f Fashion-Amazon"}, {v: "Rakesh Verma"}, {v: "⭐"}, {v: "Delayed Billing"}] },
            { c: [{v: "150- Zombom-Amazon"}, {v: "Geeta Sharma"}, {v: "⭐"}, {v: "Disputed Entries Found"}] }
        ]
    }
};

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Initializes the application, reads local storage, and kicks off rendering.
 */
function init() {
    loadSettings();
    applyTheme();
    setupEventListeners();
    applyViewMode();
    
    // Initial data load
    fetchData();
}

/**
 * Applies the current viewMode (both, data, or chart) to the UI.
 */
function applyViewMode() {
    document.body.classList.remove('view-mode-both', 'view-mode-data', 'view-mode-chart');
    document.body.classList.add(`view-mode-${state.viewMode}`);
    
    const analyticsSection = document.getElementById('analytics-section');
    const tableSection = document.querySelector('.table-container-card');
    
    if (state.viewMode === 'data') {
        if (analyticsSection) analyticsSection.style.display = 'none';
        if (tableSection) tableSection.style.display = 'flex';
    } else if (state.viewMode === 'chart') {
        if (analyticsSection) {
            analyticsSection.style.display = 'block';
            analyticsSection.classList.remove('collapsed'); // expand it
        }
        if (tableSection) tableSection.style.display = 'none';
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    } else { // both
        if (analyticsSection) analyticsSection.style.display = 'block';
        if (tableSection) tableSection.style.display = 'flex';
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    localStorage.setItem('viewMode', state.viewMode);
}

/**
 * Loads configuration values from localStorage.
 */
function loadSettings() {
    const savedUrl = localStorage.getItem('sheetUrl');
    const savedReturnUrl = localStorage.getItem('returnSheetUrl');
    const savedMonthlyUrl = localStorage.getItem('monthlySheetUrl');
    const savedRefresh = localStorage.getItem('refreshRate');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedViewMode = localStorage.getItem('viewMode') || 'both';

    state.viewMode = savedViewMode;

    if (savedUrl) {
        state.sheetUrl = savedUrl;
        state.sheetId = extractSheetId(savedUrl);
    } else {
        state.sheetUrl = 'https://docs.google.com/spreadsheets/d/119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k/edit?gid=0#gid=0';
        state.sheetId = '119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k';
    }

    if (savedReturnUrl) {
        state.returnSheetUrl = savedReturnUrl;
        state.returnSheetId = extractSheetId(savedReturnUrl);
    } else {
        state.returnSheetUrl = 'https://docs.google.com/spreadsheets/d/1cMywn5iuMtaRXP9GlDgWP85-1HGdT6mPy4__DqRW0IQ/edit?usp=sharing';
        state.returnSheetId = '1cMywn5iuMtaRXP9GlDgWP85-1HGdT6mPy4__DqRW0IQ';
    }

    if (savedMonthlyUrl) {
        state.monthlySheetUrl = savedMonthlyUrl;
        state.monthlySheetId = extractSheetId(savedMonthlyUrl);
    } else {
        state.monthlySheetUrl = 'https://docs.google.com/spreadsheets/d/13XegFLinVbeFDOElX7ShcuxGGy7If73jX79Bi2w0Dk4/edit?usp=sharing';
        state.monthlySheetId = '13XegFLinVbeFDOElX7ShcuxGGy7If73jX79Bi2w0Dk4';
    }

    state.isDemoMode = false;
    state.activeMode = 'invoices';
    state.invoiceTabs = [];
    state.returnTabs = [];
    state.monthlyTabs = [];
    state.tabs = [];
    state.activeTab = '';

    if (savedRefresh !== null) {
        state.refreshRate = parseInt(savedRefresh, 10);
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
}

/**
 * Extracts the 44-character unique Google Sheet ID from a full browser URL.
 */
function extractSheetId(url) {
    if (!url) return '';
    // Standard Google Sheet URL ID regex
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{40,})\b/);
    return matches ? matches[1] : url.trim(); // Fallback to direct input if no pattern matched
}

/**
 * Configures the interface listeners.
 */
function setupEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Refresh controls
    document.getElementById('btn-refresh').addEventListener('click', () => {
        if (state.activeMode === 'invoices') {
            state.invoiceTabs = [];
        } else if (state.activeMode === 'returns') {
            state.returnTabs = [];
        } else {
            state.monthlyTabs = [];
        }
        state.tabs = []; // Clear current tabs
        fetchData();
    });

    // Database Switchers
    document.getElementById('db-switch-invoices').addEventListener('click', () => {
        switchDatabaseMode('invoices');
    });
    document.getElementById('db-switch-returns').addEventListener('click', () => {
        switchDatabaseMode('returns');
    });
    document.getElementById('db-switch-monthly').addEventListener('click', () => {
        switchDatabaseMode('monthly');
    });

    // Modal action controls
    document.getElementById('btn-open-settings').addEventListener('click', openSettingsModal);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);
    document.getElementById('btn-cancel-settings').addEventListener('click', closeSettingsModal);
    
    // Modal Form Submit
    document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
    
    // Passcode validation to unlock editing
    document.getElementById('input-settings-passcode').addEventListener('input', (e) => {
        const passcode = e.target.value.trim();
        const feedback = document.getElementById('passcode-feedback');
        const urlInput = document.getElementById('input-sheet-url');
        const returnUrlInput = document.getElementById('input-return-sheet-url');
        const monthlyUrlInput = document.getElementById('input-monthly-sheet-url');
        const saveBtn = document.getElementById('btn-save-settings');
        const secureFields = document.getElementById('secure-settings-fields');
        
        if (passcode === 'Ajx7') {
            urlInput.disabled = false;
            returnUrlInput.disabled = false;
            monthlyUrlInput.disabled = false;
            saveBtn.disabled = false;
            if (secureFields) secureFields.classList.remove('hidden'); // Show fields!
            feedback.textContent = '✓ Passcode verified. Editing unlocked!';
            feedback.style.color = '#10b981'; // Green accent
        } else {
            urlInput.disabled = true;
            returnUrlInput.disabled = true;
            monthlyUrlInput.disabled = true;
            saveBtn.disabled = true;
            if (secureFields) secureFields.classList.add('hidden'); // Hide fields!
            if (passcode.length >= 4) {
                feedback.textContent = '✗ Incorrect passcode. Try again.';
                feedback.style.color = '#ef4444'; // Red accent
            } else {
                feedback.textContent = 'Enter passcode to unlock configuration.';
                feedback.style.color = ''; // Reset CSS default
            }
        }
    });

    // Table search input
    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        applyFilters();
    });

    // Table pagination size dropdown
    document.getElementById('page-size-select').addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value, 10);
        state.currentPage = 1;
        renderTable();
    });

    // CSV Export button
    document.getElementById('btn-export').addEventListener('click', exportToCSV);

    // Page jump input and button
    const handlePageJump = () => {
        const jumpInput = document.getElementById('input-jump-page');
        if (!jumpInput) return;
        const pageNum = parseInt(jumpInput.value, 10);
        const totalRecords = state.filteredData.length;
        const totalPages = Math.ceil(totalRecords / state.pageSize);
        
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            state.currentPage = pageNum;
            renderTable();
        } else {
            jumpInput.value = state.currentPage;
        }
    };

    const jumpBtn = document.getElementById('btn-jump-page');
    const jumpInput = document.getElementById('input-jump-page');
    if (jumpBtn) jumpBtn.addEventListener('click', handlePageJump);
    if (jumpInput) {
        jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePageJump();
        });
    }

    // Toggle Visualizations & Analytics Panel
    const toggleAnalyticsBtn = document.getElementById('btn-toggle-analytics');
    if (toggleAnalyticsBtn) {
        toggleAnalyticsBtn.addEventListener('click', () => {
            const panel = document.getElementById('analytics-section');
            if (panel) {
                panel.classList.toggle('collapsed');
                // Trigger window resize so ApexCharts re-adapts size to container
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 400);
            }
        });
    }

    // Modal backdrop click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    // Debounced resize event listener to adapt charts automatically on zoom in/out
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const analyticsSection = document.getElementById('analytics-section');
            const isVisible = analyticsSection && analyticsSection.style.display !== 'none';
            if (isVisible && typeof renderCharts === 'function') {
                renderCharts();
            }
        }, 250);
    });
}

/**
 * Set visual navigation highlight
 */
function setActiveNav(navId) {
    // Left empty as sidebar navigation is removed
}

/**
 * Switches CSS Data Theme and stores selection in localStorage
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme();
}

/**
 * Updates UI labels based on current theme state.
 */
function applyTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeLabel = document.querySelector('.theme-label');
    if (themeLabel) {
        themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
    // Redraw charts with correct colors
    renderCharts();
}

// ==========================================
// DATA FETCHING & PARSING
// ==========================================

/**
 * Auto-detects all sheet tabs dynamically from public Google Sheet HTML view
 */
async function fetchTabNames(sheetId) {
    if (!sheetId) return null;
    try {
        const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("CORS Proxy request failed");
        
        const contents = await response.text();
        
        // Match items.push({name: "TabName", pageUrl: ...})
        const regex = /items\.push\(\{\s*name:\s*["']([^"']+)["']/g;
        const tabNames = [];
        let match;
        while ((match = regex.exec(contents)) !== null) {
            let name = match[1];
            // Decode unicode escapes (e.g. \u0027)
            name = name.replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
            });
            tabNames.push(name);
        }
        
        if (tabNames.length > 0) {
            return tabNames;
        }
    } catch (error) {
        console.error("Error auto-fetching tab names:", error);
    }
    // Fallbacks
    if (sheetId === '119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k') {
        return ['AMAZON', 'AJIO', 'MYNTRA', 'FLIPKART'];
    }
    if (sheetId === '1cMywn5iuMtaRXP9GlDgWP85-1HGdT6mPy4__DqRW0IQ') {
        return ['AMAZON RETURN', 'AJIO RETURN', 'MYNTRA RETURN', 'FLIPKART RETURN'];
    }
    if (sheetId === '13XegFLinVbeFDOElX7ShcuxGGy7If73jX79Bi2w0Dk4') {
        return ['ALL REPORT', 'MONTHLY DATA'];
    }
    return null;
}

/**
 * Retrieves spreadsheet data from Google's Visualisation API or Demo data fallback.
 */
async function fetchData() {
    if (state.isLoading) return;
    
    showLoader(true);
    updateStatusPill('syncing');

    let currentSheetId = state.sheetId;
    let currentTabs = state.invoiceTabs;

    if (state.activeMode === 'returns') {
        currentSheetId = state.returnSheetId;
        currentTabs = state.returnTabs;
    } else if (state.activeMode === 'monthly') {
        currentSheetId = state.monthlySheetId;
        currentTabs = state.monthlyTabs;
    }

    // Auto-detect tab names if empty
    if (!state.isDemoMode && currentSheetId && currentTabs.length === 0) {
        const fetchedTabs = await fetchTabNames(currentSheetId);
        if (fetchedTabs && fetchedTabs.length > 0) {
            if (state.activeMode === 'invoices') {
                state.invoiceTabs = fetchedTabs;
                state.tabs = state.invoiceTabs;
            } else if (state.activeMode === 'returns') {
                state.returnTabs = fetchedTabs;
                state.tabs = state.returnTabs;
            } else {
                state.monthlyTabs = fetchedTabs;
                state.tabs = state.monthlyTabs;
            }
            if (!state.tabs.includes(state.activeTab)) {
                state.activeTab = state.tabs[0];
            }
        } else {
            let fallbackTabs = ['AMAZON'];
            if (state.activeMode === 'returns') fallbackTabs = ['AMAZON RETURN'];
            if (state.activeMode === 'monthly') fallbackTabs = ['ALL REPORT'];

            if (state.activeMode === 'invoices') {
                state.invoiceTabs = fallbackTabs;
                state.tabs = state.invoiceTabs;
            } else if (state.activeMode === 'returns') {
                state.returnTabs = fallbackTabs;
                state.tabs = state.returnTabs;
            } else {
                state.monthlyTabs = fallbackTabs;
                state.tabs = state.monthlyTabs;
            }
            state.activeTab = state.tabs[0];
        }
    } else {
        // Point tabs state to correct mode tabs cache
        if (state.activeMode === 'invoices') {
            state.tabs = state.invoiceTabs;
        } else if (state.activeMode === 'returns') {
            state.tabs = state.returnTabs;
        } else {
            state.tabs = state.monthlyTabs;
        }
        
        if (state.tabs.length > 0 && !state.tabs.includes(state.activeTab)) {
            state.activeTab = state.tabs[0];
        }
    }

    // Render tab navigation bar
    renderTabs();

    if (state.isDemoMode) {
        // Load simulated data
        setTimeout(() => {
            loadDemoData();
            showLoader(false);
            updateStatusPill('demo');
            setupAutoRefreshTimer();
        }, 600); // Small delay to feel realistic and let transitions trigger
        return;
    }

    try {
        const encodedTab = encodeURIComponent(state.activeTab);
        const endpoint = `https://docs.google.com/spreadsheets/d/${currentSheetId}/gviz/tq?tqx=out:json&sheet=${encodedTab}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawText = await response.text();
        parseGoogleSheetsJson(rawText);
        
        showLoader(false);
        updateStatusPill('success');
        setupAutoRefreshTimer();
    } catch (error) {
        console.error("Failed fetching Google Sheet data: ", error);
        showLoader(false);
        updateStatusPill('error');
        
        // Show user-friendly error on active table
        renderErrorState(error.message);
    }
}

/**
 * Handle Switching Primary Database modes (Invoices vs Returns vs Monthly)
 */
function switchDatabaseMode(mode) {
    if (state.activeMode === mode || state.isLoading) return;

    state.activeMode = mode;

    // Toggle styling active class
    const invBtn = document.getElementById('db-switch-invoices');
    const retBtn = document.getElementById('db-switch-returns');
    const monBtn = document.getElementById('db-switch-monthly');

    invBtn.classList.remove('active');
    retBtn.classList.remove('active');
    monBtn.classList.remove('active');

    if (mode === 'invoices') {
        invBtn.classList.add('active');
        state.tabs = state.invoiceTabs;
    } else if (mode === 'returns') {
        retBtn.classList.add('active');
        state.tabs = state.returnTabs;
    } else {
        monBtn.classList.add('active');
        state.tabs = state.monthlyTabs;
    }

    // Safely default active tab
    if (state.tabs.length > 0) {
        state.activeTab = state.tabs[0];
    } else {
        state.activeTab = '';
    }

    // Reset list helpers
    state.currentPage = 1;
    state.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    fetchData();
}

/**
 * Simulates a data fetch using demo database objects.
 */
function loadDemoData() {
    const activeDemo = DEMO_DATA[state.activeTab] || DEMO_DATA['Invoices'];
    
    // Parse Columns
    state.columns = activeDemo.cols;
    
    // Parse Rows
    state.rawData = activeDemo.rows.map(row => {
        const item = {};
        state.columns.forEach((col, idx) => {
            const cell = row.c[idx];
            item[col.label] = {
                v: cell ? cell.v : null,
                f: cell ? (cell.f !== undefined ? cell.f : String(cell.v)) : ""
            };
        });
        return item;
    });

    state.filteredData = [...state.rawData];
    state.currentPage = 1;
    state.sortBy = null;
    
    calculateMetrics();
    applyFilters();
}

/**
 * Parses Google's JSON visualizer wrapping syntax.
 */
function parseGoogleSheetsJson(rawText) {
    // Google returns: /*O_o*/\ngoogle.visualization.Query.setResponse({ ... });
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format received from Google Sheets. Ensure sheet is shared with view access.");
    }
    
    const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
    const json = JSON.parse(jsonString);
    
    if (json.status === 'error') {
        const reasons = json.errors.map(e => e.detailed_message || e.message).join(', ');
        throw new Error(`Google Sheets API Error: ${reasons}`);
    }

    if (!json.table || !json.table.cols || !json.table.rows) {
        throw new Error("No data found in this sheet. Check tab name or sheet structure.");
    }

    // 1. Detect Multi-Row Headers (specifically for AJIO/MYNTRA/FLIPKART return sheets)
    let headerRowIndex = -1;
    if (json.table.rows && json.table.rows.length > 1) {
        const row0 = json.table.rows[0].c;
        const isCreditNoteHeader = row0 && row0[0] && row0[0].v && String(row0[0].v).toLowerCase().includes('credit note');
        if (isCreditNoteHeader) {
            headerRowIndex = 1; // Double header active, column labels are in row 1
        }
    }

    // 2. Map Columns & Resolve Duplicate Labels
    let cols = [];
    const labelCounts = {}; // Track label occurrences to ensure uniqueness
    
    if (headerRowIndex === 1) {
        const groupRow = json.table.rows[0];
        const headerRow = json.table.rows[1];
        let currentGroup = '';

        json.table.cols.forEach((col, idx) => {
            const groupCell = groupRow.c && groupRow.c[idx];
            if (groupCell && groupCell.v) {
                currentGroup = String(groupCell.v).trim();
            }

            const cell = headerRow.c && headerRow.c[idx];
            let labelVal = cell ? String(cell.v || '').trim() : '';

            // Only map columns that contain headers
            if (labelVal) {
                if (currentGroup) {
                    labelVal = `${currentGroup} - ${labelVal}`;
                }
                
                // Deduplicate label
                if (labelCounts[labelVal] !== undefined) {
                    labelCounts[labelVal]++;
                    labelVal = `${labelVal} (${labelCounts[labelVal]})`;
                } else {
                    labelCounts[labelVal] = 1;
                }

                cols.push({
                    index: idx,
                    id: col.id || String.fromCharCode(65 + idx),
                    label: labelVal,
                    type: col.type || 'string'
                });
            }
        });
    } else {
        cols = json.table.cols.map((col, idx) => {
            let colLabel = col.label ? col.label.trim() : '';
            if (!colLabel) {
                colLabel = `Column ${String.fromCharCode(65 + idx)}`;
            }
            
            // Deduplicate label
            if (labelCounts[colLabel] !== undefined) {
                labelCounts[colLabel]++;
                colLabel = `${colLabel} (${labelCounts[colLabel]})`;
            } else {
                labelCounts[colLabel] = 1;
            }

            return {
                index: idx,
                id: col.id || String.fromCharCode(65 + idx),
                label: colLabel,
                type: col.type || 'string'
            };
        });
    }
    state.columns = cols;

    // 3. Map row cells matching active columns indices (skipping header rows if double header)
    const startRowIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    
    state.rawData = [];
    for (let i = startRowIdx; i < json.table.rows.length; i++) {
        const row = json.table.rows[i];
        if (!row || !row.c) continue;

        const item = {};
        let hasData = false;

        state.columns.forEach((col) => {
            const cell = row.c[col.index];
            if (!cell) {
                item[col.label] = { v: null, f: "" };
            } else {
                let cellVal = cell.v;
                let displayVal = cell.f !== undefined && cell.f !== null ? String(cell.f) : (cell.v !== null ? String(cell.v) : "");

                if (cellVal !== null) {
                    hasData = true;

                    // Handle Google Sheet Date objects: Date(2026,0,6) strings
                    if (typeof cellVal === 'string' && cellVal.startsWith('Date(')) {
                        cellVal = parseGoogleDateString(cellVal);
                        if (!cell.f) {
                            displayVal = formatDate(cellVal);
                        }
                    }
                    
                    item[col.label] = {
                        v: cellVal,
                        f: displayVal
                    };
                } else {
                    item[col.label] = { v: '', f: '' };
                }
            }
        });

        if (hasData) {
            state.rawData.push(item);
        }
    }

    state.filteredData = [...state.rawData];
    state.currentPage = 1;
    state.sortBy = null;

    calculateMetrics();
    applyFilters();
}

/**
 * Parses Google Date syntax string Date(2026,0,6) into a JS Date object
 */
function parseGoogleDateString(dateStr) {
    try {
        const parts = dateStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
            // Google dates are 0-indexed for month (Jan = 0)
            return new Date(parts[0], parts[1], parts[2]);
        }
    } catch(e) {}
    return dateStr;
}

/**
 * Utility to format Date objects as MM-DD-YYYY
 */
function formatDate(dateObj) {
    if (!(dateObj instanceof Date)) return String(dateObj);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
}

// ==========================================
// RENDER INTERFACE ELEMENTS
// ==========================================

/**
 * Renders tab navigation bar at the top of the table.
 */
function renderTabs() {
    const container = document.getElementById('tab-nav-container');
    if (!container) return;
    container.innerHTML = '';
    
    state.tabs.forEach(tabName => {
        const item = document.createElement('div');
        item.className = `tab-container-item ${state.activeTab === tabName ? 'active' : ''}`;
        
        const brandMatch = tabName.toLowerCase().match(/(amazon|ajio|myntra|flipkart)/);
        if (brandMatch) {
            item.setAttribute('data-brand', brandMatch[1]);
        }
        
        const label = document.createElement('div');
        label.className = 'tab-name-label';
        label.textContent = tabName;
        item.appendChild(label);
        
        const actions = document.createElement('div');
        actions.className = 'tab-sub-actions';
        
        const dataBtn = document.createElement('button');
        dataBtn.className = `tab-action-icon-btn data-btn ${state.activeTab === tabName && state.viewMode === 'data' ? 'active' : ''}`;
        dataBtn.title = 'Show Data Only';
        dataBtn.innerHTML = '<i data-lucide="database"></i>';
        dataBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabChanged = state.activeTab !== tabName;
            const modeChanged = state.viewMode !== 'data';
            if (tabChanged || modeChanged) {
                state.activeTab = tabName;
                state.viewMode = 'data';
                applyViewMode();
                if (tabChanged) {
                    fetchData();
                } else {
                    renderTabs();
                }
            }
        });
        actions.appendChild(dataBtn);
        
        const chartBtn = document.createElement('button');
        chartBtn.className = `tab-action-icon-btn chart-btn ${state.activeTab === tabName && state.viewMode === 'chart' ? 'active' : ''}`;
        chartBtn.title = 'Show Charts Only';
        chartBtn.innerHTML = '<i data-lucide="bar-chart-2"></i>';
        chartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabChanged = state.activeTab !== tabName;
            const modeChanged = state.viewMode !== 'chart';
            if (tabChanged || modeChanged) {
                state.activeTab = tabName;
                state.viewMode = 'chart';
                applyViewMode();
                if (tabChanged) {
                    fetchData();
                } else {
                    renderTabs();
                }
            }
        });
        actions.appendChild(chartBtn);
        
        item.appendChild(actions);
        
        item.addEventListener('click', () => {
            const tabChanged = state.activeTab !== tabName;
            const modeChanged = state.viewMode !== 'both';
            if (tabChanged || modeChanged) {
                state.activeTab = tabName;
                state.viewMode = 'both';
                applyViewMode();
                if (tabChanged) {
                    fetchData();
                } else {
                    renderTabs();
                }
            }
        });
        
        container.appendChild(item);
    });
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Calculate KPI summary values on current active sheet columns.
 */
function calculateMetrics() {
    let totalRows = state.rawData.length;
    let totalQty = 0;

    // UI Titles & Values
    const titleRows = document.getElementById('metric-title-rows');
    const titleQty = document.getElementById('metric-title-qty');
    const titleSales = document.getElementById('metric-title-sales');
    const titlePurchase = document.getElementById('metric-title-purchase');
    const titleProfit = document.getElementById('metric-title-profit');
    const titleDisputes = document.getElementById('metric-title-disputes');

    const valueRows = document.getElementById('metric-total-rows');
    const valueQty = document.getElementById('metric-total-qty');
    const valueSales = document.getElementById('metric-total-sales');
    const valuePurchase = document.getElementById('metric-total-purchase');
    const valueProfit = document.getElementById('metric-total-profit');
    const valueDisputes = document.getElementById('metric-total-disputes');

    if (state.activeMode === 'invoices') {
        // Set Invoices Labels
        if (titleRows) titleRows.textContent = 'Total Records';
        if (titleQty) titleQty.textContent = 'Total Quantity';
        if (titleSales) titleSales.textContent = 'Sales Amount';
        if (titlePurchase) titlePurchase.textContent = 'Purchase Amount';
        if (titleProfit) titleProfit.textContent = 'Net Margin';
        if (titleDisputes) titleDisputes.textContent = 'Disputes / Flags';

        let totalSales = 0;
        let totalPurchase = 0;
        let totalDisputes = 0;

        const keys = state.rawData.length > 0 ? Object.keys(state.rawData[0]) : [];
        const qtyCol = keys.find(k => k.toLowerCase() === 'qty');
        const saleCol = keys.find(k => k.toLowerCase().includes('sale amount') || k.toLowerCase().includes('sales'));
        const purchaseCol = keys.find(k => k.toLowerCase().includes('purchase amount') || k.toLowerCase().includes('purchase'));
        const remarkCol = keys.find(k => k.toLowerCase() === 'remark' || k.toLowerCase() === 'status');
        const disputesCol = keys.find(k => k.toLowerCase().includes('dispute') || k.toLowerCase().includes('flag'));

        state.rawData.forEach(row => {
            if (qtyCol) {
                const qtyVal = parseFloat(row[qtyCol].v);
                if (!isNaN(qtyVal)) totalQty += qtyVal;
            }
            if (saleCol) {
                const saleVal = parseValToNum(row[saleCol].f || row[saleCol].v);
                if (!isNaN(saleVal)) totalSales += saleVal;
            }
            if (purchaseCol) {
                const purchaseVal = parseValToNum(row[purchaseCol].f || row[purchaseCol].v);
                if (!isNaN(purchaseVal)) totalPurchase += purchaseVal;
            }
            if (remarkCol) {
                const remarkText = String(row[remarkCol].f || row[remarkCol].v || '').toLowerCase();
                if (remarkText.includes('dispute') || remarkText.includes('flag') || remarkText.includes('hold')) {
                    totalDisputes++;
                }
            }
            if (disputesCol) {
                const dispText = String(row[disputesCol].f || row[disputesCol].v || '').toLowerCase();
                if (dispText === 'true' || dispText === 'yes' || dispText === '1') {
                    totalDisputes++;
                }
            }
        });

        let totalProfit = totalSales - totalPurchase;

        valueRows.textContent = formatNumber(totalRows);
        valueQty.textContent = formatNumber(totalQty);
        valueSales.textContent = '₹ ' + formatCurrency(totalSales);
        if (valuePurchase) valuePurchase.textContent = '₹ ' + formatCurrency(totalPurchase);
        if (valueProfit) {
            valueProfit.textContent = '₹ ' + formatCurrency(totalProfit);
            if (totalProfit < 0) {
                valueProfit.style.color = '#ef4444'; // Red negative margin indicator
            } else {
                valueProfit.style.color = '';
            }
        }
        valueDisputes.textContent = formatNumber(totalDisputes);

    } else if (state.activeMode === 'returns') {
        // Set Returns Labels
        if (titleRows) titleRows.textContent = 'Total Returns';
        if (titleQty) titleQty.textContent = 'Total Return Qty';
        if (titleSales) titleSales.textContent = 'Credit Note Amt';
        if (titlePurchase) titlePurchase.textContent = 'Debit Note Amt';
        if (titleProfit) titleProfit.textContent = 'Total Return Value';
        if (titleDisputes) titleDisputes.textContent = 'Disputed Returns';

        let totalCreditAmt = 0;
        let totalDebitAmt = 0;
        let totalDisputes = 0;

        const keys = state.rawData.length > 0 ? Object.keys(state.rawData[0]) : [];
        const rCols = findReturnsColumns(keys);

        const creditAmtCol = rCols.creditAmtCol;
        const debitAmtCol = rCols.debitAmtCol;
        const creditQtyCol = rCols.creditQtyCol;
        const debitQtyCol = rCols.debitQtyCol;
        const remarkCols = keys.filter(k => k.toLowerCase().includes('remark') || k.toLowerCase().includes('status') || k.toLowerCase().includes('user data'));

        state.rawData.forEach(row => {
            // 1. Qty calculation
            let rowQty = 0;
            if (creditQtyCol) {
                const val = parseFloat(row[creditQtyCol]?.v);
                if (!isNaN(val)) rowQty += val;
            }
            if (debitQtyCol) {
                const val = parseFloat(row[debitQtyCol]?.v);
                if (!isNaN(val)) rowQty += val;
            }
            // If neither resolved, default to 1 for this row
            if (rowQty === 0) rowQty = 1;
            totalQty += rowQty;

            // 2. Credit Note Value parsing
            if (creditAmtCol) {
                const cVal = parseValToNum(row[creditAmtCol].f || row[creditAmtCol].v);
                if (!isNaN(cVal)) totalCreditAmt += cVal;
            }

            // 3. Debit Note Value parsing
            if (debitAmtCol) {
                const dVal = parseValToNum(row[debitAmtCol].f || row[debitAmtCol].v);
                if (!isNaN(dVal)) totalDebitAmt += dVal;
            }

            // 4. Disputes count
            remarkCols.forEach(col => {
                const text = String(row[col]?.f || row[col]?.v || '').toLowerCase();
                if (text.includes('dispute') || text.includes('flag') || text.includes('hold') || text.includes('reject')) {
                    totalDisputes++;
                }
            });
        });

        let totalReturnVal = totalCreditAmt + totalDebitAmt;

        valueRows.textContent = formatNumber(totalRows);
        valueQty.textContent = formatNumber(totalQty);
        valueSales.textContent = '₹ ' + formatCurrency(totalCreditAmt);
        if (valuePurchase) valuePurchase.textContent = '₹ ' + formatCurrency(totalDebitAmt);
        if (valueProfit) {
            valueProfit.textContent = '₹ ' + formatCurrency(totalReturnVal);
            valueProfit.style.color = ''; // Reset CSS styling color
        }
        valueDisputes.textContent = formatNumber(totalDisputes);
    } else {
        // Set Monthly Consolidated Labels
        if (titleRows) titleRows.textContent = 'Consolidated Records';
        if (titleQty) titleQty.textContent = 'Consolidated Qty';
        if (titleSales) titleSales.textContent = 'Total Sales';
        if (titlePurchase) titlePurchase.textContent = 'Total Purchases';
        if (titleProfit) titleProfit.textContent = 'Consolidated Margin';
        if (titleDisputes) titleDisputes.textContent = 'Total Disputes';

        let totalSales = 0;
        let totalPurchase = 0;
        let totalDisputes = 0;

        const keys = state.rawData.length > 0 ? Object.keys(state.rawData[0]) : [];
        const qtyCols = keys.filter(k => k.toLowerCase().includes('qty'));
        
        // Sum up all columns that contain 'sale' (case-insensitive) but exclude zoho sync markers if any
        const saleCols = keys.filter(k => k.toLowerCase().includes('sale') && !k.toLowerCase().includes('zoho'));
        const purchaseCols = keys.filter(k => k.toLowerCase().includes('purchase') && !k.toLowerCase().includes('zoho'));
        const remarkCols = keys.filter(k => k.toLowerCase().includes('remark') || k.toLowerCase().includes('dispute') || k.toLowerCase().includes('flag'));

        state.rawData.forEach(row => {
            // Qty
            qtyCols.forEach(col => {
                const qVal = parseFloat(row[col].v);
                if (!isNaN(qVal)) totalQty += qVal;
            });
            // Sales
            saleCols.forEach(col => {
                const sVal = parseValToNum(row[col].f || row[col].v);
                if (!isNaN(sVal)) totalSales += sVal;
            });
            // Purchases
            purchaseCols.forEach(col => {
                const pVal = parseValToNum(row[col].f || row[col].v);
                if (!isNaN(pVal)) totalPurchase += pVal;
            });
            // Remarks/Disputes sum
            remarkCols.forEach(col => {
                const val = row[col].v;
                const text = String(row[col].f || val || '').toLowerCase();
                if (typeof val === 'number') {
                    if (!isNaN(val)) totalDisputes += val;
                } else if (text.includes('dispute') || text.includes('flag') || text.includes('hold') || text.includes('reject')) {
                    totalDisputes++;
                }
            });
        });

        let totalProfit = totalSales - totalPurchase;

        valueRows.textContent = formatNumber(totalRows);
        valueQty.textContent = formatNumber(totalQty);
        valueSales.textContent = '₹ ' + formatCurrency(totalSales);
        if (valuePurchase) valuePurchase.textContent = '₹ ' + formatCurrency(totalPurchase);
        if (valueProfit) {
            valueProfit.textContent = '₹ ' + formatCurrency(totalProfit);
            if (totalProfit < 0) {
                valueProfit.style.color = '#ef4444';
            } else {
                valueProfit.style.color = '';
            }
        }
        valueDisputes.textContent = formatNumber(totalDisputes);
    }
    
    // Render/Update Visualizations
    renderCharts();
}

/**
 * Filter raw rows based on search queries.
 */
function applyFilters() {
    if (!state.searchQuery || state.searchQuery.trim() === '') {
        state.filteredData = [...state.rawData];
    } else {
        const query = state.searchQuery.toLowerCase().trim();
        state.filteredData = state.rawData.filter(row => {
            return Object.values(row).some(cell => {
                const cellStr = String(cell.f || cell.v || '').toLowerCase();
                return cellStr.includes(query);
            });
        });
    }
    
    // Sort logic must be reapplied if sorting is active
    if (state.sortBy) {
        sortData(state.sortBy, state.sortOrder, false);
    } else {
        renderTable();
    }
}

/**
 * Builds table headers and populates current page rows.
 */
function renderTable() {
    const table = document.getElementById('main-data-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const emptyState = document.getElementById('table-empty');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (state.columns.length === 0 || state.filteredData.length === 0) {
        emptyState.classList.remove('hidden');
        document.getElementById('pag-start').textContent = '0';
        document.getElementById('pag-end').textContent = '0';
        document.getElementById('pag-total').textContent = '0';
        renderPagination(0);
        return;
    }

    emptyState.classList.add('hidden');

    // 1. RENDER HEADERS
    const trHeader = document.createElement('tr');
    state.columns.forEach(col => {
        const th = document.createElement('th');
        
        // Header Text
        th.innerHTML = `${col.label}`;
        
        // Sorting Indicators
        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        
        // ASC Arrow & DESC Arrow
        const isSortedThis = (state.sortBy === col.label);
        sortIndicator.innerHTML = `
            <span class="asc-arrow" style="${isSortedThis && state.sortOrder === 'asc' ? 'opacity: 1; color: var(--primary); font-weight: bold;' : 'opacity: 0.3;'}">▲</span>
            <span class="desc-arrow" style="${isSortedThis && state.sortOrder === 'desc' ? 'opacity: 1; color: var(--primary); font-weight: bold;' : 'opacity: 0.3;'}">▼</span>
        `;
        th.appendChild(sortIndicator);
        
        // Bind Sort Event
        th.addEventListener('click', () => {
            const nextOrder = (state.sortBy === col.label && state.sortOrder === 'asc') ? 'desc' : 'asc';
            sortData(col.label, nextOrder);
        });

        trHeader.appendChild(th);
    });
    thead.appendChild(trHeader);

    // 2. PAGINATE RECORDS
    const totalRecords = state.filteredData.length;
    const totalPages = Math.ceil(totalRecords / state.pageSize);
    
    if (state.currentPage > totalPages) state.currentPage = totalPages || 1;
    
    const startIdx = (state.currentPage - 1) * state.pageSize;
    const endIdx = Math.min(startIdx + state.pageSize, totalRecords);
    
    const pageRows = state.filteredData.slice(startIdx, endIdx);

    // Update Pagination Summary Label
    document.getElementById('pag-start').textContent = totalRecords === 0 ? 0 : startIdx + 1;
    document.getElementById('pag-end').textContent = endIdx;
    document.getElementById('pag-total').textContent = totalRecords;

    // 3. RENDER ROWS
    pageRows.forEach(row => {
        const tr = document.createElement('tr');
        state.columns.forEach(col => {
            const td = document.createElement('td');
            const cell = row[col.label];
            
            // Format Cell Rendering dynamically based on type/value
            renderCell(td, col, cell);
            
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    renderPagination(totalPages);
    
    // Refresh Icons
    lucide.createIcons();
}

/**
 * Smart cell renderer styles values (like Star ratings or Rupees).
 */
function renderCell(td, col, cell) {
    const val = cell.f || (cell.v !== null ? String(cell.v) : "");
    const cleanVal = val.trim();

    // Check if cell is a Zoho Status (Remark column)
    if (col.label.toLowerCase() === 'remark' || col.label.toLowerCase() === 'status') {
        if (cleanVal.toUpperCase() === 'ALL CLEAR') {
            td.innerHTML = `<span class="badge success">${val}</span>`;
            return;
        } else if (cleanVal.toUpperCase() === 'DISPUTE' || cleanVal.toUpperCase() === 'HOLD') {
            td.innerHTML = `<span class="badge danger">${val}</span>`;
            return;
        } else if (cleanVal !== "") {
            td.innerHTML = `<span class="badge warning">${val}</span>`;
            return;
        }
    }

    // Stars Rating matching column
    if (col.label === '⭐' || cleanVal === '⭐') {
        td.innerHTML = `<span class="badge star">★</span>`;
        return;
    }

    // Currency values rendering styling
    if (cleanVal.startsWith('₹') || cleanVal.includes('Amount') || cleanVal.includes('Price')) {
        td.className = 'currency-cell';
        td.textContent = val;
        return;
    }

    // Quantities values
    if (col.type === 'number' && !isNaN(cell.v) && cell.v !== null) {
        td.style.fontWeight = '500';
        td.textContent = val;
        return;
    }

    // Standard string fallback
    td.textContent = val;
}

/**
 * Handles column-based data sorting (custom types for currency).
 */
function sortData(colLabel, order, triggerRender = true) {
    state.sortBy = colLabel;
    state.sortOrder = order;

    state.filteredData.sort((a, b) => {
        let cellA = a[colLabel]?.v;
        let cellB = b[colLabel]?.v;

        let displayA = a[colLabel]?.f || "";
        let displayB = b[colLabel]?.f || "";

        // Fallback for empty/null cells
        if (cellA === null || cellA === undefined) cellA = "";
        if (cellB === null || cellB === undefined) cellB = "";

        // 1. Date comparison
        if (cellA instanceof Date && cellB instanceof Date) {
            return order === 'asc' ? cellA - cellB : cellB - cellA;
        }

        // 2. Numerical values comparison (Or Strings formatted as currencies)
        const isAmt = colLabel.toLowerCase().includes('amount') || displayA.startsWith('₹') || displayB.startsWith('₹');
        const isQty = colLabel.toLowerCase() === 'qty';
        
        if (isAmt || isQty || typeof cellA === 'number' || typeof cellB === 'number') {
            const numA = parseValToNum(displayA || cellA);
            const numB = parseValToNum(displayB || cellB);
            return order === 'asc' ? numA - numB : numB - numA;
        }

        // 3. Standard Alphabetical sorting
        const strA = String(displayA || cellA).toLowerCase();
        const strB = String(displayB || cellB).toLowerCase();
        
        if (strA < strB) return order === 'asc' ? -1 : 1;
        if (strA > strB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    if (triggerRender) {
        state.currentPage = 1;
        renderTable();
    }
}

/**
 * Renders pagination page buttons list.
 */
function renderPagination(totalPages) {
    const container = document.getElementById('pagination-buttons');
    container.innerHTML = '';

    const jumpContainer = document.getElementById('pagination-jump-container');
    if (jumpContainer) {
        if (totalPages <= 1) {
            jumpContainer.style.display = 'none';
        } else {
            jumpContainer.style.display = 'flex';
            const jumpInput = document.getElementById('input-jump-page');
            if (jumpInput) {
                jumpInput.max = totalPages;
                jumpInput.placeholder = `1-${totalPages}`;
                jumpInput.value = state.currentPage;
            }
        }
    }

    if (totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pag-btn';
    prevBtn.innerHTML = '‹';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
        state.currentPage--;
        renderTable();
    });
    container.appendChild(prevBtn);

    // Number Buttons (with simple truncation boundary logic if pages > 5)
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pag-btn ${state.currentPage === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            state.currentPage = i;
            renderTable();
        });
        container.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pag-btn';
    nextBtn.innerHTML = '›';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        state.currentPage++;
        renderTable();
    });
    container.appendChild(nextBtn);
}

/**
 * UI State: Displays custom error boxes inside the table container.
 */
function renderErrorState(message) {
    const table = document.getElementById('main-data-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const emptyState = document.getElementById('table-empty');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = 'Sheet Fetch Failed';
    emptyState.querySelector('p').innerHTML = `
        Error: ${message}<br><br>
        <strong>Please make sure:</strong><br>
        1. Google Sheet general access is set to <strong>"Anyone with the link can view"</strong>.<br>
        2. The Sheet URL/ID in the settings is entered correctly.<br>
        3. The Tab Name matches your Google Sheet exactly.
    `;
    
    // Clear metrics
    document.getElementById('metric-total-rows').textContent = '0';
    document.getElementById('metric-total-qty').textContent = '0';
    document.getElementById('metric-total-sales').textContent = '₹0.00';
    
    const purchaseEl = document.getElementById('metric-total-purchase');
    if (purchaseEl) purchaseEl.textContent = '₹0.00';
    
    const profitEl = document.getElementById('metric-total-profit');
    if (profitEl) {
        profitEl.textContent = '₹0.00';
        profitEl.style.color = '';
    }
    
    document.getElementById('metric-total-disputes').textContent = '0';
}

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * Parse currency strings to numerical representation.
 */
function parseValToNum(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    
    // Remove formatting characters (commas, ₹, spaces, etc.)
    const cleanStr = String(val).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

/**
 * Adds thousand separator commas to integers.
 */
function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

/**
 * Formats floats as standard Indian Lakhs/Crores values.
 */
function formatCurrency(val) {
    return val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==========================================
// APP TIMER CONTROL & REFRESHES
// ==========================================

/**
 * Updates status bar indicators
 */
function updateStatusPill(status) {
    const statusPill = document.getElementById('connection-status');
    const statusText = statusPill.querySelector('.status-text');
    
    statusPill.className = 'status-pill';
    
    switch (status) {
        case 'demo':
            statusPill.classList.add('demo-mode');
            statusText.textContent = 'Demo Mode';
            break;
        case 'syncing':
            statusPill.classList.add('demo-mode'); // uses cyan coloring
            statusText.textContent = 'Syncing...';
            break;
        case 'success':
            statusPill.classList.add('connected');
            statusText.textContent = 'Connected';
            break;
        case 'error':
            statusPill.classList.add('error');
            statusText.textContent = 'Connection Error';
            break;
    }
}

/**
 * Sets show/hide overlay states.
 */
function showLoader(show) {
    const loader = document.getElementById('table-loader');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

/**
 * Triggers refresh loops.
 */
function setupAutoRefreshTimer() {
    // Clear old trackers
    if (state.refreshTimerId) clearInterval(state.refreshTimerId);
    if (state.countdownTimerId) clearInterval(state.countdownTimerId);

    const timerLabel = document.getElementById('auto-refresh-timer');
    
    if (state.refreshRate === 0) {
        timerLabel.textContent = "Refresh: Manual";
        return;
    }

    state.nextRefreshTime = new Date(Date.now() + state.refreshRate * 1000);
    
    // Countdown updater
    updateCountdownText();
    state.countdownTimerId = setInterval(updateCountdownText, 1000);

    // Refresh executor
    state.refreshTimerId = setInterval(() => {
        fetchData();
    }, state.refreshRate * 1000);
}

/**
 * Updates header countdown visual label text.
 */
function updateCountdownText() {
    const timerLabel = document.getElementById('auto-refresh-timer');
    if (!state.nextRefreshTime) return;

    const diff = Math.max(0, Math.round((state.nextRefreshTime - Date.now()) / 1000));
    
    if (diff <= 0) {
        timerLabel.textContent = "Syncing...";
        return;
    }

    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    
    timerLabel.innerHTML = `<i data-lucide="clock" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 3px;"></i> Auto-sync: ${min}:${sec.toString().padStart(2, '0')}`;
    lucide.createIcons();
}

// ==========================================
// EXPORTS CSV SYSTEM
// ==========================================

/**
 * Generate CSV and prompt client download.
 */
function exportToCSV() {
    if (state.filteredData.length === 0) {
        alert("No records available to export.");
        return;
    }

    const headers = state.columns.map(c => c.label);
    const csvRows = [headers.join(',')];

    state.filteredData.forEach(row => {
        const values = state.columns.map(col => {
            const cellVal = row[col.label]?.f || row[col.label]?.v || '';
            // Escape double quotes and wrap in quotes if string contains comma/newlines
            const escaped = String(cellVal).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `SheetSync_${state.activeTab.replace(/\s+/g, '_')}_Export.csv`);
    document.body.appendChild(downloadLink);
    
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// ==========================================
// MODAL CONTROLS (SAVE/RESET)
// ==========================================

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');

    // Reset passcode input and lock configuration fields
    document.getElementById('input-settings-passcode').value = '';
    const feedback = document.getElementById('passcode-feedback');
    feedback.textContent = 'Enter passcode to unlock configuration.';
    feedback.style.color = '';
    
    // Hide secure fields container by default
    const secureFields = document.getElementById('secure-settings-fields');
    if (secureFields) secureFields.classList.add('hidden');
    
    document.getElementById('input-sheet-url').value = state.sheetUrl || '';
    document.getElementById('input-return-sheet-url').value = state.returnSheetUrl || '';
    document.getElementById('input-monthly-sheet-url').value = state.monthlySheetUrl || '';
    
    document.getElementById('input-sheet-url').disabled = true;
    document.getElementById('input-return-sheet-url').disabled = true;
    document.getElementById('input-monthly-sheet-url').disabled = true;
    document.getElementById('btn-save-settings').disabled = true;
    
    const tabsInput = document.getElementById('input-sheet-tabs');
    if (tabsInput) {
        tabsInput.value = state.tabs.length > 0 ? state.tabs.join(', ') : 'Detecting tabs automatically...';
    }
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

/**
 * Save settings and write to LocalStorage
 */
function handleSaveSettings(e) {
    e.preventDefault();
    
    const url = document.getElementById('input-sheet-url').value.trim();
    const returnUrl = document.getElementById('input-return-sheet-url').value.trim();
    const monthlyUrl = document.getElementById('input-monthly-sheet-url').value.trim();
    if (!url || !returnUrl || !monthlyUrl) return;

    localStorage.setItem('sheetUrl', url);
    localStorage.setItem('returnSheetUrl', returnUrl);
    localStorage.setItem('monthlySheetUrl', monthlyUrl);
    localStorage.removeItem('sheetTabs'); // Auto-detected tabs don't need manual saving

    state.sheetUrl = url;
    state.sheetId = extractSheetId(url);
    
    state.returnSheetUrl = returnUrl;
    state.returnSheetId = extractSheetId(returnUrl);

    state.monthlySheetUrl = monthlyUrl;
    state.monthlySheetId = extractSheetId(monthlyUrl);
    
    // Clear tabs list cache to force re-detection on next fetch
    state.invoiceTabs = [];
    state.returnTabs = [];
    state.monthlyTabs = [];
    state.tabs = [];
    state.activeTab = '';
    state.isDemoMode = false;

    closeSettingsModal();
    fetchData();
}

// ==========================================
// START THE APP
// ==========================================
document.addEventListener('DOMContentLoaded', init);


/**
 * ==========================================
 * POWERBI-STYLE INTERACTIVE APEXCHARTS ENGINE
 * ==========================================
 */

/**
 * Parses a Date/Month string and formats as "MMM YYYY" for grouping
 */
function extractMonthYear(dateStr) {
    if (!dateStr) return 'Other';
    dateStr = String(dateStr).trim();
    
    // Check for "Mar 2026" or "Apr 2026" formats
    if (dateStr.match(/^[A-Za-z]{3}\s+\d{4}$/)) {
        return dateStr;
    }
    
    // Standard Date parsing: DD/MM/YYYY or MM/DD/YYYY
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = match[3];
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let mIdx = month - 1;
        // Handle swap for safety
        if (month > 12 && day <= 12) {
            mIdx = day - 1;
        }
        if (mIdx >= 0 && mIdx < 12) {
            return `${monthNames[mIdx]} ${year}`;
        }
    }
    
    // Fallback: Check if string has Month Names
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    for (let i = 0; i < monthNames.length; i++) {
        if (dateStr.toLowerCase().includes(monthNames[i])) {
            const yearMatch = dateStr.match(/\b(20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : new Date().getFullYear();
            const cleanName = monthNames[i].charAt(0).toUpperCase() + monthNames[i].slice(1);
            return `${cleanName} ${year}`;
        }
    }
    
    return 'Other';
}

/**
 * Parses a Date string and returns the Day of the Week name
 */
function extractDayOfWeek(dateStr) {
    if (!dateStr) return null;
    dateStr = String(dateStr).trim();
    
    // Match DD/MM/YYYY or DD-MM-YYYY format
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
        let day = parseInt(match[1], 10);
        let month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        // Swap if month and day are reversed
        if (month > 12 && day <= 12) {
            const temp = day;
            day = month;
            month = temp;
        }
        
        const dObj = new Date(year, month - 1, day);
        if (!isNaN(dObj.getTime())) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[dObj.getDay()];
        }
    }
    
    // Fallback: standard parser
    const dObj = new Date(dateStr);
    if (!isNaN(dObj.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dObj.getDay()];
    }
    
    return null;
}

/**
 * Parses hour from timestamps like "17/04/2026 15:41:53" or "6/1/2026, 12:33:37 PM"
 */
function extractHourFromTimestamp(timeStr) {
    if (!timeStr) return null;
    timeStr = String(timeStr).trim();
    
    // Try matching 12-hour AM/PM format first
    const ampmMatch = timeStr.match(/(\d{1,2}):\d{2}:\d{2}\s*(AM|PM)/i);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const ampm = ampmMatch[2].toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        return hour;
    }
    
    // Try matching 24-hour format
    const timeMatch = timeStr.match(/\b(\d{1,2}):\d{2}:\d{2}\b/);
    if (timeMatch) {
        return parseInt(timeMatch[1], 10);
    }
    
    // Fallback search for just the hour pattern hh:mm
    const simpleMatch = timeStr.match(/(\d{1,2}):\d{2}/);
    if (simpleMatch) {
        return parseInt(simpleMatch[1], 10);
    }
    
    return null;
}

/**
 * Helper to identify Credit Note and Debit Note specific columns in Returns mode.
 */
function findReturnsColumns(keys) {
    if (!keys || keys.length === 0) return {};

    // 1. Credit Note Amount Column
    let creditAmtCol = keys.find(k => k.toLowerCase() === 'amount');
    if (!creditAmtCol) {
        creditAmtCol = keys.find(k => k.toLowerCase().includes('withtax amt') && !k.includes('(') && !k.includes('_') && !k.includes('2'));
    }
    if (!creditAmtCol) {
        creditAmtCol = keys.find(k => k.toLowerCase().includes('credit note') && k.toLowerCase().includes('amt'));
    }
    if (!creditAmtCol) {
        creditAmtCol = keys.find(k => k.toLowerCase().includes('amt') && !k.includes('(') && !k.includes('_') && !k.includes('2'));
    }

    // 2. Debit Note Amount Column
    let debitAmtCol = keys.find(k => k.toLowerCase().includes('debit note') && k.toLowerCase().includes('amt'));
    if (!debitAmtCol) {
        debitAmtCol = keys.find(k => k.toLowerCase().includes('withtax amt') && (k.includes('(') || k.includes('_') || k.includes('2') || k.toLowerCase().includes('debit')));
    }
    if (!debitAmtCol) {
        debitAmtCol = keys.filter(k => k.toLowerCase().includes('amt') || k.toLowerCase().includes('amount'))[1];
    }

    // 3. Credit Note Qty Column
    let creditQtyCol = keys.find(k => k.toLowerCase() === 'qty');
    if (!creditQtyCol) {
        creditQtyCol = keys.find(k => k.toLowerCase().includes('qty') && !k.includes('(') && !k.includes('_') && !k.includes('2'));
    }

    // 4. Debit Note Qty Column
    let debitQtyCol = keys.find(k => k.toLowerCase().includes('qty') && (k.includes('(') || k.includes('_') || k.includes('2') || k.toLowerCase().includes('debit')));
    if (!debitQtyCol) {
        debitQtyCol = keys.filter(k => k.toLowerCase().includes('qty'))[1];
    }

    // 5. Credit Note Vendor Column
    let creditVendorCol = keys.find(k => (k.toLowerCase().includes('vendor') || k.toLowerCase().includes('seller') || k.toLowerCase().includes('neme')) && !k.includes('(') && !k.includes('_') && !k.includes('2'));

    // 6. Debit Note Vendor Column
    let debitVendorCol = keys.find(k => (k.toLowerCase().includes('vendor') || k.toLowerCase().includes('seller') || k.toLowerCase().includes('neme')) && (k.includes('(') || k.includes('_') || k.includes('2') || k.toLowerCase().includes('debit')));
    if (!debitVendorCol) {
        debitVendorCol = keys.filter(k => k.toLowerCase().includes('vendor') || k.toLowerCase().includes('seller') || k.toLowerCase().includes('neme'))[1];
    }

    // 7. Dates
    let creditDateCol = keys.find(k => k.toLowerCase().includes('credit note date'));
    if (!creditDateCol) {
        creditDateCol = keys.find(k => k.toLowerCase().includes('return date') && !k.includes('(') && !k.includes('_') && !k.includes('2'));
    }
    if (!creditDateCol) {
        creditDateCol = keys.find(k => k.toLowerCase().includes('date') && !k.includes('(') && !k.includes('_') && !k.includes('2'));
    }

    let debitDateCol = keys.find(k => k.toLowerCase().includes('debit note date'));
    if (!debitDateCol) {
        debitDateCol = keys.find(k => k.toLowerCase().includes('return date') && (k.includes('(') || k.includes('_') || k.includes('2') || k.toLowerCase().includes('debit')));
    }
    if (!debitDateCol) {
        debitDateCol = keys.filter(k => k.toLowerCase().includes('date'))[1];
    }

    return {
        creditAmtCol,
        debitAmtCol,
        creditQtyCol,
        debitQtyCol,
        creditVendorCol,
        debitVendorCol,
        creditDateCol,
        debitDateCol
    };
}

/**
 * Compact number formatting helper (e.g. 150000 -> 1.5L, 20000000 -> 2Cr)
 */
function formatNumberCompact(num) {
    if (num >= 1e7) return (num / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (num >= 1e5) return (num / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return num;
}

/**
 * Aggregates dynamic metrics and renders ApexCharts
 */
function renderCharts() {
    // If ApexCharts script is not loaded, exit early
    if (typeof ApexCharts === 'undefined') {
        console.warn("ApexCharts is not loaded yet.");
        return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tooltipTheme = isDark ? 'dark' : 'light';

    // Determine active sheet brand color theme
    const activeTabLower = String(state.activeTab).toLowerCase();

    // Dynamic renaming of card headers based on activeMode (Invoices vs Returns)
    const isReturns = state.activeMode === 'returns';
    const isMonthly = state.activeMode === 'monthly';

    const lblTrend = document.getElementById('lbl-chart-trend');
    const lblPriceDist = document.getElementById('lbl-chart-price-dist');
    const lblSubSale = document.getElementById('lbl-sub-chart-sale');
    const lblSubPurchase = document.getElementById('lbl-sub-chart-purchase');
    const lblHourly = document.getElementById('lbl-chart-hourly');
    const lblVendors = document.getElementById('lbl-chart-vendors');
    const lblDayActivity = document.getElementById('lbl-chart-day-activity');
    const lblShare = document.getElementById('lbl-chart-share');

    if (isReturns) {
        if (lblTrend) lblTrend.textContent = 'Credit vs Debit Return Trend';
        if (lblPriceDist) lblPriceDist.textContent = 'Return Value Distribution';
        if (lblSubSale) lblSubSale.textContent = 'Credit Value';
        if (lblSubPurchase) lblSubPurchase.textContent = 'Debit Value';
        if (lblHourly) lblHourly.textContent = 'Hourly Return Traffic';
        if (lblVendors) lblVendors.textContent = 'Top 5 Returned Vendors';
        if (lblDayActivity) lblDayActivity.textContent = 'Day of Week Return Activity';
        if (lblShare) lblShare.textContent = 'Returned Status Breakdown';
    } else if (isMonthly) {
        if (lblTrend) lblTrend.textContent = 'Monthly Cashflow Trend';
        if (lblPriceDist) lblPriceDist.textContent = 'Price Distribution (Sale vs Purchase)';
        if (lblSubSale) lblSubSale.textContent = 'Sale Price';
        if (lblSubPurchase) lblSubPurchase.textContent = 'Purchase Price';
        if (lblHourly) lblHourly.textContent = 'Hourly Processing Traffic';
        if (lblVendors) lblVendors.textContent = 'Top 5 Vendors';
        if (lblDayActivity) lblDayActivity.textContent = 'Day of Week Sales Activity';
        if (lblShare) lblShare.textContent = 'Invoice Status Breakdown';
    } else {
        if (lblTrend) lblTrend.textContent = 'Monthly Cashflow Trend';
        if (lblPriceDist) lblPriceDist.textContent = 'Price Distribution (Sale vs Purchase)';
        if (lblSubSale) lblSubSale.textContent = 'Sale Price';
        if (lblSubPurchase) lblSubPurchase.textContent = 'Purchase Price';
        if (lblHourly) lblHourly.textContent = 'Hourly Processing Traffic';
        if (lblVendors) lblVendors.textContent = 'Top 5 Vendors';
        if (lblDayActivity) lblDayActivity.textContent = 'Day of Week Sales Activity';
        if (lblShare) lblShare.textContent = 'Invoice Status Breakdown';
    }
    
    let brandColors = {
        primary: '#6366f1', // default indigo
        secondary: '#f43f5e', // default pink-red
        accentPalette: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
        hourlyLine: '#f59e0b'
    };

    if (activeTabLower.includes('amazon')) {
        brandColors = {
            primary: '#ff9900', // Amazon Orange
            secondary: '#146eb4', // Amazon Blue
            accentPalette: ['#ff9900', '#146eb4', '#232f3e', '#388e3c', '#00a8e1'],
            hourlyLine: '#ff9900'
        };
    } else if (activeTabLower.includes('ajio')) {
        brandColors = {
            primary: '#d81b60', // AJIO Pink
            secondary: '#1e40af', // AJIO Navy
            accentPalette: ['#d81b60', '#1e40af', '#06b6d4', '#f59e0b', '#8b5cf6'],
            hourlyLine: '#d81b60'
        };
    } else if (activeTabLower.includes('myntra')) {
        brandColors = {
            primary: '#ff3f6c', // Myntra Pink
            secondary: '#ffe11b', // Myntra Yellow
            accentPalette: ['#ff3f6c', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'],
            hourlyLine: '#ff3f6c'
        };
    } else if (activeTabLower.includes('flipkart')) {
        brandColors = {
            primary: '#2874f0', // Flipkart Blue
            secondary: '#fb641b', // Flipkart Orange
            accentPalette: ['#2874f0', '#fb641b', '#ffe11b', '#10b981', '#8b5cf6'],
            hourlyLine: '#2874f0'
        };
    }

    const data = state.filteredData;
    const keys = data.length > 0 ? Object.keys(data[0]) : [];

    const rCols = isReturns ? findReturnsColumns(keys) : {};
    const creditAmtCol = rCols.creditAmtCol;
    const debitAmtCol = rCols.debitAmtCol;
    const creditQtyCol = rCols.creditQtyCol;
    const debitQtyCol = rCols.debitQtyCol;
    const creditVendorCol = rCols.creditVendorCol;
    const debitVendorCol = rCols.debitVendorCol;
    const creditDateCol = rCols.creditDateCol;
    const debitDateCol = rCols.debitDateCol;

    // Empty state fallback handling
    if (data.length === 0) {
        // Clear existing charts
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                chartInstances[key] = null;
            }
        });
        return;
    }

    // ------------------------------------------
    // 1. Trend Aggregation (Monthly Sales vs Purchase / Credit vs Debit)
    // ------------------------------------------
    const trendMap = {};
    const dateCol = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('month'));
    const saleCols = keys.filter(k => k.toLowerCase().includes('sale') && !k.toLowerCase().includes('zoho'));
    const purchaseCols = keys.filter(k => k.toLowerCase().includes('purchase') && !k.toLowerCase().includes('zoho'));

    data.forEach(row => {
        if (state.activeMode === 'returns') {
            // Credit Note (Sales returns) Monthly aggregation
            const cDateVal = creditDateCol ? (row[creditDateCol].f || row[creditDateCol].v) : '';
            const cMonthYear = extractMonthYear(cDateVal);
            if (cMonthYear !== 'Other') {
                if (!trendMap[cMonthYear]) trendMap[cMonthYear] = { sales: 0, purchases: 0 };
                const cVal = parseValToNum(row[creditAmtCol]?.f || row[creditAmtCol]?.v);
                if (!isNaN(cVal)) trendMap[cMonthYear].sales += cVal;
            }

            // Debit Note (Purchase returns) Monthly aggregation
            const dDateVal = debitDateCol ? (row[debitDateCol].f || row[debitDateCol].v) : '';
            const dMonthYear = extractMonthYear(dDateVal);
            if (dMonthYear !== 'Other') {
                if (!trendMap[dMonthYear]) trendMap[dMonthYear] = { sales: 0, purchases: 0 };
                const dVal = parseValToNum(row[debitAmtCol]?.f || row[debitAmtCol]?.v);
                if (!isNaN(dVal)) trendMap[dMonthYear].purchases += dVal;
            }
        } else {
            const dateVal = dateCol ? (row[dateCol].f || row[dateCol].v) : '';
            const monthYear = extractMonthYear(dateVal);
            
            if (!trendMap[monthYear]) {
                trendMap[monthYear] = { sales: 0, purchases: 0 };
            }

            // Sum Sales
            saleCols.forEach(col => {
                const val = parseValToNum(row[col].f || row[col].v);
                if (!isNaN(val)) trendMap[monthYear].sales += val;
            });

            // Sum Purchases
            purchaseCols.forEach(col => {
                const val = parseValToNum(row[col].f || row[col].v);
                if (!isNaN(val)) trendMap[monthYear].purchases += val;
            });
        }
    });

    // Sort Month-Years chronologically
    const sortedMonths = Object.keys(trendMap).sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        const parseDate = (str) => {
            const parts = str.split(' ');
            const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[0]);
            return new Date(parts[1] || 2026, m >= 0 ? m : 0, 1);
        };
        return parseDate(a) - parseDate(b);
    });

    const salesSeries = [];
    const purchaseSeries = [];
    sortedMonths.forEach(m => {
        salesSeries.push(Math.round(trendMap[m].sales));
        purchaseSeries.push(Math.round(trendMap[m].purchases));
    });

    // ------------------------------------------
    // 2. Share Aggregation (Donut)
    // ------------------------------------------
    const shareLabels = [];
    const shareValues = [];
    const shareMap = {};

    if (state.activeMode === 'invoices') {
        // Group by REMARK/Status
        const remarkCol = keys.find(k => k.toLowerCase() === 'remark' || k.toLowerCase() === 'status');
        data.forEach(row => {
            const label = remarkCol ? String(row[remarkCol].v || 'ALL CLEAR').trim() : 'ALL CLEAR';
            shareMap[label] = (shareMap[label] || 0) + 1;
        });
    } else if (state.activeMode === 'returns') {
        // Group by Credit Note vs Debit Note values
        let creditVal = 0;
        let debitVal = 0;
        data.forEach(row => {
            if (creditAmtCol) creditVal += parseValToNum(row[creditAmtCol].f || row[creditAmtCol].v) || 0;
            if (debitAmtCol) debitVal += parseValToNum(row[debitAmtCol].f || row[debitAmtCol].v) || 0;
        });
        if (creditVal > 0 || debitVal > 0) {
            shareMap['Credit Note'] = Math.round(creditVal);
            shareMap['Debit Note'] = Math.round(debitVal);
        } else {
            shareMap['No Data'] = 0;
        }
    } else {
        // Monthly Consolidated: Split share of marketplace channels
        let amzSales = 0, ajioSales = 0, mynSales = 0;
        const amzSaleCols = keys.filter(k => k.toUpperCase().includes('AMAZON') && k.toUpperCase().includes('SALE'));
        const ajioSaleCols = keys.filter(k => k.toUpperCase().includes('AJIO') && k.toUpperCase().includes('SALE'));
        const mynSaleCols = keys.filter(k => k.toUpperCase().includes('MYNTRA') && k.toUpperCase().includes('SALE'));
        data.forEach(row => {
            amzSaleCols.forEach(col => { amzSales += parseValToNum(row[col].f || row[col].v) || 0; });
            ajioSaleCols.forEach(col => { ajioSales += parseValToNum(row[col].f || row[col].v) || 0; });
            mynSaleCols.forEach(col => { mynSales += parseValToNum(row[col].f || row[col].v) || 0; });
        });
        shareMap['Amazon'] = Math.round(amzSales);
        shareMap['Ajio'] = Math.round(ajioSales);
        shareMap['Myntra'] = Math.round(mynSales);
    }

    Object.keys(shareMap).forEach(k => {
        shareLabels.push(k);
        shareValues.push(shareMap[k]);
    });

    // ------------------------------------------
    // 3. Hourly Processing Activity (Line)
    // ------------------------------------------
    const hourlyCounts = Array(24).fill(0);
    const timeCol = keys.find(k => k.toLowerCase().includes('time') || k.toLowerCase().includes('date & time'));
    
    data.forEach(row => {
        const timeVal = timeCol ? (row[timeCol].f || row[timeCol].v) : '';
        const hour = extractHourFromTimestamp(timeVal);
        if (hour !== null && hour >= 0 && hour < 24) {
            hourlyCounts[hour]++;
        }
    });

    const hourlyLabels = [
        '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
        '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'
    ];

    // ------------------------------------------
    // 4. Top 5 Vendors (Horizontal Bar)
    // ------------------------------------------
    const vendorMap = {};
    const vendorCol = keys.find(k => k.toLowerCase().includes('vendor') || k.toLowerCase().includes('seller'));
    
    data.forEach(row => {
        if (state.activeMode === 'returns') {
            if (creditVendorCol) {
                const cVendor = String(row[creditVendorCol]?.v || 'Other').trim();
                const cAmt = parseValToNum(row[creditAmtCol]?.f || row[creditAmtCol]?.v) || 0;
                if (cVendor && cVendor !== 'Other') {
                    vendorMap[cVendor] = (vendorMap[cVendor] || 0) + cAmt;
                }
            }
            if (debitVendorCol) {
                const dVendor = String(row[debitVendorCol]?.v || 'Other').trim();
                const dAmt = parseValToNum(row[debitAmtCol]?.f || row[debitAmtCol]?.v) || 0;
                if (dVendor && dVendor !== 'Other') {
                    vendorMap[dVendor] = (vendorMap[dVendor] || 0) + dAmt;
                }
            }
        } else {
            const vendor = vendorCol ? String(row[vendorCol].v || 'Other').trim() : 'Other';
            let sales = 0;
            saleCols.forEach(col => {
                sales += parseValToNum(row[col].f || row[col].v) || 0;
            });
            vendorMap[vendor] = (vendorMap[vendor] || 0) + sales;
        }
    });

    const sortedVendors = Object.keys(vendorMap)
        .map(v => ({ name: v, value: Math.round(vendorMap[v]) }))
        .sort((a, b) => b.value - a.value)
        .filter(v => v.name !== '' && v.name !== 'Other')
        .slice(0, 5);

    const vendorNames = sortedVendors.map(v => v.name);
    const vendorSales = sortedVendors.map(v => v.value);

    // ==========================================
    // Render or Update ApexCharts
    // ==========================================

    // Chart 1: Trend Area Chart
    const trendOptions = {
        chart: {
            type: 'area',
            height: 240,
            width: '100%',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        stroke: { curve: 'smooth', width: 2 },
        colors: [brandColors.primary, brandColors.secondary],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.02,
                stops: [0, 90, 100]
            }
        },
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
        xaxis: {
            categories: sortedMonths,
            labels: { style: { colors: textColor, fontSize: '11px' } }
        },
        yaxis: {
            labels: {
                style: { colors: textColor, fontSize: '11px' },
                formatter: (v) => '₹' + formatNumberCompact(v)
            }
        },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: state.activeMode === 'returns' ? 'Credit Note Amt' : 'Sales Amount', data: salesSeries },
            { name: state.activeMode === 'returns' ? 'Debit Note Amt' : 'Purchase Amount', data: purchaseSeries }
        ]
    };

    renderOrUpdateChart('chart-trend', 'trend', trendOptions);

    // Chart 2: Share Donut Chart
    const shareOptions = {
        chart: {
            type: 'donut',
            height: 240,
            width: '100%',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        colors: brandColors.accentPalette,
        stroke: { colors: [isDark ? '#1e293b' : '#ffffff'], width: 2 },
        labels: shareLabels,
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        name: { show: true, color: textColor },
                        value: { show: true, color: textColor, formatter: (v) => formatNumber(v) }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            labels: { colors: textColor }
        },
        series: shareValues
    };

    renderOrUpdateChart('chart-share', 'share', shareOptions);

    // Chart 3: Hourly Processing Activity
    const hourlyOptions = {
        chart: {
            type: 'line',
            height: 240,
            width: '100%',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        stroke: { curve: 'smooth', width: 3 },
        colors: [brandColors.hourlyLine],
        grid: { borderColor: gridColor },
        xaxis: {
            categories: hourlyLabels,
            labels: {
                style: { colors: textColor, fontSize: '9px' },
                hideOverlappingLabels: true
            }
        },
        yaxis: {
            labels: { style: { colors: textColor, fontSize: '11px' } }
        },
        tooltip: { theme: tooltipTheme },
        series: [{ name: state.activeMode === 'returns' ? 'Returns Processed' : 'Invoices Processed', data: hourlyCounts }]
    };

    renderOrUpdateChart('chart-hourly', 'hourly', hourlyOptions);

    // Chart 4: Top Vendors Bar Chart
    const vendorOptions = {
        chart: {
            type: 'bar',
            height: 240,
            width: '100%',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: '50%',
                distributed: true,
                borderRadius: 4
            }
        },
        colors: brandColors.accentPalette,
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
        xaxis: {
            categories: vendorNames,
            labels: {
                style: { colors: textColor, fontSize: '11px' },
                formatter: (v) => '₹' + formatNumberCompact(v)
            }
        },
        yaxis: {
            labels: { style: { colors: textColor, fontSize: '11px' } }
        },
        legend: { show: false },
        tooltip: { theme: tooltipTheme },
        series: [{ name: state.activeMode === 'returns' ? 'Return Value' : 'Sales Volume', data: vendorSales }]
    };

    renderOrUpdateChart('chart-vendors', 'vendors', vendorOptions);

    // ------------------------------------------
    // 5. Sale Price Distribution & Purchase Price Distribution (Pie Charts)
    // ------------------------------------------
    const isAmazon = activeTabLower.includes('amazon');

    let saleMap = {};
    let purchaseMap = {};

    if (isAmazon) {
        saleMap = { 'Low (< ₹5k)': 0, 'Mid (₹5k - ₹20k)': 0, 'High (> ₹20k)': 0 };
        purchaseMap = { 'Low (< ₹5k)': 0, 'Mid (₹5k - ₹20k)': 0, 'High (> ₹20k)': 0 };
    } else {
        saleMap = { 'Low (< ₹200)': 0, 'Mid-Low (₹200-500)': 0, 'Medium (₹500-700)': 0, 'Mid-High (₹700-900)': 0, 'High (> ₹900)': 0 };
        purchaseMap = { 'Low (< ₹200)': 0, 'Mid-Low (₹200-500)': 0, 'Medium (₹500-700)': 0, 'Mid-High (₹700-900)': 0, 'High (> ₹900)': 0 };
    }

    data.forEach(row => {
        let saleVal = 0;
        let purchaseVal = 0;
        let saleQty = 1;
        let purchaseQty = 1;

        if (state.activeMode === 'returns') {
            saleVal = parseValToNum(row[creditAmtCol]?.f || row[creditAmtCol]?.v) || 0;
            purchaseVal = parseValToNum(row[debitAmtCol]?.f || row[debitAmtCol]?.v) || 0;

            saleQty = parseValToNum(row[creditQtyCol] ? (row[creditQtyCol].f || row[creditQtyCol].v) : 1) || 1;
            purchaseQty = parseValToNum(row[debitQtyCol] ? (row[debitQtyCol].f || row[debitQtyCol].v) : 1) || 1;
        } else {
            saleCols.forEach(col => {
                saleVal += parseValToNum(row[col].f || row[col].v) || 0;
            });
            purchaseCols.forEach(col => {
                purchaseVal += parseValToNum(row[col].f || row[col].v) || 0;
            });
            const qty = parseValToNum(row['QTY'] ? (row['QTY'].f || row['QTY'].v) : 1) || 1;
            saleQty = qty;
            purchaseQty = qty;
        }

        // Metric to split (Invoice Size vs Per Qty Price)
        const saleMetric = isAmazon ? saleVal : (saleVal / saleQty);
        const purchaseMetric = isAmazon ? purchaseVal : (purchaseVal / purchaseQty);

        // Populate Sale Categories
        if (isAmazon) {
            if (saleMetric < 5000) saleMap['Low (< ₹5k)']++;
            else if (saleMetric <= 20000) saleMap['Mid (₹5k - ₹20k)']++;
            else saleMap['High (> ₹20k)']++;
        } else {
            if (saleMetric < 200) saleMap['Low (< ₹200)']++;
            else if (saleMetric < 500) saleMap['Mid-Low (₹200-500)']++;
            else if (saleMetric < 700) saleMap['Medium (₹500-700)']++;
            else if (saleMetric < 900) saleMap['Mid-High (₹700-900)']++;
            else saleMap['High (> ₹900)']++;
        }

        // Populate Purchase Categories
        if (isAmazon) {
            if (purchaseMetric < 5000) purchaseMap['Low (< ₹5k)']++;
            else if (purchaseMetric <= 20000) purchaseMap['Mid (₹5k - ₹20k)']++;
            else purchaseMap['High (> ₹20k)']++;
        } else {
            if (purchaseMetric < 200) purchaseMap['Low (< ₹200)']++;
            else if (purchaseMetric < 500) purchaseMap['Mid-Low (₹200-500)']++;
            else if (purchaseMetric < 700) purchaseMap['Medium (₹500-700)']++;
            else if (purchaseMetric < 900) purchaseMap['Mid-High (₹700-900)']++;
            else purchaseMap['High (> ₹900)']++;
        }
    });

    const saleDistOptions = {
        chart: {
            type: 'pie',
            height: 210,
            width: '100%',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        colors: brandColors.accentPalette.slice(0, isAmazon ? 3 : 5),
        stroke: { colors: [isDark ? '#1e293b' : '#ffffff'], width: 2 },
        labels: Object.keys(saleMap),
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        legend: {
            position: 'bottom',
            labels: { colors: textColor }
        },
        series: Object.values(saleMap)
    };

    const purchaseDistOptions = {
        chart: {
            type: 'pie',
            height: 210,
            width: '100%',
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        colors: brandColors.accentPalette.slice(0, isAmazon ? 3 : 5),
        stroke: { colors: [isDark ? '#1e293b' : '#ffffff'], width: 2 },
        labels: Object.keys(purchaseMap),
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        legend: {
            position: 'bottom',
            labels: { colors: textColor }
        },
        series: Object.values(purchaseMap)
    };

    renderOrUpdateChart('chart-sale-distribution', 'saleDist', saleDistOptions);
    renderOrUpdateChart('chart-purchase-distribution', 'purchaseDist', purchaseDistOptions);

    // ------------------------------------------
    // 6. Day of the Week Sales Activity (Column Chart)
    // ------------------------------------------
    const daySalesMap = {
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0,
        'Sunday': 0
    };
    const dayDebitMap = {
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0,
        'Sunday': 0
    };

    data.forEach(row => {
        if (state.activeMode === 'returns') {
            const cDateVal = creditDateCol ? (row[creditDateCol].f || row[creditDateCol].v) : '';
            const cDay = extractDayOfWeek(cDateVal);
            if (cDay && daySalesMap[cDay] !== undefined) {
                const cVal = parseValToNum(row[creditAmtCol]?.f || row[creditAmtCol]?.v) || 0;
                daySalesMap[cDay] += cVal;
            }

            const dDateVal = debitDateCol ? (row[debitDateCol].f || row[debitDateCol].v) : '';
            const dDay = extractDayOfWeek(dDateVal);
            if (dDay && dayDebitMap[dDay] !== undefined) {
                const dVal = parseValToNum(row[debitAmtCol]?.f || row[debitAmtCol]?.v) || 0;
                dayDebitMap[dDay] += dVal;
            }
        } else {
            const dateVal = dateCol ? (row[dateCol].f || row[dateCol].v) : '';
            const dayName = extractDayOfWeek(dateVal);
            if (dayName && daySalesMap[dayName] !== undefined) {
                let sales = 0;
                saleCols.forEach(col => {
                    sales += parseValToNum(row[col].f || row[col].v) || 0;
                });
                daySalesMap[dayName] += sales;
            }
        }
    });

    const daySalesSeries = Object.values(daySalesMap).map(v => Math.round(v));
    const dayDebitSeries = Object.values(dayDebitMap).map(v => Math.round(v));
    const dayLabels = Object.keys(daySalesMap);

    const seriesData = state.activeMode === 'returns' 
        ? [
            { name: 'Credit Note Value', data: daySalesSeries },
            { name: 'Debit Note Value', data: dayDebitSeries }
          ]
        : [{ name: 'Sales Amount', data: daySalesSeries }];

    const dayActivityOptions = {
        chart: {
            type: 'bar',
            height: 240,
            width: '100%',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'Inter, sans-serif'
        },
        theme: { mode: tooltipTheme },
        plotOptions: {
            bar: {
                columnWidth: '55%',
                borderRadius: 4
            }
        },
        colors: state.activeMode === 'returns' ? [brandColors.primary, brandColors.secondary] : [brandColors.primary],
        dataLabels: { enabled: false },
        grid: { borderColor: gridColor },
        xaxis: {
            categories: dayLabels,
            labels: { style: { colors: textColor, fontSize: '11px' } }
        },
        yaxis: {
            labels: {
                style: { colors: textColor, fontSize: '11px' },
                formatter: (v) => '₹' + formatNumberCompact(v)
            }
        },
        tooltip: { theme: tooltipTheme },
        series: seriesData
    };

    renderOrUpdateChart('chart-day-activity', 'dayActivity', dayActivityOptions);
}

/**
 * Creates new ApexCharts instance or recreates it to prevent memory leaks
 */
function renderOrUpdateChart(domId, cacheKey, options) {
    const el = document.getElementById(domId);
    if (!el) return;

    try {
        if (chartInstances[cacheKey]) {
            chartInstances[cacheKey].destroy();
        }
        chartInstances[cacheKey] = new ApexCharts(el, options);
        chartInstances[cacheKey].render();
    } catch (e) {
        console.error(`Error rendering chart ${cacheKey}:`, e);
    }
}

