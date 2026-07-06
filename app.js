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
    dayActivity: null,
    globalTrend: null,
    globalSalesShare: null,
    globalReturnsShare: null,
    globalSalesGrowth: null,
    globalPurchasesGrowth: null,
    globalReturnRateTrend: null,
    globalDisputes: null,
    globalVendors: null,
    globalUserLeaderboard: null,
    globalNetProfit: null,
    globalPlatformProfitability: null,
    globalReturnCorrelation: null,
    globalVendorReturns: null,
    globalVendorReturnRate: null,
    globalPlatformDisputeRate: null,
    globalOperatorDisputeRate: null,
    globalInvoiceBuckets: null,
    globalTopDisputedVendors: null,
    userVolumeShare: null,
    userPlatformShare: null,
    userDailyTrend: null,
    teamDailyTrend: null
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
// MONTHLY CONSOLIDATED GLOBAL CACHE
// ==========================================
const monthlyGlobalCache = {
    results: null,
    timestamp: 0
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
    if (window.lucide) {
        lucide.createIcons();
    }
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
    
    const globalSection = document.getElementById('global-dashboard-section');
    const userSection = document.getElementById('user-dashboard-section');
    const metricsContainer = document.getElementById('metrics-container');
    const analyticsSection = document.getElementById('analytics-section');
    const tableSection = document.querySelector('.table-container-card');
    const tabNavContainer = document.getElementById('tab-nav-container');
    
    if (state.activeMode === 'global') {
        if (globalSection) globalSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
        if (metricsContainer) metricsContainer.style.display = 'none';
        if (analyticsSection) analyticsSection.style.display = 'none';
        if (tableSection) tableSection.style.display = 'none';
        if (tabNavContainer) tabNavContainer.style.display = 'none';
        localStorage.setItem('viewMode', state.viewMode);
        updateSidebarHighlights();
        return;
    } else if (state.activeMode === 'user') {
        if (globalSection) globalSection.classList.add('hidden');
        if (userSection) userSection.classList.remove('hidden');
        if (metricsContainer) metricsContainer.style.display = 'none';
        if (analyticsSection) analyticsSection.style.display = 'none';
        if (tableSection) tableSection.style.display = 'none';
        if (tabNavContainer) tabNavContainer.style.display = 'none';
        localStorage.setItem('viewMode', state.viewMode);
        updateSidebarHighlights();
        return;
    } else {
        if (globalSection) globalSection.classList.add('hidden');
        if (userSection) userSection.classList.add('hidden');
        if (metricsContainer) metricsContainer.style.display = 'grid';
        if (tabNavContainer) tabNavContainer.style.display = 'flex';
    }
    
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
    updateSidebarHighlights();
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

    // Sidebar Section Accordion Collapsing/Expanding (Auto-expands sidebar if collapsed)
    document.querySelectorAll('.sidebar-group-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const group = header.closest('.sidebar-group');
            if (!group) return;

            // If it is a flat single button (like Global Analysis), bypass accordion expanding logic completely
            if (group.classList.contains('single-btn')) return;

            // If sidebar is collapsed on desktop, clicking any section header will expand the sidebar first!
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                // Open the clicked group section
                document.querySelectorAll('.sidebar-group').forEach(g => {
                    if (!g.classList.contains('single-btn')) g.classList.remove('open');
                });
                group.classList.add('open');
                return;
            }

            const isOpen = group.classList.contains('open');

            // Close all groups
            document.querySelectorAll('.sidebar-group').forEach(g => {
                if (!g.classList.contains('single-btn')) {
                    g.classList.remove('open');
                }
            });

            // Toggle current
            if (!isOpen) {
                group.classList.add('open');
            }
        });
    });

    // Sidebar View Buttons Direct Navigation
    document.querySelectorAll('.sidebar-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = btn.getAttribute('data-mode');
            const view = btn.getAttribute('data-view');
            const tab = btn.getAttribute('data-tab');
            navigateDatabaseMode(mode, view, tab);
        });
    });

    // Sidebar Platform Row Click Handler (allows clicking the row/text itself to select and collapse)
    document.querySelectorAll('.sidebar-platform-row').forEach(row => {
        row.addEventListener('click', (e) => {
            // If the user clicked one of the view buttons inside the row, let their specific listener handle it
            if (e.target.closest('.sidebar-view-btn')) return;

            const tab = row.getAttribute('data-tab');
            const group = row.closest('.sidebar-group');
            if (group && tab) {
                const mode = group.getAttribute('data-mode');
                // Navigate to this tab with the current viewMode (or default to 'data' if not set)
                navigateDatabaseMode(mode, state.viewMode || 'data', tab);
            }
        });
    });

    // Sidebar Global Analysis Flat Button Navigation
    const sidebarGlobalBtn = document.getElementById('sidebar-global-btn');
    if (sidebarGlobalBtn) {
        sidebarGlobalBtn.addEventListener('click', () => {
            // Close other accordion groups
            document.querySelectorAll('.sidebar-group').forEach(g => {
                g.classList.remove('open');
            });
            navigateDatabaseMode('global', 'chart', 'GLOBAL DASHBOARD');
        });
    }

    // Sidebar User Analysis Flat Button Navigation
    const sidebarUserBtn = document.getElementById('sidebar-user-btn');
    if (sidebarUserBtn) {
        sidebarUserBtn.addEventListener('click', () => {
            // Close other accordion groups
            document.querySelectorAll('.sidebar-group').forEach(g => {
                g.classList.remove('open');
            });
            navigateDatabaseMode('user', 'chart', 'USER DASHBOARD');
        });
    }

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

    // Global sub-navigation section selectors
    const subNavBtns = document.querySelectorAll('.sub-nav-btn');
    subNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetSection = e.currentTarget.getAttribute('data-section');
            
            // Toggle active classes
            subNavBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Toggle visibility of section grids
            const sections = ['financials', 'returns', 'operations'];
            sections.forEach(sec => {
                const el = document.getElementById(`global-section-${sec}`);
                if (el) {
                    if (sec === targetSection) {
                        el.classList.remove('hidden');
                    } else {
                        el.classList.add('hidden');
                    }
                }
            });
            
            // Dispatch resize so ApexCharts compute container widths properly when made visible
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 50);
        });
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

    // Toggle Sidebar Menu (Desktop Collapsible & Mobile Slide-Out)
    const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                if (window.innerWidth <= 991) {
                    sidebar.classList.toggle('mobile-open');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            }
        });
    }

    // Close mobile sidebar or collapse desktop sidebar if clicked outside (optional, let's keep click outside for mobile only)
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth <= 991 && sidebar.classList.contains('mobile-open')) {
            if (!e.target.closest('.sidebar') && !e.target.closest('#btn-toggle-sidebar')) {
                sidebar.classList.remove('mobile-open');
            }
        }
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
    } else if (state.activeMode === 'global' || state.activeMode === 'user') {
        currentSheetId = state.monthlySheetId;
        currentTabs = [];
    }

    // Auto-detect tab names if empty
    if (!state.isDemoMode && currentSheetId && (state.activeMode === 'global' || state.activeMode === 'user' || currentTabs.length === 0)) {
        const fetchedTabs = await fetchTabNames(currentSheetId);
        if (fetchedTabs && fetchedTabs.length > 0) {
            if (state.activeMode === 'invoices') {
                state.invoiceTabs = fetchedTabs;
                state.tabs = state.invoiceTabs;
            } else if (state.activeMode === 'returns') {
                state.returnTabs = fetchedTabs;
                state.tabs = state.returnTabs;
            } else if (state.activeMode === 'monthly') {
                state.monthlyTabs = fetchedTabs;
                state.tabs = state.monthlyTabs;
            }
            if (state.activeMode !== 'global' && state.activeMode !== 'user' && !state.tabs.includes(state.activeTab)) {
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
            } else if (state.activeMode === 'monthly') {
                state.monthlyTabs = fallbackTabs;
                state.tabs = state.monthlyTabs;
            }
            if (state.activeMode !== 'global' && state.activeMode !== 'user') {
                state.activeTab = state.tabs[0];
            }
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
        if (state.activeMode === 'global' || state.activeMode === 'user') {
            let rawResults;
            const now = Date.now();
            const cacheValidity = 60000; // Cache for 1 minute
            
            if (monthlyGlobalCache.results && (now - monthlyGlobalCache.timestamp < cacheValidity)) {
                rawResults = monthlyGlobalCache.results;
            } else {
                rawResults = await fetchGlobalMonthlyData(currentSheetId);
                monthlyGlobalCache.results = rawResults;
                monthlyGlobalCache.timestamp = now;
            }
            
            if (state.activeMode === 'global') {
                parseGlobalMonthlyData(rawResults);
            } else {
                parseUserAnalysisData(rawResults);
            }
            
            showLoader(false);
            updateStatusPill('success');
            setupAutoRefreshTimer();
            return;
        }

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
    if (state.isLoading) return;
    if (state.activeMode === mode && state.viewMode === 'both') return;

    state.activeMode = mode;
    state.viewMode = 'both';

    // Toggle styling active class
    // Toggle styling active class
    const invBtn = document.getElementById('db-switch-invoices');
    const retBtn = document.getElementById('db-switch-returns');
    const monBtn = document.getElementById('db-switch-monthly');
    const globBtn = document.getElementById('db-switch-global');

    if (invBtn) invBtn.classList.remove('active');
    if (retBtn) retBtn.classList.remove('active');
    if (monBtn) monBtn.classList.remove('active');
    if (globBtn) globBtn.classList.remove('active');

    if (mode === 'invoices') {
        if (invBtn) invBtn.classList.add('active');
        state.tabs = state.invoiceTabs;
    } else if (mode === 'returns') {
        if (retBtn) retBtn.classList.add('active');
        state.tabs = state.returnTabs;
    } else if (mode === 'monthly') {
        if (monBtn) monBtn.classList.add('active');
        state.tabs = state.monthlyTabs;
    } else if (mode === 'global') {
        if (globBtn) globBtn.classList.add('active');
        state.tabs = [];
    }

    // Safely default active tab
    if (mode === 'global') {
        state.activeTab = 'GLOBAL DASHBOARD';
    } else if (state.tabs.length > 0) {
        state.activeTab = state.tabs[0];
    } else {
        state.activeTab = '';
    }

    applyViewMode();

    // Reset list helpers
    state.currentPage = 1;
    state.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    fetchData();
}

/**
 * Handle Direct Dropdown Submenu Navigation (Selecting specific Database, ViewMode, and Tab)
 */
function navigateDatabaseMode(mode, viewMode, tabName) {
    if (state.isLoading) return;

    state.activeMode = mode;
    state.viewMode = mode === 'monthly' ? 'data' : viewMode;

    // Toggle styling active class
    const invBtn = document.getElementById('db-switch-invoices');
    const retBtn = document.getElementById('db-switch-returns');
    const monBtn = document.getElementById('db-switch-monthly');
    const globBtn = document.getElementById('db-switch-global');

    if (invBtn) invBtn.classList.remove('active');
    if (retBtn) retBtn.classList.remove('active');
    if (monBtn) monBtn.classList.remove('active');
    if (globBtn) globBtn.classList.remove('active');

    if (mode === 'invoices') {
        if (invBtn) invBtn.classList.add('active');
        state.tabs = state.invoiceTabs;
    } else if (mode === 'returns') {
        if (retBtn) retBtn.classList.add('active');
        state.tabs = state.returnTabs;
    } else if (mode === 'monthly') {
        if (monBtn) monBtn.classList.add('active');
        state.tabs = state.monthlyTabs;
    } else if (mode === 'global') {
        if (globBtn) globBtn.classList.add('active');
        state.tabs = [];
    }

    state.activeTab = tabName;

    applyViewMode();

    // Reset list helpers
    state.currentPage = 1;
    state.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    fetchData();

    // Auto-Close / Auto-Collapse sidebar when navigating
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (window.innerWidth <= 991) {
            sidebar.classList.remove('mobile-open');
        } else {
            sidebar.classList.add('collapsed');
        }
    }
}

/**
 * Update the active status highlighting for the vertical left sidebar navigation
 */
function updateSidebarHighlights() {
    // Update sidebar-group active and open states
    document.querySelectorAll('.sidebar-group').forEach(group => {
        const mode = group.getAttribute('data-mode');
        if (state.activeMode === mode) {
            group.classList.add('active');
            if (!group.classList.contains('single-btn')) {
                group.classList.add('open');
            }
        } else {
            group.classList.remove('active');
            if (!group.classList.contains('single-btn')) {
                group.classList.remove('open');
            }
        }
    });

    // Update platform row active states
    document.querySelectorAll('.sidebar-platform-row').forEach(row => {
        const tab = row.getAttribute('data-tab');
        if (state.activeTab === tab) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    });

    // Update view-toggle buttons active states
    document.querySelectorAll('.sidebar-view-btn').forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        const view = btn.getAttribute('data-view');
        const tab = btn.getAttribute('data-tab');

        if (state.activeMode === mode && state.viewMode === view && state.activeTab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update breadcrumbs header page title
    const pageTitleEl = document.getElementById('lbl-page-title');
    if (pageTitleEl) {
        let titleText = 'Invoices';
        if (state.activeMode === 'returns') titleText = 'Returns';
        else if (state.activeMode === 'monthly') titleText = 'Monthly Report';
        else if (state.activeMode === 'global') titleText = 'Global Analysis';
        else if (state.activeMode === 'user') titleText = 'User Analysis';

        if (state.activeTab && state.activeTab !== 'GLOBAL DASHBOARD' && state.activeTab !== 'USER DASHBOARD') {
            // Clean up tab display name (e.g. remove " RETURN" from AMAZON RETURN for clean display)
            let tabDisplayName = state.activeTab;
            if (tabDisplayName.includes(' RETURN')) {
                tabDisplayName = tabDisplayName.replace(' RETURN', '');
            }
            titleText += ` ❯ ${tabDisplayName}`;
        }

        if (state.activeMode !== 'global') {
            if (state.viewMode === 'data') {
                titleText += ' (Data View)';
            } else if (state.viewMode === 'chart') {
                titleText += ' (Chart View)';
            }
        }

        pageTitleEl.textContent = titleText;
    }
}

/**
 * Simulates a data fetch using demo database objects.
 */
function loadDemoData() {
    let fallbackKey = 'Invoices';
    if (state.activeMode === 'returns') fallbackKey = 'Returns';
    if (state.activeMode === 'monthly') fallbackKey = 'Monthly';
    
    const activeDemo = DEMO_DATA[state.activeTab] || DEMO_DATA[fallbackKey];
    
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

// ==========================================
// GLOBAL CONSOLIDATED DASHBOARD ENGINE
// ==========================================

/**
 * Fetches the 4 monthly sheets in parallel
 */
async function fetchGlobalMonthlyData(sheetId) {
    const tabs = ['ALL REPORT', 'MONTHLY DATA', 'ALL RETURN REPORT', 'MONTHLY RETURN DATA'];
    const promises = tabs.map(async (tab) => {
        const encodedTab = encodeURIComponent(tab);
        const endpoint = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet={encodedTab}`;
        // Correct query endpoint URL
        const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedTab}`;
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Failed fetching tab ${tab}: ${response.status}`);
        }
        const text = await response.text();
        return { tab, text };
    });
    return Promise.all(promises);
}

/**
 * Parses raw gviz json responses and invokes consolidation
 */
function parseGlobalMonthlyData(results) {
    let allReport = null;
    let monthlyData = null;
    let allReturnReport = null;
    let monthlyReturnData = null;

    results.forEach(res => {
        const parsed = parseRawGvizJson(res.text);
        if (res.tab === 'ALL REPORT') allReport = parsed;
        if (res.tab === 'MONTHLY DATA') monthlyData = parsed;
        if (res.tab === 'ALL RETURN REPORT') allReturnReport = parsed;
        if (res.tab === 'MONTHLY RETURN DATA') monthlyReturnData = parsed;
    });

    if (!allReport || !monthlyData || !allReturnReport) {
        console.error("Failed to parse critical sheets for consolidated dashboard.");
        return;
    }

    consolidateAndRenderGlobalDashboard(allReport, monthlyData, allReturnReport, monthlyReturnData);
}

/**
 * Helper to parse GViz JSON wrapped text
 */
function parseRawGvizJson(rawText) {
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    
    const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
    const json = JSON.parse(jsonString);
    return json.table; // returns { cols, rows }
}

/**
 * Helper to extract MM YYYY from cell object
 */
function extractMonthYearFromCell(cell, opCell) {
    if (opCell && opCell.v !== null && opCell.v !== undefined) {
        const valStr = String(opCell.v);
        const match = valStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (match) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const mm = parseInt(match[2]) - 1;
            const yyyy = match[3];
            if (mm >= 0 && mm < 12) {
                return `${months[mm]} ${yyyy}`;
            }
        }
    }
    if (!cell || cell.v === null || cell.v === undefined) return null;
    let val = cell.v;
    if (typeof val === 'string' && val.startsWith('Date(')) {
        val = parseGoogleDateString(val);
    }
    if (val instanceof Date) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[val.getMonth()]} ${val.getFullYear()}`;
    }
    return extractMonthYear(cell.f || cell.v);
}

/**
 * Helper to parse operator name from timestamp strings
 */
function extractOperator(timeStr) {
    if (!timeStr) return null;
    let match = timeStr.match(/\(([^)]+)\)/);
    if (match) return match[1].trim().toUpperCase();
    match = timeStr.match(/-\s*"?([A-Z\s]+)"?/i);
    if (match) return match[1].trim().toUpperCase();
    return null;
}

/**
 * Index-based row cell parser for multi-platform side-by-side columns
 */
function extractPlatformTx(row, offset, isAmazon, isAjio, isMyntra, isFlipkart) {
    const saleCell = row.c[offset + 6];
    const purchaseCell = row.c[offset + 13];
    
    let vendorIdx = offset + 17;
    
    const vendorCell = row.c[vendorIdx];
    const statusCell = row.c[offset + 16];
    const timeCell = row.c[offset + 15];
    
    return {
        sale: saleCell ? parseValToNum(saleCell.v) : 0,
        purchase: purchaseCell ? parseValToNum(purchaseCell.v) : 0,
        vendor: vendorCell ? String(vendorCell.v || '').trim() : '',
        status: statusCell ? String(statusCell.v || '').trim() : '',
        time: timeCell ? String(timeCell.v || '').trim() : ''
    };
}

// Global reference holder to avoid closure leaks on re-renders
let currentDashboardData = null;

/**
 * Consolidated dashboard logic and event binding
 */
function consolidateAndRenderGlobalDashboard(allReport, monthlyData, allReturnReport, monthlyReturnData) {
    currentDashboardData = { allReport, monthlyData, allReturnReport, monthlyReturnData };
    
    // 1. Collect unique month names
    const monthKeys = new Set();
    allReport.rows.forEach(row => {
        if (!row || !row.c) return;
        [0, 8, 16, 24].forEach(idx => {
            const m = extractMonthYearFromCell(row.c[idx]);
            if (m) monthKeys.add(m);
        });
    });
    
    const sortedMonths = Array.from(monthKeys).sort((a, b) => {
        const parseDate = (str) => {
            const parts = str.split(' ');
            const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[0]);
            return new Date(parts[1] || 2026, m >= 0 ? m : 0, 1);
        };
        return parseDate(a) - parseDate(b);
    });
    
    // 2. Populate Dropdown Month Filter
    const filterSelect = document.getElementById('global-month-filter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="ALL">All Months</option>';
        sortedMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            filterSelect.appendChild(opt);
        });
        
        // Replace with clean clone to detach previous event listeners
        const newSelect = filterSelect.cloneNode(true);
        filterSelect.parentNode.replaceChild(newSelect, filterSelect);
        
        newSelect.addEventListener('change', (e) => {
            renderFilteredDashboard(e.target.value, sortedMonths);
        });
    }
    
    // 3. Render initial dashboard
    renderFilteredDashboard('ALL', sortedMonths);
}

/**
 * Filters values and renders/updates KPIs and 9 charts
 */
function renderFilteredDashboard(selectedMonth, sortedMonths) {
    if (!currentDashboardData) return;
    
    const { allReport, monthlyData, allReturnReport, monthlyReturnData } = currentDashboardData;
    
    let totalSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;
    let totalDisputes = 0;
    
    // Helper to calculate metrics for a specific month for MoM badges
    function getMonthlySummary(monthName) {
        let sales = 0, purchases = 0, returns = 0, disputes = 0;
        
        allReport.rows.forEach(row => {
            if (!row || !row.c) return;
            // Amazon
            if (extractMonthYearFromCell(row.c[0]) === monthName) {
                sales += parseValToNum(row.c[1]?.v);
                purchases += parseValToNum(row.c[3]?.v);
                disputes += parseValToNum(row.c[6]?.v);
            }
            // Ajio
            if (extractMonthYearFromCell(row.c[8]) === monthName) {
                sales += parseValToNum(row.c[9]?.v);
                purchases += parseValToNum(row.c[11]?.v);
                disputes += parseValToNum(row.c[14]?.v);
            }
            // Myntra
            if (extractMonthYearFromCell(row.c[16]) === monthName) {
                sales += parseValToNum(row.c[17]?.v);
                purchases += parseValToNum(row.c[19]?.v);
                disputes += parseValToNum(row.c[22]?.v);
            }
            // Flipkart
            if (extractMonthYearFromCell(row.c[24]) === monthName) {
                sales += parseValToNum(row.c[25]?.v);
                purchases += parseValToNum(row.c[27]?.v);
                disputes += parseValToNum(row.c[30]?.v);
            }
        });
        
        allReturnReport.rows.forEach(row => {
            if (!row || !row.c) return;
            if (extractMonthYearFromCell(row.c[0]) === monthName) {
                returns += parseValToNum(row.c[2]?.v) + parseValToNum(row.c[4]?.v);
            }
            if (extractMonthYearFromCell(row.c[8]) === monthName) {
                returns += parseValToNum(row.c[10]?.v) + parseValToNum(row.c[12]?.v);
            }
            if (extractMonthYearFromCell(row.c[16]) === monthName) {
                returns += parseValToNum(row.c[18]?.v) + parseValToNum(row.c[20]?.v);
            }
            if (extractMonthYearFromCell(row.c[24]) === monthName) {
                returns += parseValToNum(row.c[26]?.v) + parseValToNum(row.c[28]?.v);
            }
        });
        
        return {
            sales,
            purchases,
            returns,
            disputes,
            margin: sales - purchases,
            revenue: sales - returns
        };
    }

    // MoM growth calculations
    let currMetrics = null;
    let prevMetrics = null;
    
    if (selectedMonth === 'ALL') {
        if (sortedMonths.length >= 1) {
            currMetrics = getMonthlySummary(sortedMonths[sortedMonths.length - 1]);
        }
        if (sortedMonths.length >= 2) {
            prevMetrics = getMonthlySummary(sortedMonths[sortedMonths.length - 2]);
        }
    } else {
        currMetrics = getMonthlySummary(selectedMonth);
        const idx = sortedMonths.indexOf(selectedMonth);
        if (idx > 0) {
            prevMetrics = getMonthlySummary(sortedMonths[idx - 1]);
        }
    }

    function renderGrowthBadge(elementId, currVal, prevVal, isLowerBetter = false) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        if (prevVal === null || prevVal === undefined || prevVal === 0) {
            el.className = 'kpi-badge badge-neutral';
            el.innerHTML = '<span style="font-size:10px;">no baseline</span>';
            return;
        }
        
        const diff = currVal - prevVal;
        const pct = ((diff / prevVal) * 100).toFixed(1);
        const isPositive = diff >= 0;
        
        let badgeClass = 'badge-neutral';
        let arrow = '●';
        
        if (diff !== 0) {
            if (isLowerBetter) {
                badgeClass = isPositive ? 'badge-down' : 'badge-up';
                arrow = isPositive ? '▼' : '▲';
            } else {
                badgeClass = isPositive ? 'badge-up' : 'badge-down';
                arrow = isPositive ? '▲' : '▼';
            }
        }
        
        const prefix = diff > 0 ? '+' : '';
        el.className = `kpi-badge ${badgeClass}`;
        el.innerHTML = `<span>${arrow}</span> ${prefix}${pct}% vs last month`;
    }

    if (currMetrics) {
        const pm = prevMetrics || {};
        renderGrowthBadge('global-kpi-sales-badge', currMetrics.sales, pm.sales, false);
        renderGrowthBadge('global-kpi-purchases-badge', currMetrics.purchases, pm.purchases, false);
        renderGrowthBadge('global-kpi-margin-badge', currMetrics.margin, pm.margin, false);
        renderGrowthBadge('global-kpi-returns-badge', currMetrics.returns, pm.returns, true);
        renderGrowthBadge('global-kpi-revenue-badge', currMetrics.revenue, pm.revenue, false);
        renderGrowthBadge('global-kpi-disputes-badge', currMetrics.disputes, pm.disputes, true);
    } else {
        ['sales', 'purchases', 'margin', 'returns', 'revenue', 'disputes'].forEach(k => {
            const el = document.getElementById(`global-kpi-${k}-badge`);
            if (el) el.innerHTML = '';
        });
    }
    
    // KPI Calculations from Summaries (ALL REPORT)
    allReport.rows.forEach(row => {
        if (!row || !row.c) return;
        
        // Amazon (Offset 0)
        const amzM = extractMonthYearFromCell(row.c[0]);
        if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
            totalSales += parseValToNum(row.c[1]?.v);
            totalPurchases += parseValToNum(row.c[3]?.v);
            totalDisputes += parseValToNum(row.c[6]?.v);
        }
        // Ajio (Offset 8)
        const ajioM = extractMonthYearFromCell(row.c[8]);
        if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
            totalSales += parseValToNum(row.c[9]?.v);
            totalPurchases += parseValToNum(row.c[11]?.v);
            totalDisputes += parseValToNum(row.c[14]?.v);
        }
        // Myntra (Offset 16)
        const mynM = extractMonthYearFromCell(row.c[16]);
        if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
            totalSales += parseValToNum(row.c[17]?.v);
            totalPurchases += parseValToNum(row.c[19]?.v);
            totalDisputes += parseValToNum(row.c[22]?.v);
        }
        // Flipkart (Offset 24)
        const fkM = extractMonthYearFromCell(row.c[24]);
        if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
            totalSales += parseValToNum(row.c[25]?.v);
            totalPurchases += parseValToNum(row.c[27]?.v);
            totalDisputes += parseValToNum(row.c[30]?.v);
        }
    });
    
    // KPI Returns from Summaries (ALL RETURN REPORT)
    allReturnReport.rows.forEach(row => {
        if (!row || !row.c) return;
        
        // Amazon
        const amzM = extractMonthYearFromCell(row.c[0]);
        if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
            totalReturns += parseValToNum(row.c[2]?.v) + parseValToNum(row.c[4]?.v);
        }
        // Ajio
        const ajioM = extractMonthYearFromCell(row.c[8]);
        if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
            totalReturns += parseValToNum(row.c[10]?.v) + parseValToNum(row.c[12]?.v);
        }
        // Myntra
        const mynM = extractMonthYearFromCell(row.c[16]);
        if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
            totalReturns += parseValToNum(row.c[18]?.v) + parseValToNum(row.c[20]?.v);
        }
        // Flipkart
        const fkM = extractMonthYearFromCell(row.c[24]);
        if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
            totalReturns += parseValToNum(row.c[26]?.v) + parseValToNum(row.c[28]?.v);
        }
    });
    
    let netMargin = totalSales - totalPurchases;
    let netRevenue = totalSales - totalReturns;
    
    // Injects Values to DOM Elements
    document.getElementById('global-kpi-sales').textContent = '₹ ' + formatCurrency(totalSales);
    document.getElementById('global-kpi-purchases').textContent = '₹ ' + formatCurrency(totalPurchases);
    
    const marginEl = document.getElementById('global-kpi-margin');
    marginEl.textContent = '₹ ' + formatCurrency(netMargin);
    marginEl.style.color = netMargin < 0 ? '#ef4444' : '#10b981';
    
    document.getElementById('global-kpi-returns').textContent = '₹ ' + formatCurrency(totalReturns);
    document.getElementById('global-kpi-revenue').textContent = '₹ ' + formatCurrency(netRevenue);
    document.getElementById('global-kpi-disputes').textContent = formatNumber(totalDisputes);

    // ==========================================
    // AGGREGATIONS FOR CHARTS
    // ==========================================

    // A. Historical Charts Datasets (Chronological full trend over all months)
    const salesTrend = [];
    const purchaseTrend = [];
    const returnsTrend = [];
    
    const amzSalesTrend = [];
    const ajioSalesTrend = [];
    const mynSalesTrend = [];
    const fkSalesTrend = [];
    
    const amzPurchaseTrend = [];
    const ajioPurchaseTrend = [];
    const mynPurchaseTrend = [];
    const fkPurchaseTrend = [];
    
    const amzReturnRateTrend = [];
    const ajioReturnRateTrend = [];
    const mynReturnRateTrend = [];
    const fkReturnRateTrend = [];
    
    sortedMonths.forEach(m => {
        let amzS = 0, ajioS = 0, mynS = 0, fkS = 0;
        let amzP = 0, ajioP = 0, mynP = 0, fkP = 0;
        let amzR = 0, ajioR = 0, mynR = 0, fkR = 0;
        
        allReport.rows.forEach(row => {
            if (!row || !row.c) return;
            if (extractMonthYearFromCell(row.c[0]) === m) {
                amzS += parseValToNum(row.c[1]?.v);
                amzP += parseValToNum(row.c[3]?.v);
            }
            if (extractMonthYearFromCell(row.c[8]) === m) {
                ajioS += parseValToNum(row.c[9]?.v);
                ajioP += parseValToNum(row.c[11]?.v);
            }
            if (extractMonthYearFromCell(row.c[16]) === m) {
                mynS += parseValToNum(row.c[17]?.v);
                mynP += parseValToNum(row.c[19]?.v);
            }
            if (extractMonthYearFromCell(row.c[24]) === m) {
                fkS += parseValToNum(row.c[25]?.v);
                fkP += parseValToNum(row.c[27]?.v);
            }
        });
        
        allReturnReport.rows.forEach(row => {
            if (!row || !row.c) return;
            if (extractMonthYearFromCell(row.c[0]) === m) {
                amzR += parseValToNum(row.c[2]?.v) + parseValToNum(row.c[4]?.v);
            }
            if (extractMonthYearFromCell(row.c[8]) === m) {
                ajioR += parseValToNum(row.c[10]?.v) + parseValToNum(row.c[12]?.v);
            }
            if (extractMonthYearFromCell(row.c[16]) === m) {
                mynR += parseValToNum(row.c[18]?.v) + parseValToNum(row.c[20]?.v);
            }
            if (extractMonthYearFromCell(row.c[24]) === m) {
                fkR += parseValToNum(row.c[26]?.v) + parseValToNum(row.c[28]?.v);
            }
        });
        
        // Sum combined
        salesTrend.push(Math.round(amzS + ajioS + mynS + fkS));
        purchaseTrend.push(Math.round(amzP + ajioP + mynP + fkP));
        returnsTrend.push(Math.round(amzR + ajioR + mynR + fkR));
        
        // Individual sales
        amzSalesTrend.push(Math.round(amzS));
        ajioSalesTrend.push(Math.round(ajioS));
        mynSalesTrend.push(Math.round(mynS));
        fkSalesTrend.push(Math.round(fkS));
        
        // Individual purchase
        amzPurchaseTrend.push(Math.round(amzP));
        ajioPurchaseTrend.push(Math.round(ajioP));
        mynPurchaseTrend.push(Math.round(mynP));
        fkPurchaseTrend.push(Math.round(fkP));
        
        // Return rates
        amzReturnRateTrend.push(amzS > 0 ? parseFloat(((amzR / amzS) * 100).toFixed(2)) : 0);
        ajioReturnRateTrend.push(ajioS > 0 ? parseFloat(((ajioR / ajioS) * 100).toFixed(2)) : 0);
        mynReturnRateTrend.push(mynS > 0 ? parseFloat(((mynR / mynS) * 100).toFixed(2)) : 0);
        fkReturnRateTrend.push(fkS > 0 ? parseFloat(((fkR / fkS) * 100).toFixed(2)) : 0);
    });

    const netProfitTrend = salesTrend.map((sale, i) => Math.round(sale - purchaseTrend[i]));

    // B. Filtered Datasets (React to Selected Month Filter)
    let amzSalesSel = 0, ajioSalesSel = 0, mynSalesSel = 0, fkSalesSel = 0;
    let amzPurchasesSel = 0, ajioPurchasesSel = 0, mynPurchasesSel = 0, fkPurchasesSel = 0;
    let amzReturnsSel = 0, ajioReturnsSel = 0, mynReturnsSel = 0, fkReturnsSel = 0;
    
    allReport.rows.forEach(row => {
        if (!row || !row.c) return;
        const amzM = extractMonthYearFromCell(row.c[0]);
        if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
            amzSalesSel += parseValToNum(row.c[1]?.v);
            amzPurchasesSel += parseValToNum(row.c[3]?.v);
        }
        const ajioM = extractMonthYearFromCell(row.c[8]);
        if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
            ajioSalesSel += parseValToNum(row.c[9]?.v);
            ajioPurchasesSel += parseValToNum(row.c[11]?.v);
        }
        const mynM = extractMonthYearFromCell(row.c[16]);
        if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
            mynSalesSel += parseValToNum(row.c[17]?.v);
            mynPurchasesSel += parseValToNum(row.c[19]?.v);
        }
        const fkM = extractMonthYearFromCell(row.c[24]);
        if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
            fkSalesSel += parseValToNum(row.c[25]?.v);
            fkPurchasesSel += parseValToNum(row.c[27]?.v);
        }
    });
    
    allReturnReport.rows.forEach(row => {
        if (!row || !row.c) return;
        const amzM = extractMonthYearFromCell(row.c[0]);
        if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
            amzReturnsSel += parseValToNum(row.c[2]?.v) + parseValToNum(row.c[4]?.v);
        }
        const ajioM = extractMonthYearFromCell(row.c[8]);
        if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
            ajioReturnsSel += parseValToNum(row.c[10]?.v) + parseValToNum(row.c[12]?.v);
        }
        const mynM = extractMonthYearFromCell(row.c[16]);
        if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
            mynReturnsSel += parseValToNum(row.c[18]?.v) + parseValToNum(row.c[20]?.v);
        }
        const fkM = extractMonthYearFromCell(row.c[24]);
        if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
            fkReturnsSel += parseValToNum(row.c[26]?.v) + parseValToNum(row.c[28]?.v);
        }
    });

    // Return Quantities (for correlation chart)
    let amzReturnQty = 0, ajioReturnQty = 0, mynReturnQty = 0, fkReturnQty = 0;
    
    if (monthlyReturnData && monthlyReturnData.rows) {
        monthlyReturnData.rows.forEach(row => {
            if (!row || !row.c) return;
            
            // Amazon CN
            const amzCnM = extractMonthYearFromCell(row.c[0], row.c[9]);
            if (amzCnM && (selectedMonth === 'ALL' || amzCnM === selectedMonth)) {
                amzReturnQty += parseValToNum(row.c[6]?.v);
            }
            // Amazon DN
            const amzDnM = extractMonthYearFromCell(row.c[13], row.c[22]);
            if (amzDnM && (selectedMonth === 'ALL' || amzDnM === selectedMonth)) {
                amzReturnQty += parseValToNum(row.c[19]?.v);
            }
            
            // Ajio CN
            const ajioCnM = extractMonthYearFromCell(row.c[26], row.c[35]);
            if (ajioCnM && (selectedMonth === 'ALL' || ajioCnM === selectedMonth)) {
                ajioReturnQty += parseValToNum(row.c[32]?.v);
            }
            // Ajio DN
            const ajioDnM = extractMonthYearFromCell(row.c[39], row.c[48]);
            if (ajioDnM && (selectedMonth === 'ALL' || ajioDnM === selectedMonth)) {
                ajioReturnQty += parseValToNum(row.c[45]?.v);
            }
            
            // Myntra CN
            const mynCnM = extractMonthYearFromCell(row.c[52], row.c[61]);
            if (mynCnM && (selectedMonth === 'ALL' || mynCnM === selectedMonth)) {
                mynReturnQty += parseValToNum(row.c[58]?.v);
            }
            // Myntra DN
            const mynDnM = extractMonthYearFromCell(row.c[55], row.c[74]);
            if (mynDnM && (selectedMonth === 'ALL' || mynDnM === selectedMonth)) {
                mynReturnQty += parseValToNum(row.c[71]?.v);
            }
            
            // Flipkart CN
            const fkCnM = extractMonthYearFromCell(row.c[78], row.c[87]);
            if (fkCnM && (selectedMonth === 'ALL' || fkCnM === selectedMonth)) {
                fkReturnQty += parseValToNum(row.c[84]?.v);
            }
            // Flipkart DN
            const fkDnM = extractMonthYearFromCell(row.c[91], row.c[100]);
            if (fkDnM && (selectedMonth === 'ALL' || fkDnM === selectedMonth)) {
                fkReturnQty += parseValToNum(row.c[97]?.v);
            }
        });
    }

    // Vendor Returns Contribution (Amount & Qty)
    const vendorReturnsAmt = {};
    const vendorReturnQty = {};
    const vendorSalesQty = {};
    
    if (monthlyReturnData && monthlyReturnData.rows) {
        monthlyReturnData.rows.forEach(row => {
            if (!row || !row.c) return;
            
            // Amazon CN
            const amzCnM = extractMonthYearFromCell(row.c[0], row.c[9]);
            if (amzCnM && (selectedMonth === 'ALL' || amzCnM === selectedMonth)) {
                const sCN = row.c[8] ? String(row.c[8].v || '').trim() : '';
                if (sCN && sCN !== 'Other') {
                    vendorReturnsAmt[sCN] = (vendorReturnsAmt[sCN] || 0) + parseValToNum(row.c[7]?.v);
                    vendorReturnQty[sCN] = (vendorReturnQty[sCN] || 0) + parseValToNum(row.c[6]?.v);
                }
            }
            // Amazon DN
            const amzDnM = extractMonthYearFromCell(row.c[13], row.c[22]);
            if (amzDnM && (selectedMonth === 'ALL' || amzDnM === selectedMonth)) {
                const sDN = row.c[21] ? String(row.c[21].v || '').trim() : '';
                if (sDN && sDN !== 'Other') {
                    vendorReturnsAmt[sDN] = (vendorReturnsAmt[sDN] || 0) + parseValToNum(row.c[20]?.v);
                    vendorReturnQty[sDN] = (vendorReturnQty[sDN] || 0) + parseValToNum(row.c[19]?.v);
                }
            }
            
            // Ajio CN
            const ajioCnM = extractMonthYearFromCell(row.c[26], row.c[35]);
            if (ajioCnM && (selectedMonth === 'ALL' || ajioCnM === selectedMonth)) {
                const sCN = row.c[34] ? String(row.c[34].v || '').trim() : '';
                if (sCN && sCN !== 'Other') {
                    vendorReturnsAmt[sCN] = (vendorReturnsAmt[sCN] || 0) + parseValToNum(row.c[33]?.v);
                    vendorReturnQty[sCN] = (vendorReturnQty[sCN] || 0) + parseValToNum(row.c[32]?.v);
                }
            }
            // Ajio DN
            const ajioDnM = extractMonthYearFromCell(row.c[39], row.c[48]);
            if (ajioDnM && (selectedMonth === 'ALL' || ajioDnM === selectedMonth)) {
                const sDN = row.c[47] ? String(row.c[47].v || '').trim() : '';
                if (sDN && sDN !== 'Other') {
                    vendorReturnsAmt[sDN] = (vendorReturnsAmt[sDN] || 0) + parseValToNum(row.c[46]?.v);
                    vendorReturnQty[sDN] = (vendorReturnQty[sDN] || 0) + parseValToNum(row.c[45]?.v);
                }
            }
            
            // Myntra CN
            const mynCnM = extractMonthYearFromCell(row.c[52], row.c[61]);
            if (mynCnM && (selectedMonth === 'ALL' || mynCnM === selectedMonth)) {
                const sCN = row.c[60] ? String(row.c[60].v || '').trim() : '';
                if (sCN && sCN !== 'Other') {
                    vendorReturnsAmt[sCN] = (vendorReturnsAmt[sCN] || 0) + parseValToNum(row.c[59]?.v);
                    vendorReturnQty[sCN] = (vendorReturnQty[sCN] || 0) + parseValToNum(row.c[58]?.v);
                }
            }
            // Myntra DN
            const mynDnM = extractMonthYearFromCell(row.c[55], row.c[74]);
            if (mynDnM && (selectedMonth === 'ALL' || mynDnM === selectedMonth)) {
                const sDN = row.c[73] ? String(row.c[73].v || '').trim() : '';
                if (sDN && sDN !== 'Other') {
                    vendorReturnsAmt[sDN] = (vendorReturnsAmt[sDN] || 0) + parseValToNum(row.c[72]?.v);
                    vendorReturnQty[sDN] = (vendorReturnQty[sDN] || 0) + parseValToNum(row.c[71]?.v);
                }
            }
            
            // Flipkart CN
            const fkCnM = extractMonthYearFromCell(row.c[78], row.c[87]);
            if (fkCnM && (selectedMonth === 'ALL' || fkCnM === selectedMonth)) {
                const sCN = row.c[86] ? String(row.c[86].v || '').trim() : '';
                if (sCN && sCN !== 'Other') {
                    vendorReturnsAmt[sCN] = (vendorReturnsAmt[sCN] || 0) + parseValToNum(row.c[85]?.v);
                    vendorReturnQty[sCN] = (vendorReturnQty[sCN] || 0) + parseValToNum(row.c[84]?.v);
                }
            }
            // Flipkart DN
            const fkDnM = extractMonthYearFromCell(row.c[91], row.c[100]);
            if (fkDnM && (selectedMonth === 'ALL' || fkDnM === selectedMonth)) {
                const sDN = row.c[99] ? String(row.c[99].v || '').trim() : '';
                if (sDN && sDN !== 'Other') {
                    vendorReturnsAmt[sDN] = (vendorReturnsAmt[sDN] || 0) + parseValToNum(row.c[98]?.v);
                    vendorReturnQty[sDN] = (vendorReturnQty[sDN] || 0) + parseValToNum(row.c[97]?.v);
                }
            }
        });
    }

    const sortedVendorReturns = Object.keys(vendorReturnsAmt)
        .map(s => ({ name: s, amount: Math.round(vendorReturnsAmt[s]) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const vendorReturnNames = sortedVendorReturns.map(v => v.name);
    const vendorReturnAmounts = sortedVendorReturns.map(v => v.amount);

    const vendorSales = {};
    const vendorPurchases = {};
    const vendorDisputes = {};
    const operatorCounts = {};
    const opTotal = {};
    const opDisputes = {};
    
    let amzDisputes = 0, amzClear = 0;
    let ajioDisputes = 0, ajioClear = 0;
    let mynDisputes = 0, mynClear = 0;
    let fkDisputes = 0, fkClear = 0;

    let bucketUnder500 = 0;
    let bucket500to1000 = 0;
    let bucket1000to2000 = 0;
    let bucketOver2000 = 0;

    monthlyData.rows.forEach(row => {
        if (!row || !row.c) return;
        
        // Helper to check disputes and operators
        const checkOpAndDispute = (tx, defaultUser, platformName) => {
            const op = extractOperator(tx.time) || defaultUser;
            if (op && op !== 'TRUE' && !op.includes('2026')) {
                operatorCounts[op] = (operatorCounts[op] || 0) + 1;
                opTotal[op] = (opTotal[op] || 0) + 1;
            }
            
            let isDispute = false;
            if (tx.status) {
                const st = tx.status.toUpperCase();
                if (st.includes('DISPUTE') || st.includes('HOLD') || st.includes('REJECT')) {
                    isDispute = true;
                    if (platformName === 'amz') amzDisputes++;
                    if (platformName === 'ajio') ajioDisputes++;
                    if (platformName === 'myn') mynDisputes++;
                    if (platformName === 'fk') fkDisputes++;
                    
                    if (op && op !== 'TRUE' && !op.includes('2026')) {
                        opDisputes[op] = (opDisputes[op] || 0) + 1;
                    }
                    if (tx.vendor) {
                        vendorDisputes[tx.vendor] = (vendorDisputes[tx.vendor] || 0) + 1;
                    }
                } else if (st === 'ALL CLEAR') {
                    if (platformName === 'amz') amzClear++;
                    if (platformName === 'ajio') ajioClear++;
                    if (platformName === 'myn') mynClear++;
                    if (platformName === 'fk') fkClear++;
                }
            }
        };

        const classifyBucket = (saleVal) => {
            if (saleVal > 0) {
                if (saleVal < 500) bucketUnder500++;
                else if (saleVal <= 1000) bucket500to1000++;
                else if (saleVal <= 2000) bucket1000to2000++;
                else bucketOver2000++;
            }
        };
        
        // Amazon (Offset 0)
        const amzM = extractMonthYearFromCell(row.c[0], row.c[15]);
        if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
            const tx = extractPlatformTx(row, 0, true, false, false, false);
            if (tx.vendor) {
                vendorSales[tx.vendor] = (vendorSales[tx.vendor] || 0) + tx.sale;
                vendorPurchases[tx.vendor] = (vendorPurchases[tx.vendor] || 0) + tx.purchase;
                const q = parseValToNum(row.c[5]?.v);
                vendorSalesQty[tx.vendor] = (vendorSalesQty[tx.vendor] || 0) + q;
            }
            const user = row.c[18] ? String(row.c[18].v || '').trim().toUpperCase() : null;
            checkOpAndDispute(tx, user, 'amz');
            classifyBucket(tx.sale);
        }
        
        // Ajio (Offset 21)
        const ajioM = extractMonthYearFromCell(row.c[21], row.c[36]);
        if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
            const tx = extractPlatformTx(row, 21, false, true, false, false);
            if (tx.vendor) {
                vendorSales[tx.vendor] = (vendorSales[tx.vendor] || 0) + tx.sale;
                vendorPurchases[tx.vendor] = (vendorPurchases[tx.vendor] || 0) + tx.purchase;
                const q = parseValToNum(row.c[26]?.v);
                vendorSalesQty[tx.vendor] = (vendorSalesQty[tx.vendor] || 0) + q;
            }
            checkOpAndDispute(tx, null, 'ajio');
            classifyBucket(tx.sale);
        }
        
        // Myntra (Offset 42)
        const mynM = extractMonthYearFromCell(row.c[42], row.c[57]);
        if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
            const tx = extractPlatformTx(row, 42, false, false, true, false);
            if (tx.vendor) {
                vendorSales[tx.vendor] = (vendorSales[tx.vendor] || 0) + tx.sale;
                vendorPurchases[tx.vendor] = (vendorPurchases[tx.vendor] || 0) + tx.purchase;
                const q = parseValToNum(row.c[47]?.v);
                vendorSalesQty[tx.vendor] = (vendorSalesQty[tx.vendor] || 0) + q;
            }
            checkOpAndDispute(tx, null, 'myn');
            classifyBucket(tx.sale);
        }
        
        // Flipkart (Offset 62)
        const fkM = extractMonthYearFromCell(row.c[62], row.c[77]);
        if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
            const tx = extractPlatformTx(row, 62, false, false, false, true);
            if (tx.vendor) {
                vendorSales[tx.vendor] = (vendorSales[tx.vendor] || 0) + tx.sale;
                vendorPurchases[tx.vendor] = (vendorPurchases[tx.vendor] || 0) + tx.purchase;
                const q = parseValToNum(row.c[67]?.v);
                vendorSalesQty[tx.vendor] = (vendorSalesQty[tx.vendor] || 0) + q;
            }
            const user = row.c[80] ? String(row.c[80].v || '').trim().toUpperCase() : null;
            checkOpAndDispute(tx, user, 'fk');
            classifyBucket(tx.sale);
        }
    });

    // Formatting Top Vendors
    const sortedVendors = Object.keys(vendorSales)
        .map(v => ({
            name: v,
            sale: Math.round(vendorSales[v]),
            purchase: Math.round(vendorPurchases[v] || 0)
        }))
        .filter(v => v.name !== '' && v.name !== 'Other')
        .sort((a, b) => b.sale - a.sale)
        .slice(0, 5);

    const vendorNames = sortedVendors.map(v => v.name);
    const vendorSalesArr = sortedVendors.map(v => v.sale);
    const vendorPurchasesArr = sortedVendors.map(v => v.purchase);

    // Vendor Return Rates for Top Vendors by Qty
    const sortedVendorsByQty = Object.keys(vendorSalesQty)
        .map(v => ({
            name: v,
            salesQty: vendorSalesQty[v],
            returnQty: vendorReturnQty[v] || 0
        }))
        .filter(v => v.name !== '' && v.name !== 'Other')
        .sort((a, b) => b.salesQty - a.salesQty)
        .slice(0, 5);

    const vendorQtyNames = sortedVendorsByQty.map(v => v.name);
    const vendorReturnRates = sortedVendorsByQty.map(v => {
        return v.salesQty > 0 ? parseFloat(((v.returnQty / v.salesQty) * 100).toFixed(2)) : 0;
    });

    // Formatting Operators by Volume
    const sortedOperators = Object.keys(operatorCounts)
        .map(op => ({ name: op, count: operatorCounts[op] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const opNames = sortedOperators.map(o => o.name);
    const opCounts = sortedOperators.map(o => o.count);

    // Operator Dispute Rates
    const sortedOpsByVolume = Object.keys(opTotal)
        .map(op => ({
            name: op,
            total: opTotal[op],
            disputes: opDisputes[op] || 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const opRateNames = sortedOpsByVolume.map(o => o.name);
    const opDisputeRates = sortedOpsByVolume.map(o => {
        return o.total > 0 ? parseFloat(((o.disputes / o.total) * 100).toFixed(2)) : 0;
    });

    // Disputed Vendors
    const sortedDisputedVendors = Object.keys(vendorDisputes)
        .map(v => ({ name: v, disputes: vendorDisputes[v] }))
        .filter(v => v.name !== '' && v.name !== 'Other')
        .sort((a, b) => b.disputes - a.disputes)
        .slice(0, 5);

    const disputedVendorNames = sortedDisputedVendors.map(v => v.name);
    const disputedVendorCounts = sortedDisputedVendors.map(v => v.disputes);

    // Theme Configs
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tooltipTheme = isDark ? 'dark' : 'light';
    const globalBrandColors = ['#ff9900', '#d81b60', '#ff3f6c', '#2874f0']; // Amazon, Ajio, Myntra, Flipkart

    // ==========================================
    // RENDER 18 CHARTS INSTANCES
    // ==========================================

    // SECTION 1: FINANCIALS
    
    // 1. Consolidated Trend (Area Chart)
    const trendOptions = {
        chart: { type: 'area', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#6366f1', '#f43f5e', '#f59e0b'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.01 } },
        grid: { borderColor: gridColor },
        xaxis: { categories: sortedMonths, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => '₹' + formatNumberCompact(v) } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Consolidated Sales', data: salesTrend },
            { name: 'Consolidated Purchases', data: purchaseTrend },
            { name: 'Consolidated Returns', data: returnsTrend }
        ]
    };
    renderOrUpdateChart('global-chart-trend', 'globalTrend', trendOptions);

    // 2. Sales Share (Donut Chart)
    const salesShareOptions = {
        chart: { type: 'donut', height: 240, width: '100%', background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: globalBrandColors,
        stroke: { colors: [isDark ? '#151c2c' : '#ffffff'], width: 2 },
        labels: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'],
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: [Math.round(amzSalesSel), Math.round(ajioSalesSel), Math.round(mynSalesSel), Math.round(fkSalesSel)]
    };
    renderOrUpdateChart('global-chart-sales-share', 'globalSalesShare', salesShareOptions);

    // 3. Sales Growth (Line Chart)
    const salesGrowthOptions = {
        chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: globalBrandColors,
        grid: { borderColor: gridColor },
        xaxis: { categories: sortedMonths, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => '₹' + formatNumberCompact(v) } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Amazon Sales', data: amzSalesTrend },
            { name: 'Ajio Sales', data: ajioSalesTrend },
            { name: 'Myntra Sales', data: mynSalesTrend },
            { name: 'Flipkart Sales', data: fkSalesTrend }
        ]
    };
    renderOrUpdateChart('global-chart-sales-growth', 'globalSalesGrowth', salesGrowthOptions);

    // 4. Purchase Growth (Line Chart)
    const purchaseGrowthOptions = {
        chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: globalBrandColors,
        grid: { borderColor: gridColor },
        xaxis: { categories: sortedMonths, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => '₹' + formatNumberCompact(v) } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Amazon Purchase', data: amzPurchaseTrend },
            { name: 'Ajio Purchase', data: ajioPurchaseTrend },
            { name: 'Myntra Purchase', data: mynPurchaseTrend },
            { name: 'Flipkart Purchase', data: fkPurchaseTrend }
        ]
    };
    renderOrUpdateChart('global-chart-purchases-growth', 'globalPurchasesGrowth', purchaseGrowthOptions);

    // 5. Monthly Net Profit Trend (Line Chart) [NEW]
    const netProfitOptions = {
        chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        stroke: { curve: 'smooth', width: 3 },
        colors: ['#10b981'],
        grid: { borderColor: gridColor },
        xaxis: { categories: sortedMonths, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => '₹' + formatNumberCompact(v) } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Net Profit', data: netProfitTrend }]
    };
    renderOrUpdateChart('global-chart-net-profit', 'globalNetProfit', netProfitOptions);

    // 6. Marketplace Margin % (Column Chart) [NEW]
    const amzMargin = amzSalesSel > 0 ? parseFloat((((amzSalesSel - amzPurchasesSel) / amzSalesSel) * 100).toFixed(1)) : 0;
    const ajioMargin = ajioSalesSel > 0 ? parseFloat((((ajioSalesSel - ajioPurchasesSel) / ajioSalesSel) * 100).toFixed(1)) : 0;
    const mynMargin = mynSalesSel > 0 ? parseFloat((((mynSalesSel - mynPurchasesSel) / mynSalesSel) * 100).toFixed(1)) : 0;
    const fkMargin = fkSalesSel > 0 ? parseFloat((((fkSalesSel - fkPurchasesSel) / fkSalesSel) * 100).toFixed(1)) : 0;

    const profitabilityOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: globalBrandColors,
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 4 } },
        xaxis: { categories: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'], labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => v.toFixed(1) + "%" } },
        tooltip: { theme: tooltipTheme },
        legend: { show: false },
        series: [{ name: 'Margin %', data: [amzMargin, ajioMargin, mynMargin, fkMargin] }]
    };
    renderOrUpdateChart('global-chart-platform-profitability', 'globalPlatformProfitability', profitabilityOptions);


    // SECTION 2: RETURNS & QUALITY

    // 7. Returns Share (Donut Chart)
    const returnsShareOptions = {
        chart: { type: 'donut', height: 240, width: '100%', background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: globalBrandColors,
        stroke: { colors: [isDark ? '#151c2c' : '#ffffff'], width: 2 },
        labels: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'],
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: [Math.round(amzReturnsSel), Math.round(ajioReturnsSel), Math.round(mynReturnsSel), Math.round(fkReturnsSel)]
    };
    renderOrUpdateChart('global-chart-returns-share', 'globalReturnsShare', returnsShareOptions);

    // 8. Return Rate Trend (Line Chart)
    const returnRateOptions = {
        chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: globalBrandColors,
        grid: { borderColor: gridColor },
        xaxis: { categories: sortedMonths, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => v.toFixed(1) + "%" } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Amazon CN Rate %', data: amzReturnRateTrend },
            { name: 'Ajio CN Rate %', data: ajioReturnRateTrend },
            { name: 'Myntra CN Rate %', data: mynReturnRateTrend },
            { name: 'Flipkart CN Rate %', data: fkReturnRateTrend }
        ]
    };
    renderOrUpdateChart('global-chart-return-rate-trend', 'globalReturnRateTrend', returnRateOptions);

    // 9. Return Qty vs CN Value Correlation (Dual-Axis Chart) [NEW]
    const correlationOptions = {
        chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#06b6d4', '#ff3f6c'],
        stroke: { width: [0, 3] },
        plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
        xaxis: { categories: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'], labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: [
            { title: { text: 'Return Qty', style: { color: textColor } }, labels: { style: { colors: textColor } } },
            { opposite: true, title: { text: 'CN Value (₹)', style: { color: textColor } }, labels: { style: { colors: textColor }, formatter: (v) => '₹' + formatNumberCompact(v) } }
        ],
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Return Quantity', type: 'column', data: [amzReturnQty, ajioReturnQty, mynReturnQty, fkReturnQty] },
            { name: 'Credit Note Value', type: 'line', data: [amzReturnsSel, ajioReturnsSel, mynReturnsSel, fkReturnsSel] }
        ]
    };
    renderOrUpdateChart('global-chart-return-correlation', 'globalReturnCorrelation', correlationOptions);

    // 10. Vendor Return Contribution (Donut Chart) [NEW]
    const vendorReturnsOptions = {
        chart: { type: 'donut', height: 240, width: '100%', background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#ef4444'],
        stroke: { colors: [isDark ? '#151c2c' : '#ffffff'], width: 2 },
        labels: vendorReturnNames.length > 0 ? vendorReturnNames : ['No Returns'],
        dataLabels: { enabled: true },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: vendorReturnAmounts.length > 0 ? vendorReturnAmounts : [0]
    };
    renderOrUpdateChart('global-chart-vendor-returns', 'globalVendorReturns', vendorReturnsOptions);

    // 11. Vendor Return Rate % (Column Chart) [NEW]
    const vendorReturnRateOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#ef4444'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
        xaxis: { categories: vendorQtyNames, labels: { style: { colors: textColor, fontSize: '9px' }, hideOverlappingLabels: true } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => v.toFixed(1) + "%" } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Return Rate %', data: vendorReturnRates }]
    };
    renderOrUpdateChart('global-chart-vendor-return-rate', 'globalVendorReturnRate', vendorReturnRateOptions);


    // SECTION 3: OPERATIONS & STAFF
    
    // 12. Operator Performance Leaderboard (Horizontal Bar)
    const operatorsOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#06b6d4'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { horizontal: true, barHeight: '50%', borderRadius: 4 } },
        xaxis: { categories: opNames, labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Invoices Processed', data: opCounts }]
    };
    renderOrUpdateChart('global-chart-user-leaderboard', 'globalUserLeaderboard', operatorsOptions);

    // 13. Disputes vs Clear (Stacked Column)
    const disputesOptions = {
        chart: { type: 'bar', height: 240, width: '100%', stacked: true, toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#10b981', '#ef4444'], // Emerald (Clear) vs Rose (Dispute)
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
        xaxis: { categories: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'], labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'All Clear', data: [amzClear, ajioClear, mynClear, fkClear] },
            { name: 'Disputed', data: [amzDisputes, ajioDisputes, mynDisputes, fkDisputes] }
        ]
    };
    renderOrUpdateChart('global-chart-disputes', 'globalDisputes', disputesOptions);

    // 14. Platform Dispute Rate % (Column Chart) [NEW]
    const amzDispRate = (amzClear + amzDisputes) > 0 ? parseFloat(((amzDisputes / (amzClear + amzDisputes)) * 100).toFixed(1)) : 0;
    const ajioDispRate = (ajioClear + ajioDisputes) > 0 ? parseFloat(((ajioDisputes / (ajioClear + ajioDisputes)) * 100).toFixed(1)) : 0;
    const mynDispRate = (mynClear + mynDisputes) > 0 ? parseFloat(((mynDisputes / (mynClear + mynDisputes)) * 100).toFixed(1)) : 0;
    const fkDispRate = (fkClear + fkDisputes) > 0 ? parseFloat(((fkDisputes / (fkClear + fkDisputes)) * 100).toFixed(1)) : 0;

    const platformDisputeRateOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: globalBrandColors,
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 4 } },
        xaxis: { categories: ['Amazon', 'Ajio', 'Myntra', 'Flipkart'], labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => v.toFixed(1) + "%" } },
        tooltip: { theme: tooltipTheme },
        legend: { show: false },
        series: [{ name: 'Dispute Rate %', data: [amzDispRate, ajioDispRate, mynDispRate, fkDispRate] }]
    };
    renderOrUpdateChart('global-chart-platform-dispute-rate', 'globalPlatformDisputeRate', platformDisputeRateOptions);

    // 15. Top 5 Vendors (Grouped Column)
    const vendorsOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#6366f1', '#f43f5e'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
        xaxis: { categories: vendorNames, labels: { style: { colors: textColor, fontSize: '9px' }, hideOverlappingLabels: true } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => '₹' + formatNumberCompact(v) } },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Sales Value', data: vendorSalesArr },
            { name: 'Purchase Value', data: vendorPurchasesArr }
        ]
    };
    renderOrUpdateChart('global-chart-vendors', 'globalVendors', vendorsOptions);

    // 16. Operator Dispute Rate % (Horizontal Bar Chart) [NEW]
    const operatorDisputeRateOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#f59e0b'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { horizontal: true, barHeight: '50%', borderRadius: 4 } },
        xaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: (v) => v.toFixed(1) + "%" } },
        yaxis: { categories: opRateNames, labels: { style: { colors: textColor, fontSize: '11px' } } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Dispute Rate %', data: opDisputeRates }]
    };
    renderOrUpdateChart('global-chart-operator-dispute-rate', 'globalOperatorDisputeRate', operatorDisputeRateOptions);

    // 17. Invoice Value Buckets (Bar Chart) [NEW]
    const invoiceBucketsOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#8b5cf6'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
        xaxis: { categories: ['< ₹500', '₹500 - ₹1000', '₹1000 - ₹2000', '> ₹2000'], labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Invoices Count', data: [bucketUnder500, bucket500to1000, bucket1000to2000, bucketOver2000] }]
    };
    renderOrUpdateChart('global-chart-invoice-buckets', 'globalInvoiceBuckets', invoiceBucketsOptions);

    // 18. Top 5 Disputed Vendors (Horizontal Bar Chart) [NEW]
    const topDisputedVendorsOptions = {
        chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#ef4444'],
        grid: { borderColor: gridColor },
        plotOptions: { bar: { horizontal: true, barHeight: '50%', borderRadius: 4 } },
        xaxis: { labels: { style: { colors: textColor, fontSize: '11px' } } },
        yaxis: { categories: disputedVendorNames, labels: { style: { colors: textColor, fontSize: '9px' } } },
        tooltip: { theme: tooltipTheme },
        series: [{ name: 'Disputes Count', data: disputedVendorCounts }]
    };
    renderOrUpdateChart('global-chart-top-disputed-vendors', 'globalTopDisputedVendors', topDisputedVendorsOptions);

    // Redraw Lucide Icons in KPI cards
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Parses raw gviz json responses and invokes consolidation for User Analysis
 */
function parseUserAnalysisData(results) {
    let allReport = null;
    let monthlyData = null;
    let allReturnReport = null;
    let monthlyReturnData = null;

    results.forEach(res => {
        const parsed = parseRawGvizJson(res.text);
        if (res.tab === 'ALL REPORT') allReport = parsed;
        if (res.tab === 'MONTHLY DATA') monthlyData = parsed;
        if (res.tab === 'ALL RETURN REPORT') allReturnReport = parsed;
        if (res.tab === 'MONTHLY RETURN DATA') monthlyReturnData = parsed;
    });

    if (!allReport || !monthlyData || !allReturnReport) {
        console.error("Failed to parse critical sheets for consolidated user analysis.");
        return;
    }

    currentDashboardData = { allReport, monthlyData, allReturnReport, monthlyReturnData };

    // 1. Collect unique month names
    const monthKeys = new Set();
    allReport.rows.forEach(row => {
        if (!row || !row.c) return;
        [0, 8, 16, 24].forEach(idx => {
            const m = extractMonthYearFromCell(row.c[idx]);
            if (m) monthKeys.add(m);
        });
    });

    const sortedMonths = Array.from(monthKeys).sort((a, b) => {
        const parseDate = (str) => {
            const parts = str.split(' ');
            const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(parts[0]);
            return new Date(parts[1] || 2026, m >= 0 ? m : 0, 1);
        };
        return parseDate(a) - parseDate(b);
    });

    // 2. Populate Dropdown Month Filter
    const filterSelect = document.getElementById('user-month-filter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="ALL">All Months</option>';
        sortedMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            filterSelect.appendChild(opt);
        });

        // Replace with clean clone to detach previous event listeners
        const newSelect = filterSelect.cloneNode(true);
        filterSelect.parentNode.replaceChild(newSelect, filterSelect);

        newSelect.addEventListener('change', (e) => {
            renderUserDashboard(e.target.value, sortedMonths);
        });
    }

    // Wire sort dropdown if not already wired
    const sortSelect = document.getElementById('leaderboard-sort-select');
    if (sortSelect && !sortSelect.dataset.wired) {
        sortSelect.dataset.wired = 'true';
        sortSelect.addEventListener('change', () => {
            renderUserDashboard(state.selectedUserMonth || 'ALL', sortedMonths);
        });
    }

    // 3. Render initial dashboard
    renderUserDashboard('ALL', sortedMonths);
}

/**
 * Calculates and renders User Performance analytics and charts
 */
function renderUserDashboard(selectedMonth, sortedMonths) {
    if (!currentDashboardData) return;

    const { monthlyData, monthlyReturnData } = currentDashboardData;
    const users = {};

    const isValidOperator = (op) => {
        return op && op !== 'TRUE' && !op.includes('2026') && op.length > 2;
    };

    const ensureUser = (name) => {
        if (!users[name]) {
            users[name] = {
                name: name,
                salesCount: 0,
                salesAmount: 0,
                salesQty: 0,
                purchaseQty: 0,
                returnCount: 0,
                returnAmount: 0,
                disputes: 0,
                platforms: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformSales: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformPurchases: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformSalesQty: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformPurchasesQty: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformReturnsCount: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                platformReturnsAmount: { amz: 0, ajio: 0, myn: 0, fk: 0 },
                dailyLog: {}
            };
        }
        return users[name];
    };

    // Helper to extract a short date string (DD-MM-YYYY) from a cell (can be Date object, timestamp string, or fallback)
    const extractDateKey = (cell, fallbackCell) => {
        if (!cell || (cell.v === null && cell.f === null)) {
            return fallbackCell ? extractDateKey(fallbackCell) : null;
        }

        // 1. Try extracting from formatted value cell.f first, as it contains the exact day/month/year shown in the sheet
        if (cell.f) {
            let fVal = String(cell.f);
            // Match DD/MM/YYYY or MM/DD/YYYY or M/D/YYYY or D/M/YYYY
            const match = fVal.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
            if (match) {
                const dd = match[1].padStart(2, '0');
                const mm = match[2].padStart(2, '0');
                const yyyy = match[3].length === 2 ? '20' + match[3] : match[3];
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        
        let val = cell.v !== null && cell.v !== undefined ? String(cell.v) : '';
        
        // 2. Try matching timestamp string starting with Date/Time like "03/07/2026 10:41:46 - JANVI"
        // Regex matches DD/MM/YYYY or MM/DD/YYYY or M/D/YYYY or D/M/YYYY
        const match = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (match) {
            const dd = match[1].padStart(2, '0');
            const mm = match[2].padStart(2, '0');
            return `${dd}-${mm}-${match[3]}`;
        }
        const matchShortYear = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})/);
        if (matchShortYear) {
            const dd = matchShortYear[1].padStart(2, '0');
            const mm = matchShortYear[2].padStart(2, '0');
            return `${dd}-${mm}-20${matchShortYear[3]}`;
        }

        // 3. Try parsing Google Date string Date(y, m, d)
        if (val.startsWith('Date(')) {
            let dateObj = parseGoogleDateString(val);
            if (dateObj instanceof Date) {
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                return `${dd}-${mm}-${dateObj.getFullYear()}`;
            }
        }
        
        // 4. Try parsing fallback if this cell was just a name or text
        if (fallbackCell) {
            return extractDateKey(fallbackCell);
        }
        
        return null;
    };

    const ensureDailyEntry = (u, dateKey) => {
        if (!dateKey) return null;
        if (!u.dailyLog[dateKey]) {
            u.dailyLog[dateKey] = {
                invoices: 0,
                amount: 0,
                disputes: 0,
                returns: 0,
                platforms: {
                    amz: { invoices: 0, sale: 0, purchase: 0, saleQty: 0, purchaseQty: 0, returns: 0, returnAmt: 0 },
                    ajio: { invoices: 0, sale: 0, purchase: 0, saleQty: 0, purchaseQty: 0, returns: 0, returnAmt: 0 },
                    myn: { invoices: 0, sale: 0, purchase: 0, saleQty: 0, purchaseQty: 0, returns: 0, returnAmt: 0 },
                    fk: { invoices: 0, sale: 0, purchase: 0, saleQty: 0, purchaseQty: 0, returns: 0, returnAmt: 0 }
                }
            };
        }
        return u.dailyLog[dateKey];
    };

    // Helper to check and accumulate invoice row
    const processInvoice = (opCell, defaultUser, saleVal, purchaseVal, statusVal, platformKey, fallbackDateCell, saleQtyVal, purchaseQtyVal) => {
        let op = extractOperator(opCell?.v) || defaultUser;
        if (op) op = op.trim().toUpperCase();
        if (isValidOperator(op)) {
            const u = ensureUser(op);
            const amt = parseValToNum(saleVal);
            const pAmt = parseValToNum(purchaseVal);
            const sQty = parseValToNum(saleQtyVal) || 1;
            const pQty = parseValToNum(purchaseQtyVal) || 1;
            
            u.salesCount++;
            u.salesAmount += amt;
            u.salesQty += sQty;
            u.purchaseQty += pQty;
            
            u.platforms[platformKey]++;
            u.platformSales[platformKey] += amt;
            u.platformPurchases[platformKey] += pAmt;
            u.platformSalesQty[platformKey] += sQty;
            u.platformPurchasesQty[platformKey] += pQty;
            
            let isDispute = false;
            if (statusVal) {
                const st = String(statusVal).toUpperCase();
                if (st.includes('DISPUTE') || st.includes('HOLD') || st.includes('REJECT')) {
                    u.disputes++;
                    isDispute = true;
                }
            }

            // Daily log tracking (Primary: operator timestamp cell, Fallback: invoice date cell)
            const dk = extractDateKey(opCell, fallbackDateCell);
            const dayEntry = ensureDailyEntry(u, dk);
            if (dayEntry) {
                dayEntry.invoices++;
                dayEntry.amount += amt;
                if (isDispute) dayEntry.disputes++;

                // Track platform breakdown for this day
                const pInfo = dayEntry.platforms[platformKey];
                pInfo.invoices++;
                pInfo.sale += amt;
                pInfo.purchase += pAmt;
                pInfo.saleQty += sQty;
                pInfo.purchaseQty += pQty;
            }
        }
    };

    // 1. Process Sales / Invoices Data
    if (monthlyData && monthlyData.rows) {
        monthlyData.rows.forEach(row => {
            if (!row || !row.c) return;

            // Amazon (Offset 0)
            const amzM = extractMonthYearFromCell(row.c[0], row.c[15]);
            if (amzM && (selectedMonth === 'ALL' || amzM === selectedMonth)) {
                const user = row.c[18] ? String(row.c[18].v || '').trim().toUpperCase() : null;
                processInvoice(row.c[15], user, row.c[6]?.v, row.c[13]?.v, row.c[16]?.v, 'amz', row.c[0], row.c[5]?.v, row.c[12]?.v);
            }
            
            // Ajio (Offset 21)
            const ajioM = extractMonthYearFromCell(row.c[21], row.c[36]);
            if (ajioM && (selectedMonth === 'ALL' || ajioM === selectedMonth)) {
                processInvoice(row.c[36], null, row.c[27]?.v, row.c[34]?.v, row.c[37]?.v, 'ajio', row.c[21], row.c[26]?.v, row.c[33]?.v);
            }
            
            // Myntra (Offset 42)
            const mynM = extractMonthYearFromCell(row.c[42], row.c[57]);
            if (mynM && (selectedMonth === 'ALL' || mynM === selectedMonth)) {
                processInvoice(row.c[57], null, row.c[48]?.v, row.c[55]?.v, row.c[58]?.v, 'myn', row.c[42], row.c[47]?.v, row.c[54]?.v);
            }
            
            // Flipkart (Offset 62)
            const fkM = extractMonthYearFromCell(row.c[62], row.c[77]);
            if (fkM && (selectedMonth === 'ALL' || fkM === selectedMonth)) {
                const user = row.c[80] ? String(row.c[80].v || '').trim().toUpperCase() : null;
                processInvoice(row.c[77], user, row.c[68]?.v, row.c[75]?.v, row.c[78]?.v, 'fk', row.c[62], row.c[67]?.v, row.c[74]?.v);
            }
        });
    }

    // 2. Process Returns Data
    const processReturn = (opCell, amtVal, platformKey, fallbackDateCell) => {
        let op = extractOperator(opCell?.v);
        if (op) op = op.trim().toUpperCase();
        if (isValidOperator(op)) {
            const u = ensureUser(op);
            const amt = parseValToNum(amtVal);
            u.returnCount++;
            u.returnAmount += amt;
            u.platforms[platformKey]++;
            u.platformReturnsCount[platformKey]++;
            u.platformReturnsAmount[platformKey] += amt;

            const dk = extractDateKey(opCell, fallbackDateCell);
            const dayEntry = ensureDailyEntry(u, dk);
            if (dayEntry) {
                dayEntry.returns++;

                // Track platform breakdown for this day
                const pInfo = dayEntry.platforms[platformKey];
                pInfo.returns++;
                pInfo.returnAmt += amt;
            }
        }
    };

    if (monthlyReturnData && monthlyReturnData.rows) {
        monthlyReturnData.rows.forEach(row => {
            if (!row || !row.c) return;
            
            // Amazon CN
            if (extractMonthYearFromCell(row.c[0], row.c[9]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[0], row.c[9]) === selectedMonth)) {
                processReturn(row.c[9], row.c[7]?.v, 'amz', row.c[0]);
            }
            // Amazon DN
            if (extractMonthYearFromCell(row.c[13], row.c[22]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[13], row.c[22]) === selectedMonth)) {
                processReturn(row.c[22], row.c[20]?.v, 'amz', row.c[13]);
            }
            // Ajio CN
            if (extractMonthYearFromCell(row.c[26], row.c[35]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[26], row.c[35]) === selectedMonth)) {
                processReturn(row.c[35], row.c[33]?.v, 'ajio', row.c[26]);
            }
            // Ajio DN
            if (extractMonthYearFromCell(row.c[39], row.c[48]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[39], row.c[48]) === selectedMonth)) {
                processReturn(row.c[48], row.c[46]?.v, 'ajio', row.c[39]);
            }
            // Myntra CN
            if (extractMonthYearFromCell(row.c[52], row.c[61]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[52], row.c[61]) === selectedMonth)) {
                processReturn(row.c[61], row.c[59]?.v, 'myn', row.c[52]);
            }
            // Myntra DN
            if (extractMonthYearFromCell(row.c[55], row.c[74]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[55], row.c[74]) === selectedMonth)) {
                processReturn(row.c[74], row.c[72]?.v, 'myn', row.c[55]);
            }
            // Flipkart CN
            if (extractMonthYearFromCell(row.c[78], row.c[87]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[78], row.c[87]) === selectedMonth)) {
                processReturn(row.c[87], row.c[85]?.v, 'fk', row.c[78]);
            }
            // Flipkart DN
            if (extractMonthYearFromCell(row.c[91], row.c[100]) && (selectedMonth === 'ALL' || extractMonthYearFromCell(row.c[91], row.c[100]) === selectedMonth)) {
                processReturn(row.c[100], row.c[98]?.v, 'fk', row.c[91]);
            }
        });
    }

    // Save selected month to state so we know it on re-sort
    state.selectedUserMonth = selectedMonth || 'ALL';

    // 3. Compile list, sort, and rank
    const operatorList = Object.values(users);
    
    // First calculate base metrics for sorting
    operatorList.forEach(u => {
        u.disputeRate = u.salesCount > 0 ? parseFloat(((u.disputes / u.salesCount) * 100).toFixed(1)) : 0;
        u.accuracyRate = 100 - u.disputeRate;
        u.avgValue = u.salesCount > 0 ? u.salesAmount / u.salesCount : 0;
    });

    const sortKey = document.getElementById('leaderboard-sort-select')?.value || 'salesAmount';
    if (sortKey === 'salesAmount') {
        operatorList.sort((a, b) => b.salesAmount - a.salesAmount);
    } else if (sortKey === 'salesCount') {
        operatorList.sort((a, b) => b.salesCount - a.salesCount);
    } else if (sortKey === 'accuracy') {
        operatorList.sort((a, b) => b.accuracyRate - a.accuracyRate || b.salesAmount - a.salesAmount);
    } else if (sortKey === 'returnCount') {
        operatorList.sort((a, b) => b.returnCount - a.returnCount || b.salesAmount - a.salesAmount);
    }

    let totalVolumeCount = 0;
    let avgDisputeRateSum = 0;
    
    operatorList.forEach((u, index) => {
        u.rank = index + 1;
        totalVolumeCount += (u.salesCount + u.returnCount);
        avgDisputeRateSum += u.disputeRate;

        // Marketplace Specialty Badge
        const totalPlatformTx = u.platforms.amz + u.platforms.ajio + u.platforms.myn + u.platforms.fk;
        const platformNames = { amz: 'Amazon', ajio: 'Ajio', myn: 'Myntra', fk: 'Flipkart' };
        const platformColors = { amz: '#ff9900', ajio: '#10b981', myn: '#f43f5e', fk: '#0083ca' };
        let maxPlatform = 'amz';
        let maxPlatformCount = 0;
        for (const pk of ['amz', 'ajio', 'myn', 'fk']) {
            if (u.platforms[pk] > maxPlatformCount) {
                maxPlatformCount = u.platforms[pk];
                maxPlatform = pk;
            }
        }
        const dominanceRatio = totalPlatformTx > 0 ? maxPlatformCount / totalPlatformTx : 0;
        if (dominanceRatio > 0.6) {
            u.specialty = `${platformNames[maxPlatform]} Pro`;
            u.specialtyColor = platformColors[maxPlatform];
        } else {
            u.specialty = 'Generalist';
            u.specialtyColor = '#8b5cf6';
        }

        // Ratings
        if (u.disputeRate <= 2) {
            u.grade = 'A';
            u.badge = '🏆 Gold Star';
            u.badgeColor = '#eab308'; // Gold
        } else if (u.disputeRate <= 5) {
            u.grade = 'B';
            u.badge = '⭐ Silver Star';
            u.badgeColor = '#94a3b8'; // Silver
        } else {
            u.grade = 'C';
            u.badge = '⚠️ Risk Alert';
            u.badgeColor = '#ef4444'; // Red
        }
    });

    const avgAccuracyRate = operatorList.length > 0 ? (100 - (avgDisputeRateSum / operatorList.length)).toFixed(1) + "%" : "100%";

    // 4. Update KPI Cards
    document.getElementById('user-kpi-active-users').textContent = operatorList.length;
    document.getElementById('user-kpi-top-operator').textContent = operatorList.length > 0 ? operatorList[0].name : 'N/A';
    document.getElementById('user-kpi-total-volume').textContent = totalVolumeCount.toLocaleString();
    document.getElementById('user-kpi-avg-accuracy').textContent = avgAccuracyRate;

    // 5. Populate Leaderboard Table
    const tbody = document.getElementById('user-leaderboard-tbody');
    tbody.innerHTML = '';

    if (operatorList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--text-muted);">No operator data found for this month filter.</td></tr>';
    } else {
        operatorList.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.style.transition = 'background-color 0.2s';
            tr.style.cursor = 'pointer';
            tr.addEventListener('mouseenter', () => tr.style.backgroundColor = 'rgba(99,102,241,0.06)');
            tr.addEventListener('mouseleave', () => {
                if (!tr.classList.contains('active-user-row')) tr.style.backgroundColor = '';
            });
            tr.addEventListener('click', () => {
                // Remove previous active highlight
                document.querySelectorAll('#user-leaderboard-tbody tr.active-user-row').forEach(r => {
                    r.classList.remove('active-user-row');
                    r.style.backgroundColor = '';
                });
                tr.classList.add('active-user-row');
                tr.style.backgroundColor = 'rgba(99,102,241,0.1)';
                showOperatorDailyLog(u);
            });

            // Compute tooltip descriptions
            let specialtyDesc = '';
            if (u.specialty === 'Generalist') {
                specialtyDesc = 'Processes balanced volume across all marketplaces';
            } else {
                specialtyDesc = `Processes ${u.specialty.replace(' Pro', '')} invoices predominantly (>60% of total)`;
            }

            let gradeDesc = '';
            if (u.badge.includes('Gold')) {
                gradeDesc = 'Gold Star: High accuracy rate (Disputes <= 2%)';
            } else if (u.badge.includes('Silver')) {
                gradeDesc = 'Silver Star: Acceptable accuracy rate (Disputes 2.1% - 5%)';
            } else {
                gradeDesc = 'Risk Alert: Low accuracy rate (Disputes > 5%)';
            }

            tr.innerHTML = `
                <td style="padding: 12px; text-align: center; font-weight: 700; color: ${u.rank === 1 ? '#eab308' : u.rank === 2 ? '#94a3b8' : u.rank === 3 ? '#cd7f32' : 'var(--text-color)'};">${u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank-1] : u.rank}</td>
                <td style="padding: 12px; font-weight: 600; color: var(--text-title);">${u.name}</td>
                <td style="padding: 12px; text-align: right; font-weight: 700; color: #10b981;">₹${u.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 12px; text-align: center; color: var(--text-color);">${u.salesCount}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #06b6d4;">₹${u.avgValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 12px; text-align: center; color: var(--text-muted);"><span style="font-weight: 600; color: ${u.disputes > 0 ? '#ef4444' : '#10b981'};">${u.disputes}</span> <span style="font-size: 11px;">(${u.disputeRate}%)</span></td>
                <td style="padding: 12px; text-align: center;"><span title="${specialtyDesc}" style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid ${u.specialtyColor}40; color: ${u.specialtyColor}; background: ${u.specialtyColor}15; cursor: help;">${u.specialty}</span></td>
                <td style="padding: 12px; text-align: center;"><span title="${gradeDesc}" style="display: inline-block; padding: 4px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; background-color: rgba(255,255,255,0.05); color: ${u.badgeColor}; cursor: help;">${u.badge}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Populate Compare Dropdowns
    const op1Select = document.getElementById('compare-op1-select');
    const op2Select = document.getElementById('compare-op2-select');
    if (op1Select && op2Select) {
        const prev1 = op1Select.value;
        const prev2 = op2Select.value;

        op1Select.innerHTML = '';
        op2Select.innerHTML = '';

        operatorList.forEach((o, i) => {
            const opt1 = document.createElement('option');
            opt1.value = o.name;
            opt1.textContent = o.name;
            op1Select.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = o.name;
            opt2.textContent = o.name;
            op2Select.appendChild(opt2);
        });

        // Restore selection or pick defaults
        if (prev1 && operatorList.some(o => o.name === prev1)) {
            op1Select.value = prev1;
        } else if (operatorList.length > 0) {
            op1Select.value = operatorList[0].name;
        }

        if (prev2 && operatorList.some(o => o.name === prev2)) {
            op2Select.value = prev2;
        } else if (operatorList.length > 1) {
            op2Select.value = operatorList[1].name;
        }
    }

    // Wire compare action
    const compareBtn = document.getElementById('btn-compare-operators');
    if (compareBtn && !compareBtn.dataset.wired) {
        compareBtn.dataset.wired = 'true';
        compareBtn.onclick = () => {
            const opName1 = document.getElementById('compare-op1-select')?.value;
            const opName2 = document.getElementById('compare-op2-select')?.value;
            if (!opName1 || !opName2) return;

            const u1 = operatorList.find(o => o.name === opName1);
            const u2 = operatorList.find(o => o.name === opName2);
            if (!u1 || !u2) return;

            const resultsContainer = document.getElementById('compare-results-container');
            if (resultsContainer) resultsContainer.classList.remove('hidden');

            const makeCompareCard = (u, isWinnerMap) => {
                return `
                    <div style="text-align: center; margin-bottom: 12px;">
                        <h4 style="font-size: 16px; font-weight: 700; color: var(--text-title); margin: 0 0 4px 0;">${u.name}</h4>
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${u.specialtyColor}15; color: ${u.specialtyColor};">${u.specialty}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: var(--text-muted);">Sales Processed:</span>
                            <strong style="color: #10b981; font-weight: 700;">₹${Math.round(u.salesAmount).toLocaleString()} ${isWinnerMap.salesAmount ? '🏆' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: var(--text-muted);">Invoices Processed:</span>
                            <strong style="color: var(--text-title); font-weight: 700;">${u.salesCount.toLocaleString()} ${isWinnerMap.salesCount ? '🏆' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: var(--text-muted);">Average Invoice Value:</span>
                            <strong style="color: #06b6d4; font-weight: 700;">₹${Math.round(u.avgValue).toLocaleString()} ${isWinnerMap.avgValue ? '🏆' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: var(--text-muted);">Returns Handled:</span>
                            <strong style="color: var(--text-title); font-weight: 700;">${u.returnCount.toLocaleString()} ${isWinnerMap.returnCount ? '🏆' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: var(--text-muted);">Disputes Rate:</span>
                            <strong style="color: ${u.disputeRate > 5 ? '#ef4444' : '#10b981'}; font-weight: 700;">${u.disputes} (${u.disputeRate}%) ${isWinnerMap.disputeRate ? '🏆' : ''}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span style="color: var(--text-muted);">Accuracy Rate:</span>
                            <strong style="color: ${u.accuracyRate < 95 ? '#ef4444' : '#10b981'}; font-weight: 700;">${u.accuracyRate}% ${isWinnerMap.accuracyRate ? '🏆' : ''}</strong>
                        </div>
                    </div>
                `;
            };

            const isWinner1 = {
                salesAmount: u1.salesAmount > u2.salesAmount,
                salesCount: u1.salesCount > u2.salesCount,
                avgValue: u1.avgValue > u2.avgValue,
                returnCount: u1.returnCount > u2.returnCount,
                disputeRate: u1.disputeRate < u2.disputeRate,
                accuracyRate: u1.accuracyRate > u2.accuracyRate
            };

            const isWinner2 = {
                salesAmount: u2.salesAmount > u1.salesAmount,
                salesCount: u2.salesCount > u1.salesCount,
                avgValue: u2.avgValue > u1.avgValue,
                returnCount: u2.returnCount > u1.returnCount,
                disputeRate: u2.disputeRate < u1.disputeRate,
                accuracyRate: u2.accuracyRate > u1.accuracyRate
            };

            document.getElementById('compare-card-op1').innerHTML = makeCompareCard(u1, isWinner1);
            document.getElementById('compare-card-op2').innerHTML = makeCompareCard(u2, isWinner2);
        };
    }

    // Hide user details panel when month filter changes
    const detailsPanel = document.getElementById('user-details-panel');
    if (detailsPanel) detailsPanel.classList.add('hidden');

    // 6. Draw ApexCharts
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const tooltipTheme = isDark ? 'dark' : 'light';

    // Chart 1: Donut (Workload Share)
    const opNames = operatorList.map(o => o.name);
    const opSalesCount = operatorList.map(o => o.salesCount);

    const volumeShareOptions = {
        chart: { type: 'donut', height: 280, width: '100%', background: 'transparent', fontFamily: 'Inter, sans-serif' },
        labels: opNames,
        series: opSalesCount,
        colors: ['#10b981', '#6366f1', '#f43f5e', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'],
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
        plotOptions: { pie: { donut: { size: '60%' } } }
    };
    renderOrUpdateChart('user-chart-volume-share', 'userVolumeShare', volumeShareOptions);

    // Chart 2: Stacked Horizontal Bar (Platform Share)
    const opAmz = operatorList.map(o => o.platforms.amz);
    const opAjio = operatorList.map(o => o.platforms.ajio);
    const opMyn = operatorList.map(o => o.platforms.myn);
    const opFk = operatorList.map(o => o.platforms.fk);

    const platformShareOptions = {
        chart: { type: 'bar', height: 280, width: '100%', stacked: true, toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
        colors: ['#ff9900', '#10b981', '#f43f5e', '#0083ca'], // Amazon Orange, Ajio Green, Myntra Pink, Flipkart Blue
        grid: { borderColor: gridColor },
        plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4 } },
        xaxis: { categories: opNames, labels: { style: { colors: textColor } } },
        yaxis: { labels: { style: { colors: textColor } } },
        legend: { position: 'bottom', labels: { colors: textColor } },
        tooltip: { theme: tooltipTheme },
        series: [
            { name: 'Amazon', data: opAmz },
            { name: 'Ajio', data: opAjio },
            { name: 'Myntra', data: opMyn },
            { name: 'Flipkart', data: opFk }
        ]
    };
    renderOrUpdateChart('user-chart-platform-share', 'userPlatformShare', platformShareOptions);

    // 5b. Compute and Draw Team Daily Productivity Trend
    const teamDaily = {};
    operatorList.forEach(u => {
        if (u.dailyLog) {
            Object.entries(u.dailyLog).forEach(([dateKey, dayData]) => {
                if (!teamDaily[dateKey]) {
                    teamDaily[dateKey] = 0;
                }
                teamDaily[dateKey] += dayData.invoices;
            });
        }
    });

    // Sort dates
    const teamDailySorted = Object.entries(teamDaily)
        .map(([dateKey, invoices]) => {
            const [d, m, y] = dateKey.split('-');
            return {
                dateKey,
                invoices,
                sortDate: new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
            };
        })
        .sort((a, b) => a.sortDate - b.sortDate);

    const teamDailyDates = teamDailySorted.map(item => item.dateKey);
    const teamDailyInvoices = teamDailySorted.map(item => item.invoices);

    const teamTrendOptions = {
        chart: { 
            type: 'area', 
            height: 280, 
            width: '100%', 
            toolbar: { show: false }, 
            background: 'transparent', 
            fontFamily: 'Inter, sans-serif' 
        },
        colors: ['#6366f1'],
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        grid: { borderColor: gridColor },
        xaxis: { 
            categories: teamDailyDates, 
            labels: { style: { colors: textColor } } 
        },
        yaxis: { 
            labels: { style: { colors: textColor } }
        },
        tooltip: { theme: tooltipTheme },
        dataLabels: { enabled: false },
        series: [
            { name: 'Total Team Invoices', data: teamDailyInvoices }
        ]
    };
    renderOrUpdateChart('user-chart-team-productivity-trend', 'teamDailyTrend', teamTrendOptions);

    // Redraw Lucide Icons in KPI cards
    if (window.lucide) {
        lucide.createIcons();
    }

    // Close button for user details panel
    const closeBtn = document.getElementById('btn-close-user-details');
    if (closeBtn) {
        closeBtn.onclick = () => {
            const dp = document.getElementById('user-details-panel');
            if (dp) dp.classList.add('hidden');
            document.querySelectorAll('#user-leaderboard-tbody tr.active-user-row').forEach(r => {
                r.classList.remove('active-user-row');
                r.style.backgroundColor = '';
            });
        };
    }
}

/**
 * Shows the daily activity log panel for the selected operator
 */
function showOperatorDailyLog(userData) {
    const panel = document.getElementById('user-details-panel');
    if (!panel) return;
    panel.classList.remove('hidden');

    // Set operator name
    document.getElementById('user-details-selected-name').textContent = userData.name;

    // Reset date filter input
    const dateFilterInput = document.getElementById('user-details-date-filter');
    const clearFilterBtn = document.getElementById('btn-clear-date-filter');
    if (dateFilterInput) dateFilterInput.value = '';
    if (clearFilterBtn) clearFilterBtn.style.display = 'none';

    // Build sorted daily entries
    const dailyEntries = Object.entries(userData.dailyLog)
        .map(([dateKey, data]) => ({
            dateKey,
            ...data,
            // Parse for sorting: DD-MM-YYYY -> Date
            sortDate: (() => {
                const [d, m, y] = dateKey.split('-');
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            })()
        }))
        .sort((a, b) => a.sortDate - b.sortDate);

    // Compute KPIs
    const totalDays = dailyEntries.length || 1;
    const totalInvoices = dailyEntries.reduce((s, e) => s + e.invoices, 0);
    const dailyAvg = (totalInvoices / totalDays).toFixed(1);
    const maxDay = dailyEntries.reduce((m, e) => Math.max(m, e.invoices), 0);
    const avgVal = userData.salesCount > 0 ? '₹' + Math.round(userData.salesAmount / userData.salesCount).toLocaleString() : '₹0';
    const accuracy = userData.accuracyRate !== undefined ? userData.accuracyRate.toFixed(1) + '%' : '100%';

    document.getElementById('user-detail-kpi-daily-avg').textContent = dailyAvg;
    document.getElementById('user-detail-kpi-max-day').textContent = maxDay;
    document.getElementById('user-detail-kpi-avg-val').textContent = avgVal;
    document.getElementById('user-detail-kpi-accuracy').textContent = accuracy;

    // Set platform breakdown details (Transactions count, Sales total, Purchases total, Returns total & count)
    const setPlatformBreakdown = (key) => {
        const count = userData.platforms[key] || 0;
        const sale = userData.platformSales[key] || 0;
        const purchase = userData.platformPurchases[key] || 0;
        const retCount = userData.platformReturnsCount[key] || 0;
        const retAmt = userData.platformReturnsAmount[key] || 0;
        const saleQty = userData.platformSalesQty[key] || 0;
        const purchaseQty = userData.platformPurchasesQty[key] || 0;
        
        document.getElementById(`user-platform-count-${key}`).textContent = `${count} Transaction${count !== 1 ? 's' : ''}`;
        document.getElementById(`user-platform-sale-${key}`).textContent = '₹' + Math.round(sale).toLocaleString() + ` (${saleQty} Qty)`;
        document.getElementById(`user-platform-purchase-${key}`).textContent = '₹' + Math.round(purchase).toLocaleString() + ` (${purchaseQty} Qty)`;
        document.getElementById(`user-platform-returns-${key}`).textContent = `₹${Math.round(retAmt).toLocaleString()} (${retCount})`;
    };
    
    ['amz', 'ajio', 'myn', 'fk'].forEach(setPlatformBreakdown);

    // Render function for daily log table & trend chart
    const renderDailyLogData = (entriesToRender) => {
        // Populate daily log table
        const tbody = document.getElementById('user-details-daily-tbody');
        tbody.innerHTML = '';
        if (entriesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted);">No daily data matching filter.</td></tr>';
        } else {
            entriesToRender.forEach(entry => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                tr.style.cursor = 'pointer';
                tr.className = 'daily-log-row';
                tr.style.transition = 'background-color 0.15s';
                
                // Highlight high-output days
                const isHighDay = entry.invoices >= maxDay * 0.8 && maxDay > 0;
                tr.innerHTML = `
                    <td style="padding: 10px; font-size: 13px; color: var(--text-color); display: flex; align-items: center; gap: 6px; user-select: none;">
                        <i data-lucide="chevron-right" class="row-arrow" style="width: 14px; height: 14px; transition: transform 0.2s; color: var(--text-muted);"></i>
                        ${entry.dateKey}
                    </td>
                    <td style="padding: 10px; text-align: center; font-weight: 700; color: ${isHighDay ? '#10b981' : 'var(--text-title)'};">${entry.invoices.toLocaleString()}${isHighDay ? ' 🔥' : ''}</td>
                    <td style="padding: 10px; text-align: right; font-size: 13px; color: var(--text-color);">₹${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td style="padding: 10px; text-align: center; font-size: 13px; color: ${entry.disputes > 0 ? '#ef4444' : 'var(--text-muted)'};">${entry.disputes}</td>
                `;
                tbody.appendChild(tr);

                // Expandable sub-row details containing platform specific breakdown
                const detailTr = document.createElement('tr');
                detailTr.className = 'daily-detail-row hidden';
                detailTr.style.background = 'rgba(0, 0, 0, 0.12)';
                detailTr.style.borderBottom = '1px solid var(--border-color)';
                
                const platformLabels = { amz: 'Amazon', ajio: 'Ajio', myn: 'Myntra', fk: 'Flipkart' };
                const platformColors = { amz: '#ff9900', ajio: '#10b981', myn: '#f43f5e', fk: '#0083ca' };
                
                let detailCardsHtml = '';
                for (const pk of ['amz', 'ajio', 'myn', 'fk']) {
                    const info = entry.platforms[pk];
                    if (info.invoices > 0 || info.returns > 0) {
                        detailCardsHtml += `
                            <div style="flex: 1; min-width: 155px; padding: 8px 12px; background: rgba(255, 255, 255, 0.015); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                                <span style="font-size: 11px; font-weight: 700; color: ${platformColors[pk]}; border-bottom: 1px solid ${platformColors[pk]}25; padding-bottom: 4px; display: block; margin-bottom: 6px;">${platformLabels[pk]}</span>
                                <div style="font-size: 11px; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px;">
                                    <div style="display: flex; justify-content: space-between; gap: 8px;"><span>Invoices:</span><strong style="color: var(--text-color);">${info.invoices}</strong></div>
                                    <div style="display: flex; justify-content: space-between; gap: 8px;"><span>Sale:</span><strong style="color: #10b981;">₹${Math.round(info.sale).toLocaleString()} (${info.saleQty} Qty)</strong></div>
                                    <div style="display: flex; justify-content: space-between; gap: 8px;"><span>Purchase:</span><strong style="color: #06b6d4;">₹${Math.round(info.purchase).toLocaleString()} (${info.purchaseQty} Qty)</strong></div>
                                    ${info.returns > 0 ? `<div style="display: flex; justify-content: space-between; gap: 8px;"><span>CN/DN:</span><strong style="color: #ef4444;">₹${Math.round(info.returnAmt).toLocaleString()} (${info.returns})</strong></div>` : ''}
                                </div>
                            </div>
                        `;
                    }
                }

                detailTr.innerHTML = `
                    <td colspan="4" style="padding: 10px 14px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${detailCardsHtml || '<div style="font-size: 11px; color: var(--text-muted);">No platform details recorded for this date.</div>'}
                        </div>
                    </td>
                `;
                tbody.appendChild(detailTr);

                // Row toggle click handler
                tr.onclick = () => {
                    const wasHidden = detailTr.classList.contains('hidden');
                    
                    // Close other details to keep layout clean
                    tbody.querySelectorAll('.daily-detail-row').forEach(r => r.classList.add('hidden'));
                    tbody.querySelectorAll('.daily-log-row i.row-arrow').forEach(a => a.style.transform = 'rotate(0deg)');
                    tbody.querySelectorAll('.daily-log-row').forEach(r => r.style.backgroundColor = '');

                    if (wasHidden) {
                        detailTr.classList.remove('hidden');
                        tr.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                        const arrow = tr.querySelector('i.row-arrow');
                        if (arrow) arrow.style.transform = 'rotate(90deg)';
                    }
                };
            });
            // Re-render arrow icons
            if (window.lucide) lucide.createIcons();
        }

        // Draw daily trend line chart
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const tooltipTheme = isDark ? 'dark' : 'light';

        const categories = entriesToRender.map(e => e.dateKey);
        const invoiceSeries = entriesToRender.map(e => e.invoices);
        const amountSeries = entriesToRender.map(e => Math.round(e.amount));

        const trendOptions = {
            chart: {
                type: 'area',
                height: 250,
                width: '100%',
                background: 'transparent',
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            dataLabels: {
                enabled: false // Disable data label boxes on the chart lines to avoid clutter
            },
            colors: ['#6366f1', '#10b981'],
            stroke: { width: [3, 2], curve: 'smooth' },
            markers: {
                size: entriesToRender.length <= 3 ? 6 : 4,
                strokeWidth: 2,
                hover: { size: 7 }
            },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] }
            },
            grid: { borderColor: gridColor, strokeDashArray: 3 },
            xaxis: {
                categories: categories,
                labels: {
                    style: { colors: textColor, fontSize: '10px' },
                    rotate: -45,
                    rotateAlways: categories.length > 8
                },
                axisBorder: { show: false }
            },
            yaxis: [
                {
                    min: 0,
                    forceNiceScale: true,
                    title: { text: 'Invoices', style: { color: textColor, fontSize: '11px' } },
                    labels: { style: { colors: textColor }, formatter: (v) => Math.round(v).toLocaleString() }
                },
                {
                    min: 0,
                    opposite: true,
                    forceNiceScale: true,
                    title: { text: 'Amount (₹)', style: { color: textColor, fontSize: '11px' } },
                    labels: { style: { colors: textColor }, formatter: (v) => '₹' + formatNumberCompact(v) }
                }
            ],
            legend: { position: 'top', labels: { colors: textColor } },
            tooltip: {
                theme: tooltipTheme,
                y: {
                    formatter: function(val, opts) {
                        if (opts.seriesIndex === 1) return '₹' + val.toLocaleString();
                        return val + ' invoices';
                    }
                }
            },
            series: [
                { name: 'Invoices', type: 'area', data: invoiceSeries },
                { name: 'Amount', type: 'line', data: amountSeries }
            ]
        };

        renderOrUpdateChart('user-chart-daily-trend', 'userDailyTrend', trendOptions);
    };

    // Render initial data
    renderDailyLogData(dailyEntries);

    // Wire date picker change event
    if (dateFilterInput) {
        dateFilterInput.onchange = (e) => {
            const val = e.target.value; // YYYY-MM-DD
            if (val) {
                const [y, m, d] = val.split('-');
                const targetKey = `${d}-${m}-${y}`;
                const filtered = dailyEntries.filter(entry => entry.dateKey === targetKey);
                renderDailyLogData(filtered);
                if (clearFilterBtn) clearFilterBtn.style.display = 'inline-block';
            } else {
                renderDailyLogData(dailyEntries);
                if (clearFilterBtn) clearFilterBtn.style.display = 'none';
            }
        };

        // Browser handles native date input click to open calendar.
        // The wrapper div onclick in HTML also calls showPicker() if supported.
    }

    // Wire clear filter button
    if (clearFilterBtn) {
        clearFilterBtn.onclick = () => {
            if (dateFilterInput) dateFilterInput.value = '';
            clearFilterBtn.style.display = 'none';
            renderDailyLogData(dailyEntries);
        };
    }

    // Scroll to details panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Redraw Lucide icons
    if (window.lucide) lucide.createIcons();

    // Wire Export Scorecard button
    const exportBtn = document.getElementById('btn-export-scorecard');
    if (exportBtn) {
        exportBtn.onclick = () => exportOperatorScorecard(userData, dailyEntries);
    }
}

/**
 * Exports a beautifully formatted operator scorecard as a printable HTML page
 */
function exportOperatorScorecard(userData, dailyEntries) {
    const selectedMonth = document.getElementById('user-month-filter')?.value || 'ALL';
    const periodLabel = selectedMonth === 'ALL' ? 'All Months' : selectedMonth;
    const now = new Date();
    const generatedDate = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    // Compute stats
    const totalDays = dailyEntries.length || 1;
    const totalInvoices = dailyEntries.reduce((s, e) => s + e.invoices, 0);
    const totalAmount = dailyEntries.reduce((s, e) => s + e.amount, 0);
    const totalDisputes = dailyEntries.reduce((s, e) => s + e.disputes, 0);
    const dailyAvg = (totalInvoices / totalDays).toFixed(1);
    const maxDay = dailyEntries.reduce((m, e) => Math.max(m, e.invoices), 0);
    const avgValue = userData.salesCount > 0 ? Math.round(userData.salesAmount / userData.salesCount) : 0;
    const accuracy = userData.accuracyRate !== undefined ? userData.accuracyRate.toFixed(1) : '100.0';
    const totalPurchases = Object.values(userData.platformPurchases).reduce((sum, val) => sum + val, 0);

    // Platform breakdown
    const platformLabels = { amz: 'Amazon', ajio: 'Ajio', myn: 'Myntra', fk: 'Flipkart' };
    const platformColors = { amz: '#ff9900', ajio: '#10b981', myn: '#f43f5e', fk: '#0083ca' };
    const totalPlatformTx = userData.platforms.amz + userData.platforms.ajio + userData.platforms.myn + userData.platforms.fk;

    // Build daily rows HTML
    let dailyRowsHtml = '';
    dailyEntries.forEach((entry, idx) => {
        const bgColor = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        dailyRowsHtml += `
            <tr style="background: ${bgColor};">
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${entry.dateKey}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #1e293b;">${entry.invoices}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">₹${entry.amount.toLocaleString()}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: ${entry.disputes > 0 ? '#ef4444' : '#94a3b8'};">${entry.disputes}</td>
            </tr>
        `;
    });

    // Build platform breakdown
    let platformHtml = '';
    for (const pk of ['amz', 'ajio', 'myn', 'fk']) {
        const count = userData.platforms[pk];
        const sale = userData.platformSales[pk] || 0;
        const purchase = userData.platformPurchases[pk] || 0;
        const retCount = userData.platformReturnsCount[pk] || 0;
        const retAmt = userData.platformReturnsAmount[pk] || 0;
        const pct = totalPlatformTx > 0 ? ((count / totalPlatformTx) * 100).toFixed(1) : '0.0';
        platformHtml += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${platformColors[pk]};"></div>
                    <span style="font-weight: 700; width: 70px; font-size: 13px;">${platformLabels[pk]}</span>
                    <div style="flex: 1; background: #e2e8f0; border-radius: 8px; height: 8px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${platformColors[pk]}; border-radius: 8px;"></div>
                    </div>
                    <span style="font-size: 12px; color: #64748b; font-weight: 600; text-align: right; min-width: 80px;">${count} Tx (${pct}%)</span>
                </div>
                <div style="display: flex; gap: 12px; margin-left: 22px; font-size: 11px; color: #64748b;">
                    <span>Sale: <strong>₹${Math.round(sale).toLocaleString()}</strong></span>
                    <span>Purchase: <strong>₹${Math.round(purchase).toLocaleString()}</strong></span>
                    <span>CN/DN: <strong>₹${Math.round(retAmt).toLocaleString()} (${retCount})</strong></span>
                </div>
            </div>
        `;
    }

    const scorecardHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Scorecard - ${userData.name} | ${periodLabel}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 32px; }
            @media print {
                body { padding: 16px; }
                .no-print { display: none !important; }
                @page { margin: 12mm; size: A4; }
            }
        </style>
    </head>
    <body>
        <div style="max-width: 800px; margin: 0 auto;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #1e293b;">Operator Performance Scorecard</h1>
                    <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Generated on ${generatedDate}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Period</p>
                    <p style="font-size: 16px; font-weight: 700; color: #6366f1;">${periodLabel}</p>
                </div>
            </div>

            <!-- Operator Name & Grade -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #f0f0ff, #f8f8ff); border: 1px solid #e0e0f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
                <div>
                    <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Operator Name</p>
                    <h2 style="font-size: 28px; font-weight: 800; color: #1e293b;">${userData.name}</h2>
                    <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Rank #${userData.rank} • ${userData.specialty} • Grade ${userData.grade}</p>
                </div>
                <div style="text-align: center; padding: 12px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                    <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Accuracy</p>
                    <p style="font-size: 32px; font-weight: 800; color: ${parseFloat(accuracy) >= 95 ? '#10b981' : parseFloat(accuracy) >= 90 ? '#f59e0b' : '#ef4444'};">${accuracy}%</p>
                </div>
            </div>

            <!-- KPI Grid -->
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
                    <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Total Invoices</p>
                    <p style="font-size: 20px; font-weight: 800; color: #1e293b; margin-top: 4px;">${userData.salesCount.toLocaleString()}</p>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
                    <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Sales Amount</p>
                    <p style="font-size: 20px; font-weight: 800; color: #10b981; margin-top: 4px;">₹${userData.salesAmount.toLocaleString()}</p>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
                    <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Purchase Amount</p>
                    <p style="font-size: 20px; font-weight: 800; color: #3b82f6; margin-top: 4px;">₹${totalPurchases.toLocaleString()}</p>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
                    <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Avg/Invoice</p>
                    <p style="font-size: 20px; font-weight: 800; color: #06b6d4; margin-top: 4px;">₹${avgValue.toLocaleString()}</p>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 8px; text-align: center;">
                    <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Daily Avg</p>
                    <p style="font-size: 20px; font-weight: 800; color: #6366f1; margin-top: 4px;">${dailyAvg}</p>
                </div>
            </div>

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                    <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">📊 Performance Summary</h3>
                    <table style="width: 100%; font-size: 13px;">
                        <tr><td style="padding: 4px 0; color: #64748b;">Active Days</td><td style="text-align: right; font-weight: 600;">${totalDays}</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b;">Max Daily Output</td><td style="text-align: right; font-weight: 600;">${maxDay} invoices</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b;">Returns Processed</td><td style="text-align: right; font-weight: 600;">${userData.returnCount}</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b;">Disputes</td><td style="text-align: right; font-weight: 600; color: ${userData.disputes > 0 ? '#ef4444' : '#10b981'};">${userData.disputes} (${userData.disputeRate}%)</td></tr>
                    </table>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                    <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">🏢 Platform Breakdown</h3>
                    ${platformHtml}
                </div>
            </div>

            <!-- Daily Log Table -->
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">📅 Daily Activity Log</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Date</th>
                            <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Invoices</th>
                            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Amount</th>
                            <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Disputes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyRowsHtml || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8;">No daily data available</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f1f5f9; font-weight: 700;">
                            <td style="padding: 10px 12px; border-top: 2px solid #e2e8f0;">TOTAL</td>
                            <td style="padding: 10px 12px; text-align: center; border-top: 2px solid #e2e8f0;">${totalInvoices}</td>
                            <td style="padding: 10px 12px; text-align: right; border-top: 2px solid #e2e8f0;">₹${totalAmount.toLocaleString()}</td>
                            <td style="padding: 10px 12px; text-align: center; border-top: 2px solid #e2e8f0; color: ${totalDisputes > 0 ? '#ef4444' : '#10b981'};">${totalDisputes}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
                <p>Auto-generated by Invoice Data Center • ${generatedDate}</p>
            </div>

            <!-- Print Button (hidden on print) -->
            <div class="no-print" style="text-align: center; margin-top: 24px;">
                <button onclick="window.print()" style="padding: 10px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
                    🖨️ Print / Save as PDF
                </button>
            </div>
        </div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(scorecardHtml);
    printWindow.document.close();
}

