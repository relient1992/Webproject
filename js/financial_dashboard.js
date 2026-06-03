window.initFinancialDashboard = initFinancialDashboard;

let financialData = [];
let filteredData = [];
let charts = {};
let userAllowedEntity = null; // Tracks the user's role

const FIN_HEADERS = [
    "Proj_ID", "Mapping", "Project", "LOB", "Customer", "PLM_Head", "PLM", "Project_Manager", 
    "Entity", "Entity_Region", "Region", "Location", "CPTMapping", "SubProj_ID", "Project_Code", 
    "Site", "Dated", "VM_ID", "Header1", "Header2", "Header3", "Header4", "Header5", 
    "Cost", "Cost_Tech", "SortOrder1", "SortOrder2", "UserView"
];

// 1. Shows the Gatekeeper instead of loading the data
function initFinancialDashboard() {
    console.log("🔒 [Gatekeeper] Verifying Access...");
    const gate = document.getElementById('auth-gate-modal');
    if (gate) {
        gate.classList.remove('hidden');
        document.getElementById('gate-password').value = '';
        document.getElementById('gate-error').classList.add('hidden');
    } else {
        executeDashboardFetch(); // Fallback if HTML is missing
    }
}

// 2. Authenticates the Password
window.verifyDashboardAccess = function() {
    const pass = document.getElementById('gate-password').value;
    const errorMsg = document.getElementById('gate-error');

    // --- ASSIGN PASSWORDS HERE ---
    if (pass === 'Health2026!') userAllowedEntity = 'Healthserv';
    else if (pass === 'Source2026!') userAllowedEntity = 'Sourcehov';
    else if (pass === 'Master2026!') userAllowedEntity = 'ALL'; // AVP / Super User
    else {
        errorMsg.classList.remove('hidden');
        return;
    }

    document.getElementById('auth-gate-modal').classList.add('hidden');
    
    // Now that they are verified, actually fetch the data!
    executeDashboardFetch();
};

// 3. The Core Dashboard Fetch Logic
async function executeDashboardFetch() {
    console.log(`🚦 [Financial Dashboard] Initialization started. Role: ${userAllowedEntity}`);

    let loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.className = "fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300";
        loadingScreen.innerHTML = `
            <div class="flex flex-col items-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
                <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-slate-800 dark:text-white font-extrabold text-lg">Loading Database...</p>
                <span class="text-xs text-slate-500 font-medium mt-2">Fetching financial records</span>
            </div>
        `;
        document.body.appendChild(loadingScreen);
    } else {
        loadingScreen.style.display = 'flex';
        loadingScreen.style.opacity = '1';
    }

    const filterPanel = document.getElementById('advanced-filters');
    if (!filterPanel) return;

    try {
        const response = await fetch('financial_fetch_api.php');
        const rawText = await response.text(); 
        
        try {
            const result = JSON.parse(rawText);
            financialData = result.success ? result.data : [];
            
            // ====================================================
            // ROLE-BASED DATA ENFORCEMENT
            // ====================================================
            if (userAllowedEntity !== 'ALL') {
                financialData = financialData.filter(row => {
                    const ent = (row.Entity || row.entity || row.ENTITY || '').trim();
                    // Strip out any data that doesn't match their assigned entity
                    return ent.toLowerCase() === userAllowedEntity.toLowerCase();
                });
            }

            console.log(`✅ Loaded ${financialData.length} authorized rows of data.`);
        } catch (parseError) {
            console.error("❌ JSON Parse Failed. PHP output:", rawText);
            financialData = [];
        }
    } catch (networkError) {
        console.error("❌ Network Error.", networkError);
        financialData = [];
    }

    setTimeout(() => {
        try {
            populateConfigurationFilters(); 
            setDefaultFilters(); 
            initProjectSearch(); 
            applyGlobalFilters(true); 
            populateExportCheckboxes();
        } catch (renderError) {
            console.error("❌ Error rendering the UI:", renderError);
        }
    }, 100);
}

function setDefaultFilters() {
    // 1. Set Mapping Default
    const mappingCbs = document.querySelectorAll('.filter-cb-mapping');
    mappingCbs.forEach(cb => {
        if (cb.value.toUpperCase() === 'OPERATIONAL COST') cb.checked = true;
    });

    // 2. Set Project Default
    const projectCbs = document.querySelectorAll('.filter-cb-project');
    projectCbs.forEach(cb => {
        if (cb.value.toUpperCase() === 'FEDEX') cb.checked = true;
    });

    // 3. Set Date Range Default (Auto-detects the latest 3 Months in DB)
    if (financialData && financialData.length > 0) {
        let maxDate = null;
        
        // Scan for the most recent date in your dataset
        financialData.forEach(row => {
            const dStr = row.Dated || row.dated;
            if (dStr) {
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) {
                    if (!maxDate || d > maxDate) maxDate = d;
                }
            }
        });

        if (maxDate) {
            // Set End Date to the latest month
            const endStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Set Start Date to 2 months prior (giving a 3-month window: e.g., Jan, Feb, Mar)
            const startD = new Date(maxDate);
            startD.setMonth(startD.getMonth() - 2);
            const startStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`;

            const startInput = document.getElementById('config-start-date');
            const endInput = document.getElementById('config-end-date');
            
            if (startInput) startInput.value = startStr;
            if (endInput) endInput.value = endStr;
        }
    }
}

// ----------------------------------------------------
// FILTER & CONFIGURATION LOGIC
// ----------------------------------------------------
function populateConfigurationFilters() {
    const categories = {
        Mapping: new Set(),
        Project: new Set(),
        LOB: new Set(),
        Entity: new Set()
    };

    financialData.forEach(row => {
        const mapping = row.Mapping || row.mapping || row.MAPPING || '';
        const project = row.Project || row.project || row.PROJECT || '';
        const lob = row.LOB || row.lob || '';
        const entity = row.Entity || row.entity || row.ENTITY || '';

        if(mapping.trim() !== '') categories.Mapping.add(mapping.trim());
        if(project.trim() !== '') categories.Project.add(project.trim());
        if(lob.trim() !== '') categories.LOB.add(lob.trim());
        if(entity.trim() !== '') categories.Entity.add(entity.trim());
    });

    Object.keys(categories).forEach(key => {
        const container = document.getElementById(`filter-list-${key.toLowerCase()}`);
        if (!container) return;
        
        container.innerHTML = '';
        const sortedValues = Array.from(categories[key]).sort();
        
        container.innerHTML += `
            <label class="flex items-center gap-2 text-[11px] font-extrabold text-slate-800 dark:text-white cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border-b border-slate-200 dark:border-slate-700 mb-1 pb-2 filter-item">
                <input type="checkbox" onchange="toggleSelectAll(this, '${key.toLowerCase()}')" class="text-blue-600 focus:ring-blue-500 rounded border-slate-300 dark:border-slate-600 bg-transparent">
                <span>SELECT ALL</span>
            </label>
        `;

        if (sortedValues.length === 0) {
            container.innerHTML += '<span class="text-[11px] font-semibold text-slate-400 italic p-2 block mt-2">No data found in DB.</span>';
            return;
        }
        
        sortedValues.forEach(val => {
            // NEW: Added onchange="updateCascadingFilters()" to every checkbox
            container.innerHTML += `
                <label data-cascade-hidden="false" class="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-colors group filter-item">
                    <input type="checkbox" value="${val}" onchange="updateCascadingFilters()" class="filter-cb-${key.toLowerCase()} text-emerald-500 focus:ring-emerald-500 rounded border-slate-300 dark:border-slate-600 bg-transparent">
                    <span class="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">${val}</span>
                </label>
            `;
        });
    });
}

// NEW: The Intelligent Cascading Engine
window.updateCascadingFilters = function() {
    const selMapping = Array.from(document.querySelectorAll('.filter-cb-mapping:checked')).map(cb => cb.value);
    const selProject = Array.from(document.querySelectorAll('.filter-cb-project:checked')).map(cb => cb.value);
    const selLob = Array.from(document.querySelectorAll('.filter-cb-lob:checked')).map(cb => cb.value);
    const selEntity = Array.from(document.querySelectorAll('.filter-cb-entity:checked')).map(cb => cb.value);

    // Determines valid options for a category by looking at the selections in the OTHER 3 categories
    const getValidOptions = (targetCategory) => {
        const valid = new Set();
        financialData.forEach(row => {
            const rMap = (row.Mapping || row.mapping || row.MAPPING || '').trim();
            const rProj = (row.Project || row.project || row.PROJECT || '').trim();
            const rLob = (row.LOB || row.lob || '').trim();
            const rEnt = (row.Entity || row.entity || row.ENTITY || '').trim();

            let pass = true;
            if (targetCategory !== 'mapping' && selMapping.length > 0 && !selMapping.includes(rMap)) pass = false;
            if (targetCategory !== 'project' && selProject.length > 0 && !selProject.includes(rProj)) pass = false;
            if (targetCategory !== 'lob' && selLob.length > 0 && !selLob.includes(rLob)) pass = false;
            if (targetCategory !== 'entity' && selEntity.length > 0 && !selEntity.includes(rEnt)) pass = false;

            if (pass) {
                if (targetCategory === 'mapping') valid.add(rMap);
                if (targetCategory === 'project') valid.add(rProj);
                if (targetCategory === 'lob') valid.add(rLob);
                if (targetCategory === 'entity') valid.add(rEnt);
            }
        });
        return valid;
    };

    const updateListUI = (category, validSet) => {
        const checkboxes = document.querySelectorAll(`.filter-cb-${category}`);
        checkboxes.forEach(cb => {
            const labelElement = cb.closest('label');
            // Always keep checked items visible so users can uncheck them
            if (cb.checked || validSet.has(cb.value)) {
                labelElement.dataset.cascadeHidden = 'false';
                labelElement.style.display = 'flex';
            } else {
                labelElement.dataset.cascadeHidden = 'true';
                labelElement.style.display = 'none'; // Physically hide invalid options
            }
        });
    };

    updateListUI('mapping', getValidOptions('mapping'));
    updateListUI('project', getValidOptions('project'));
    updateListUI('lob', getValidOptions('lob'));
    updateListUI('entity', getValidOptions('entity'));

    // Re-trigger the search filter to ensure the cascading logic doesn't override manual searches
    const searchInput = document.getElementById('search-project');
    if (searchInput && searchInput.value) {
        searchInput.dispatchEvent(new Event('input'));
    }
};

function initProjectSearch() {
    const searchInput = document.getElementById('search-project');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#filter-list-project .filter-item');
        
        items.forEach(item => {
            if (item.textContent.includes('SELECT ALL')) return;
            
            const text = item.textContent.toLowerCase();
            const isCascadeHidden = item.dataset.cascadeHidden === 'true';
            
            // Only toggle visibility if it hasn't already been hidden by the intelligent cascade
            if (!isCascadeHidden) {
                if (text.includes(term)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    });
}

window.clearAllFilters = function() {
    document.querySelectorAll('[class^="filter-cb-"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[onchange^="toggleSelectAll"]').forEach(cb => cb.checked = false);
    
    if (document.getElementById('config-start-date')) document.getElementById('config-start-date').value = '';
    if (document.getElementById('config-end-date')) document.getElementById('config-end-date').value = '';
    
    const searchInput = document.getElementById('search-project');
    if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    }
    
    // Reset cascading visibility
    updateCascadingFilters();
    window.applyGlobalFilters();
};

window.toggleSelectAll = function(source, category) {
    const checkboxes = document.querySelectorAll(`.filter-cb-${category}`);
    checkboxes.forEach(cb => {
        // Only check the item if it is currently visible
        if (cb.closest('label').style.display !== 'none') {
            cb.checked = source.checked;
        }
    });
    // Trigger cascading updates after a bulk select
    updateCascadingFilters();
};

window.applyGlobalFilters = function(isInitialLoad = false) {
    if (!document.getElementById('advanced-filters')) return;

    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen && !isInitialLoad) {
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) loadingText.textContent = "Processing configuration...";
        loadingScreen.style.opacity = '1';
        loadingScreen.style.display = 'flex';
    }

    setTimeout(() => {
        try {
            const selectedMappings = Array.from(document.querySelectorAll('.filter-cb-mapping:checked')).map(cb => cb.value);
            const selectedProjects = Array.from(document.querySelectorAll('.filter-cb-project:checked')).map(cb => cb.value);
            const selectedLOBs = Array.from(document.querySelectorAll('.filter-cb-lob:checked')).map(cb => cb.value);
            const selectedEntities = Array.from(document.querySelectorAll('.filter-cb-entity:checked')).map(cb => cb.value);

            const setCnt = (id, arr) => {
                const el = document.getElementById(id);
                if(el) el.textContent = arr.length > 0 ? arr.length : 'All';
            };
            setCnt('count-mapping', selectedMappings);
            setCnt('count-project', selectedProjects);
            setCnt('count-lob', selectedLOBs);
            setCnt('count-entity', selectedEntities);

            const startInput = document.getElementById('config-start-date') ? document.getElementById('config-start-date').value : ''; 
            const endInput = document.getElementById('config-end-date') ? document.getElementById('config-end-date').value : '';
            const techCheckbox = document.getElementById('config-opt-tech');
            const useTechCost = techCheckbox ? techCheckbox.checked : false;

            window.baseFilteredData = financialData.filter(row => {
                let pass = true;
                const rMapping = (row.Mapping || row.mapping || row.MAPPING || '').trim();
                const rProject = (row.Project || row.project || row.PROJECT || '').trim();
                const rLob = (row.LOB || row.lob || '').trim();
                const rEntity = (row.Entity || row.entity || row.ENTITY || '').trim();

                if (selectedMappings.length > 0 && !selectedMappings.includes(rMapping)) pass = false;
                if (selectedProjects.length > 0 && !selectedProjects.includes(rProject)) pass = false;
                if (selectedLOBs.length > 0 && !selectedLOBs.includes(rLob)) pass = false;
                if (selectedEntities.length > 0 && !selectedEntities.includes(rEntity)) pass = false;
                
                return pass;
            });

            filteredData = window.baseFilteredData.filter(row => {
                let pass = true;
                if (startInput && endInput) {
                    const rowDate = row.Dated || row.dated || '';
                    let rowMonth = '';
                    if (rowDate) {
                        const d = new Date(rowDate);
                        if (!isNaN(d.getTime())) {
                            rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        } else {
                            rowMonth = String(rowDate).substring(0, 7); 
                        }
                    }
                    if (rowMonth && (rowMonth < startInput || rowMonth > endInput)) pass = false;
                }
                return pass;
            });

            const costFieldToUse = useTechCost ? 'Cost_Tech' : 'Cost';
            const headerLvlChecked = document.querySelector('input[name="header_lvl"]:checked');
            const activeHeaderKey = headerLvlChecked ? `Header${headerLvlChecked.value}` : 'Header1';

            renderView1Summary(activeHeaderKey, costFieldToUse);
            renderViewPLDatasheet(costFieldToUse); 
            renderView2MoM(activeHeaderKey, costFieldToUse);
            renderView3Visuals();
            resetSimulation();

        } catch (error) {
            console.error("Error applying filters:", error);
        } finally {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => { loadingScreen.style.display = 'none'; }, 300);
            }
        }
    }, 50); 
};

// ----------------------------------------------------
// VIEW NAVIGATION
// ----------------------------------------------------
window.switchMainTab = function(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.view-nav-btn').forEach(el => {
        el.classList.remove('active', 'bg-white', 'dark:bg-slate-900', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
        el.classList.add('text-slate-500');
    });

    const targetView = document.getElementById(`view-${tabId}`);
    const activeBtn = document.getElementById(`nav-${tabId}`);
    
    if (targetView) targetView.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('active', 'bg-white', 'dark:bg-slate-900', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
    }

    if(tabId === 'visuals') renderView3Visuals();
    if(tabId === 'sim') runSimulation();
};

// ----------------------------------------------------
// VIEW 1: SUMMARY
// ----------------------------------------------------
function renderView1Summary(aggKey, costField) {
    let rev = 0, cogs = 0, associated = 0, hc = 0;
    
    // 1. Create a Set to track unique months in the filtered dataset
    const uniqueMonths = new Set();
    
    filteredData.forEach(row => {
        const cost = parseFloat(row[costField] || row.cost || 0);
        
        // Extract the month and add it to our Set
        const dStr = row.Dated || row.dated || '';
        if (dStr) {
            const d = new Date(dStr);
            const monthKey = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : String(dStr).substring(0, 7);
            uniqueMonths.add(monthKey);
        }
        
        // Grab both headers and convert to lowercase for easy matching
        const h1 = String(row.Header1 || row.header1 || '').trim().toLowerCase();
        const h2 = String(row.Header2 || row.header2 || '').trim().toLowerCase();

        // Revenue (Exclusive bucket)
        if (h1.includes('revenue')) {
            rev += Math.abs(cost);
        } 
        // COGS (Exclusive bucket)
        else if (h1.includes('cost of goods') || h1.includes('cogs')) {
            cogs += cost;
        }

        // Associated Costs (INDEPENDENT BUCKET)
        if (h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) {
            associated += cost;
        }

        // Headcount
        if (h1.includes('headcount') || h2.includes('headcount')) {
            hc += cost; 
        }
    });

    // 2. Calculate the True Average Headcount
    const monthCount = uniqueMonths.size > 0 ? uniqueMonths.size : 1; 
    const averageHc = hc / monthCount;

    // Calculate Margin
    const margin = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElemText('kpi-revenue', '$' + rev.toLocaleString(undefined, {maximumFractionDigits:0}));
    setElemText('kpi-cogs', '$' + cogs.toLocaleString(undefined, {maximumFractionDigits:0}));
    setElemText('kpi-margin', margin.toFixed(1) + '%');
    setElemText('kpi-associated', '$' + associated.toLocaleString(undefined, {maximumFractionDigits:0}));
    
    // 3. Apply the formatting to the new averageHc variable
    const formattedHc = averageHc % 1 !== 0 ? averageHc.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : averageHc.toLocaleString();
    setElemText('kpi-headcount', formattedHc);

    // --- PIE CHART (REVENUE VS COGS) ---
    renderChart('summary-chart', 'pie', ['Total Revenue', 'Total COGS'], [rev, cogs], 'Revenue vs COGS');
    
    // --- DYNAMIC INSIGHTS ---
    const container = document.getElementById('dynamic-insights');
    if (container) {
        let html = '';
        if (rev > 0) {
            html += `<p><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-2"></span> Your current Gross Margin is <strong>${margin.toFixed(1)}%</strong>.</p>`;
            if (cogs > rev) {
                html += `<p><span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-2"></span> <strong>Warning:</strong> COGS exceeds recognized revenue by $${(cogs - rev).toLocaleString(undefined, {maximumFractionDigits:0})}.</p>`;
            } else {
                html += `<p><span class="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block mr-2"></span> Revenue is effectively covering direct costs.</p>`;
            }
        } else {
            html += `<p><span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-2"></span> <strong>No Revenue Detected:</strong> Check if your current filters are excluding revenue records.</p>`;
        }
        container.innerHTML = html;
    }
}

// ----------------------------------------------------
// VIEW: NEW P&L DATASHEET
// ----------------------------------------------------
function renderViewPLDatasheet(costField) {
    const thead = document.getElementById('pl-table-head');
    const tbody = document.getElementById('pl-table-body');
    if (!thead || !tbody) return;

    const headerLvlChecked = document.querySelector('input[name="header_lvl"]:checked');
    const maxLevel = headerLvlChecked ? parseInt(headerLvlChecked.value) : 5;

    const startInput = document.getElementById('config-start-date').value;
    const endInput = document.getElementById('config-end-date').value;
    let months = [];

    if (startInput && endInput) {
        let curr = new Date(startInput + '-01T00:00:00');
        let end = new Date(endInput + '-01T00:00:00');
        while (curr <= end) {
            let y = curr.getFullYear();
            let m = String(curr.getMonth() + 1).padStart(2, '0');
            months.push(`${y}-${m}`);
            curr.setMonth(curr.getMonth() + 1);
        }
    } else {
        const monthSet = new Set();
        filteredData.forEach(row => {
            const d = row.Dated || row.dated;
            if(d) monthSet.add(d.substring(0,7)); 
        });
        months = Array.from(monthSet).sort();
    }

    const avg1Cb = document.getElementById('config-avg-1');
    const avg2Cb = document.getElementById('config-avg-2');
    const avg1Active = avg1Cb && avg1Cb.checked;
    const avg2Active = avg2Cb && avg2Cb.checked;
    
    const avg1Year = avg1Active ? avg1Cb.closest('label').querySelector('select').value : null;
    const avg2Year = avg2Active ? avg2Cb.closest('label').querySelector('select').value : null;

    const matrix = {}; 
    
    // --- NEW: KPI TRACKERS FOR GROSS MARGIN ---
    const kpiRev = { _total: 0 };
    const kpiCogs = { _total: 0 };
    months.forEach(m => { kpiRev[m] = 0; kpiCogs[m] = 0; });
    if (avg1Active) { kpiRev['avg1'] = 0; kpiCogs['avg1'] = 0; }
    if (avg2Active) { kpiRev['avg2'] = 0; kpiCogs['avg2'] = 0; }

    filteredData.forEach(row => {
        const rowDate = row.Dated || row.dated || '';
        let m = '';
        if (rowDate) {
            const d = new Date(rowDate);
            if (!isNaN(d.getTime())) {
                m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
                m = String(rowDate).substring(0, 7);
            }
        }
        if (!m) return;
        const cost = parseFloat(row[costField] || row.cost || 0);

        const h1 = (row.Header1 || row.header1 || '').trim().toLowerCase();
        const h2 = (row.Header2 || row.header2 || '').trim().toLowerCase();
        const isCount = h1.includes('headcount') || h1.includes('volume') || h2.includes('headcount');

        // Track global Revenue & COGS
        if (!isCount) {
            if (h1.includes('revenue')) {
                kpiRev[m] += Math.abs(cost);
                kpiRev._total += Math.abs(cost);
            } else if (h1.includes('cost of goods') || h1.includes('cogs')) {
                kpiCogs[m] += cost;
                kpiCogs._total += cost;
            }
        }

        let currentPath = "";
        for (let i = 1; i <= maxLevel; i++) {
            const hVal = (row[`Header${i}`] || row[`header${i}`] || '').trim();
            if (!hVal) break; 
            currentPath = currentPath ? `${currentPath}|${hVal}` : hVal;
            if (!matrix[currentPath]) matrix[currentPath] = { _total: 0 };
            matrix[currentPath][m] = (matrix[currentPath][m] || 0) + cost;
            matrix[currentPath]._total += cost;
        }
    });

    if (avg1Active || avg2Active) {
        window.baseFilteredData.forEach(row => {
            const rowDate = row.Dated || row.dated || '';
            let rowYear = '';
            if (rowDate) {
                const d = new Date(rowDate);
                if (!isNaN(d.getTime())) {
                    rowYear = d.getFullYear().toString();
                } else {
                    rowYear = String(rowDate).substring(0, 4);
                }
            }
            const cost = parseFloat(row[costField] || row.cost || 0);

            const h1 = (row.Header1 || row.header1 || '').trim().toLowerCase();
            const h2 = (row.Header2 || row.header2 || '').trim().toLowerCase();
            const isCount = h1.includes('headcount') || h1.includes('volume') || h2.includes('headcount');

            if ((avg1Active && rowYear === avg1Year) || (avg2Active && rowYear === avg2Year)) {
                
                // Track global averages
                if (!isCount) {
                    if (h1.includes('revenue')) {
                        if (avg1Active && rowYear === avg1Year) kpiRev['avg1'] += Math.abs(cost);
                        if (avg2Active && rowYear === avg2Year) kpiRev['avg2'] += Math.abs(cost);
                    } else if (h1.includes('cost of goods') || h1.includes('cogs')) {
                        if (avg1Active && rowYear === avg1Year) kpiCogs['avg1'] += cost;
                        if (avg2Active && rowYear === avg2Year) kpiCogs['avg2'] += cost;
                    }
                }

                let currentPath = "";
                for (let i = 1; i <= maxLevel; i++) {
                    const hVal = (row[`Header${i}`] || row[`header${i}`] || '').trim();
                    if (!hVal) break;
                    currentPath = currentPath ? `${currentPath}|${hVal}` : hVal;
                    if (!matrix[currentPath]) matrix[currentPath] = { _total: 0 };
                    
                    if (avg1Active && rowYear === avg1Year) matrix[currentPath][`avg1`] = (matrix[currentPath][`avg1`] || 0) + cost;
                    if (avg2Active && rowYear === avg2Year) matrix[currentPath][`avg2`] = (matrix[currentPath][`avg2`] || 0) + cost;
                }
            }
        });
    }

    let headerHtml = `<tr><th class="p-4 bg-slate-100 dark:bg-slate-900 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style="resize: horizontal; overflow: hidden; min-width: 250px; max-width: 800px;">Title (Drag edge to resize)</th>`;
    months.forEach(m => {
        const dateObj = new Date(m + "-01T00:00:00");
        headerHtml += `<th class="p-4 text-center">${dateObj.toLocaleString('default', { month: 'short', year: '2-digit' })}</th>`;
    });
    
    headerHtml += `<th class="p-4 text-center border-l border-slate-200 dark:border-slate-700 text-blue-500">Trend (Latest)</th>`;
    headerHtml += `<th class="p-4 text-center border-l border-slate-200 dark:border-slate-700 text-slate-500">Period Average</th>`;
    
    if (avg1Active) headerHtml += `<th class="p-4 text-center border-l border-slate-200 dark:border-slate-700 text-blue-500">Avg ${avg1Year}</th>`;
    if (avg2Active) headerHtml += `<th class="p-4 text-center border-l border-slate-200 dark:border-slate-700 text-purple-500">Avg ${avg2Year}</th>`;
    headerHtml += `</tr>`;
    thead.innerHTML = headerHtml;

    const sortedPaths = Object.keys(matrix).sort((a, b) => {
        const aRev = a.toLowerCase().includes('revenue');
        const bRev = b.toLowerCase().includes('revenue');
        if (aRev && !bRev) return -1; // Move a up
        if (!aRev && bRev) return 1;  // Move b up
        return a.localeCompare(b);    // Standard alphabetical for everything else
    });

    let bodyHtml = '';

    if (sortedPaths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${months.length + 5}" class="p-4 text-center italic text-slate-400">No data available.</td></tr>`;
        return;
    }

    // --- FEATURE 1: BUILD GROSS MARGIN PINNED ROW ---
    let kpiRowHtml = `<tr class="bg-slate-800 text-white dark:bg-slate-950 border-b border-slate-700">
        <td class="py-3 pr-4 pl-4 font-black sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate bg-slate-800 dark:bg-slate-950">
            🌟 OVERALL GROSS MARGIN %
        </td>`;

    months.forEach(m => {
        const r = kpiRev[m] || 0; const c = kpiCogs[m] || 0;
        const margin = r > 0 ? ((r - c) / r) * 100 : 0;
        kpiRowHtml += `<td class="py-3 px-4 text-center font-bold">${margin.toFixed(1)}%</td>`;
    });

    const lastMonth = months.length > 0 ? months[months.length - 1] : null;
    const prevMonth = months.length > 1 ? months[months.length - 2] : null;
    let trendHtml = `<td class="py-3 px-4 text-center border-l border-slate-700 text-slate-400">-</td>`;
    if (lastMonth && prevMonth) {
        const rL = kpiRev[lastMonth] || 0; const cL = kpiCogs[lastMonth] || 0;
        const rP = kpiRev[prevMonth] || 0; const cP = kpiCogs[prevMonth] || 0;
        const mL = rL > 0 ? ((rL - cL) / rL) * 100 : 0;
        const mP = rP > 0 ? ((rP - cP) / rP) * 100 : 0;
        const delta = mL - mP;
        if (delta !== 0) {
            const colorClass = delta > 0 ? 'text-emerald-400' : 'text-rose-400';
            const icon = delta > 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
            trendHtml = `<td class="py-3 px-4 text-center font-extrabold border-l border-slate-700 ${colorClass}">${icon} ${Math.abs(delta).toFixed(1)}%</td>`;
        }
    }
    kpiRowHtml += trendHtml;

    const rTot = kpiRev._total; const cTot = kpiCogs._total;
    const mTot = rTot > 0 ? ((rTot - cTot) / rTot) * 100 : 0;
    kpiRowHtml += `<td class="py-3 px-4 text-center font-bold border-l border-slate-700">${mTot.toFixed(1)}%</td>`;

    if (avg1Active) {
        const rA = kpiRev['avg1'] || 0; const cA = kpiCogs['avg1'] || 0;
        const mA = rA > 0 ? ((rA - cA) / rA) * 100 : 0;
        kpiRowHtml += `<td class="py-3 px-4 text-center font-bold border-l border-slate-700 text-blue-300">${mA.toFixed(1)}%</td>`;
    }
    if (avg2Active) {
        const rA = kpiRev['avg2'] || 0; const cA = kpiCogs['avg2'] || 0;
        const mA = rA > 0 ? ((rA - cA) / rA) * 100 : 0;
        kpiRowHtml += `<td class="py-3 px-4 text-center font-bold border-l border-slate-700 text-purple-300">${mA.toFixed(1)}%</td>`;
    }
    kpiRowHtml += `</tr>`;

    // --- FEATURE 1: BUILD COST OF REVENUE (COR%) ROW ---
    let corRowHtml = `<tr class="bg-slate-700/20 text-slate-600 dark:text-slate-300 dark:bg-slate-800/50 border-b-[3px] border-slate-300 dark:border-slate-700">
        <td class="py-2.5 pr-4 pl-4 font-bold sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate bg-slate-100 dark:bg-slate-900">
            📊 COST OF REVENUE (COR) %
        </td>`;

    months.forEach(m => {
        const r = kpiRev[m] || 0; const c = kpiCogs[m] || 0;
        const cor = r > 0 ? (c / r) * 100 : 0;
        corRowHtml += `<td class="py-2.5 px-4 text-center font-semibold">${cor.toFixed(1)}%</td>`;
    });

    let corTrendHtml = `<td class="py-2.5 px-4 text-center border-l border-slate-300 dark:border-slate-700 text-slate-400">-</td>`;
    if (lastMonth && prevMonth) {
        const rL = kpiRev[lastMonth] || 0; const cL = kpiCogs[lastMonth] || 0;
        const rP = kpiRev[prevMonth] || 0; const cP = kpiCogs[prevMonth] || 0;
        const corL = rL > 0 ? (cL / rL) * 100 : 0;
        const corP = rP > 0 ? (cP / rP) * 100 : 0;
        const corDelta = corL - corP;
        if (corDelta !== 0) {
            // REVERSE LOGIC: COR going down is GOOD (Green), going up is BAD (Red)
            const colorClass = corDelta < 0 ? 'text-emerald-500' : 'text-rose-500';
            const icon = corDelta > 0 ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
            corTrendHtml = `<td class="py-2.5 px-4 text-center font-extrabold border-l border-slate-300 dark:border-slate-700 ${colorClass}">${icon} ${Math.abs(corDelta).toFixed(1)}%</td>`;
        }
    }
    corRowHtml += corTrendHtml;

    const corTot = rTot > 0 ? (cTot / rTot) * 100 : 0;
    corRowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-300 dark:border-slate-700">${corTot.toFixed(1)}%</td>`;

    if (avg1Active) {
        const rA = kpiRev['avg1'] || 0; const cA = kpiCogs['avg1'] || 0;
        const corA = rA > 0 ? (cA / rA) * 100 : 0;
        corRowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400">${corA.toFixed(1)}%</td>`;
    }
    if (avg2Active) {
        const rA = kpiRev['avg2'] || 0; const cA = kpiCogs['avg2'] || 0;
        const corA = rA > 0 ? (cA / rA) * 100 : 0;
        corRowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-300 dark:border-slate-700 text-purple-600 dark:text-purple-400">${corA.toFixed(1)}%</td>`;
    }
    corRowHtml += `</tr>`;
    
    // Inject both KPI rows first
    bodyHtml += kpiRowHtml + corRowHtml;

    sortedPaths.forEach(path => {
        const parts = path.split('|');
        const level = parts.length;
        const displayName = parts[level - 1]; 
        
        // --- CRITICAL FIX: INLINE SCALABLE PADDING ---
        // Level 1 = 1rem, Level 2 = 2.5rem, Level 3 = 4rem, etc.
        const paddingLeft = 1 + ((level - 1) * 1.5); 
        
        const textWeight = level === 1 ? 'font-extrabold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400';
        
        const isRevenue = path.toLowerCase().includes('revenue');
        const isCount = path.toLowerCase().includes('headcount') || path.toLowerCase().includes('volume');
        const rowColorClass = isRevenue ? 'text-pink-600 dark:text-pink-400' : '';

        // Added 'style="padding-left: ${paddingLeft}rem;"' and a clean '↳' icon for sub-levels
        let rowHtml = `<tr class="hover:bg-slate-200/70 dark:hover:bg-white/[0.05] transition-colors border-b border-slate-100 dark:border-slate-800/50">
                        <td class="py-2.5 pr-4 ${textWeight} ${rowColorClass} bg-white dark:bg-slate-900 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate" title="${displayName}" style="padding-left: ${paddingLeft}rem;">
                            ${level > 1 ? '<span class="text-slate-300 dark:text-slate-600 mr-2 font-bold">↳</span>' : ''}${displayName}
                        </td>`;

        const data = matrix[path];
        let rowTotal = 0;

        const formatVal = (val) => {
            if (val === 0) return '-';
            return isCount ? val.toLocaleString(undefined, {maximumFractionDigits:0}) : (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString(undefined, {maximumFractionDigits:0});
        };

        months.forEach(m => {
            const val = data[m] || 0;
            rowTotal += val;
            rowHtml += `<td class="py-2.5 px-4 text-center ${rowColorClass}">${formatVal(val)}</td>`;
        });

        const lastVal = lastMonth ? (data[lastMonth] || 0) : 0;
        const prevVal = prevMonth ? (data[prevMonth] || 0) : 0;

        if (months.length >= 2 && (lastVal !== 0 || prevVal !== 0)) {
            const delta = lastVal - prevVal;
            const deltaPct = prevVal !== 0 ? (delta / prevVal) * 100 : (lastVal !== 0 ? 100 : 0);
            
            if (delta !== 0) {
                const isIncrease = delta > 0;
                const isGood = isRevenue ? isIncrease : !isIncrease; 
                const colorClass = isGood ? 'text-emerald-500' : 'text-rose-500';
                const icon = isIncrease ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
                
                rowHtml += `<td class="py-2.5 px-4 text-center font-extrabold border-l border-slate-200 dark:border-slate-700 ${colorClass} text-[11px]">${icon} ${Math.abs(deltaPct).toFixed(1)}%</td>`;
            } else {
                rowHtml += `<td class="py-2.5 px-4 text-center border-l border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">-</td>`;
            }
        } else {
            rowHtml += `<td class="py-2.5 px-4 text-center border-l border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">-</td>`;
        }

        const avg = rowTotal / (months.length || 1);
        rowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-200 dark:border-slate-700 ${rowColorClass}">${formatVal(avg)}</td>`;
        
        if (avg1Active) {
            const histAvg1 = (data['avg1'] || 0) / 12;
            rowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">${formatVal(histAvg1)}</td>`;
        }
        if (avg2Active) {
            const histAvg2 = (data['avg2'] || 0) / 12;
            rowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400">${formatVal(histAvg2)}</td>`;
        }
        
        rowHtml += `</tr>`;
        bodyHtml += rowHtml;
    });

    tbody.innerHTML = bodyHtml;
}

// ----------------------------------------------------
// VIEW 3: MoM COMPARISON
// ----------------------------------------------------
function renderView2MoM(aggKey, costField) {
    const tbody = document.getElementById('mom-table-body');
    const baseInput = document.getElementById('mom-base-month');
    const compInput = document.getElementById('mom-comp-month');
    const btnRefresh = document.getElementById('btn-refresh-mom');
    
    if (!tbody || !baseInput || !compInput) return;

    const headerLvlChecked = document.querySelector('input[name="header_lvl"]:checked');
    const maxLevel = headerLvlChecked ? parseInt(headerLvlChecked.value) : 5;
    const dataToUse = window.baseFilteredData || [];

    // 1. Auto-detect months
    if (!baseInput.value || !compInput.value) {
        const uniqueMonths = new Set();
        dataToUse.forEach(row => {
            const dStr = row.Dated || row.dated || '';
            if (dStr) {
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) uniqueMonths.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
        });
        const sortedMonths = Array.from(uniqueMonths).sort().reverse(); 
        
        if (sortedMonths.length >= 2) {
            compInput.value = sortedMonths[0]; 
            baseInput.value = sortedMonths[1]; 
        } else if (sortedMonths.length === 1) {
            compInput.value = sortedMonths[0];
            baseInput.value = sortedMonths[0];
        }
    }

    const baseM = baseInput.value;
    const compM = compInput.value;

    document.getElementById('mom-th-base').textContent = baseM || 'Base Month';
    document.getElementById('mom-th-comp').textContent = compM || 'Compare Month';

    const firstTh = document.querySelector('#view-mom thead th:first-child');
    if (firstTh) firstTh.textContent = `Project & Account Title (Level ${maxLevel})`;

    if (!baseM || !compM) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 italic">Insufficient data to compare.</td></tr>`;
        document.getElementById('mom-insights').innerHTML = 'Not enough data available.';
        return;
    }

    // 2. BUILD THE MATRIX
    const matrix = {};
    let totalBase = 0;
    let totalComp = 0;
    
    // --- NEW: KPI TRACKERS FOR GROSS MARGIN ---
    let revBase = 0, cogsBase = 0;
    let revComp = 0, cogsComp = 0;

    dataToUse.forEach(row => {
        const dStr = row.Dated || row.dated || '';
        let rowMonth = '';
        if (dStr) {
            const d = new Date(dStr);
            rowMonth = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : String(dStr).substring(0, 7);
        }

        if (rowMonth !== baseM && rowMonth !== compM) return;

        const cost = parseFloat(row[costField] || row.cost || 0);
        const proj = (row.Project || row.project || row.PROJECT || 'Uncategorized').trim();
        const mapping = (row.Mapping || row.mapping || row.MAPPING || 'Uncategorized').trim();
        const h1 = (row.Header1 || row.header1 || '').trim().toLowerCase();
        const h2 = (row.Header2 || row.header2 || '').trim().toLowerCase();
        
        const isCount = h1.includes('headcount') || h1.includes('volume') || h2.includes('headcount');
        const rootId = `${proj} (${mapping})`;

        if (!isCount) {
            if (rowMonth === baseM) {
                totalBase += cost;
                if (h1.includes('revenue')) revBase += Math.abs(cost);
                else if (h1.includes('cost of goods') || h1.includes('cogs')) cogsBase += cost;
            }
            if (rowMonth === compM) {
                totalComp += cost;
                if (h1.includes('revenue')) revComp += Math.abs(cost);
                else if (h1.includes('cost of goods') || h1.includes('cogs')) cogsComp += cost;
            }
        }

        let currentPath = rootId;

        if (!matrix[currentPath]) {
            matrix[currentPath] = { id: currentPath, parentId: null, level: 0, name: rootId, baseCost: 0, compCost: 0, isExpandable: false, projName: proj };
        }
        
        if (!isCount) {
            if (rowMonth === baseM) matrix[currentPath].baseCost += cost;
            if (rowMonth === compM) matrix[currentPath].compCost += cost;
        }

        for (let i = 1; i <= maxLevel; i++) {
            const hVal = (row[`Header${i}`] || row[`header${i}`] || '').trim();
            if (!hVal) break; 

            const parentPath = currentPath;
            currentPath = `${currentPath}|${hVal}`;
            matrix[parentPath].isExpandable = true; 

            if (!matrix[currentPath]) {
                matrix[currentPath] = { id: currentPath, parentId: parentPath, level: i, name: hVal, baseCost: 0, compCost: 0, isExpandable: false, projName: proj };
            }
            
            if (rowMonth === baseM) matrix[currentPath].baseCost += cost;
            if (rowMonth === compM) matrix[currentPath].compCost += cost;
        }
    });

    // 3. Calculate Variances
    let results = Object.values(matrix).map(item => {
        item.deltaCost = item.compCost - item.baseCost;
        item.deltaPct = item.baseCost !== 0 ? (item.deltaCost / item.baseCost) * 100 : (item.compCost > 0 ? 100 : 0);
        return item;
    });

    const level0Projects = results.filter(r => r.level === 0);
    const totalSelected = level0Projects.length;

    if (totalSelected > 5) {
        level0Projects.sort((a, b) => b.baseCost - a.baseCost);
        const top5ProjectIds = level0Projects.slice(0, 5).map(p => p.id);
        
        results = results.filter(r => {
            if (r.level === 0) return top5ProjectIds.includes(r.id);
            const rootParentId = r.id.split('|')[0]; 
            return top5ProjectIds.includes(rootParentId);
        });

        document.getElementById('mom-insights').innerHTML += `
            <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-700 dark:text-amber-500 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
                <span class="material-icons-sharp text-[16px]">warning</span>
                <p><strong>Performance Limit Active:</strong> You have selected ${totalSelected} projects. To prevent browser instability, the table below is currently restricted to displaying only your <strong>Top 5 largest projects</strong> (by Base Month cost). Total KPI calculations above remain perfectly accurate.</p>
            </div>
        `;
    }

    // --- FEATURE 2: FORCE REVENUE TO THE TOP ---
    results.sort((a, b) => {
        const partsA = a.id.split('|');
        const partsB = b.id.split('|');
        const minLength = Math.min(partsA.length, partsB.length);

        for (let i = 0; i < minLength; i++) {
            if (partsA[i] !== partsB[i]) {
                const isRevA = partsA[i].toLowerCase().includes('revenue');
                const isRevB = partsB[i].toLowerCase().includes('revenue');
                
                // If one is Revenue and the other isn't, Revenue wins
                if (isRevA && !isRevB) return -1;
                if (!isRevA && isRevB) return 1;
                
                // Otherwise, standard alphabetical sort
                return partsA[i].localeCompare(partsB[i]);
            }
        }
        // Ensures parents stay above their children
        return partsA.length - partsB.length;
    });

    // 4. Render Table
    tbody.innerHTML = '';
    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 italic">No records found for the selected months.</td></tr>`;
        return;
    }

    // --- FEATURE 1: BUILD GROSS MARGIN PINNED ROW ---
    const marginBase = revBase > 0 ? ((revBase - cogsBase) / revBase) * 100 : 0;
    const marginComp = revComp > 0 ? ((revComp - cogsComp) / revComp) * 100 : 0;
    const marginDelta = marginComp - marginBase; 

    let marginDeltaStr = '-';
    let marginStatusHtml = `<span class="text-slate-400">-</span>`;
    let marginTextClass = 'text-slate-600 dark:text-slate-400';

    if (marginDelta !== 0) {
        const prefix = marginDelta > 0 ? '+' : '';
        marginDeltaStr = prefix + marginDelta.toFixed(1) + '%';
        if (marginDelta > 0) {
            marginTextClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
            marginStatusHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-up"></i> UP</span>`;
        } else {
            marginTextClass = 'text-rose-600 dark:text-rose-400 font-bold';
            marginStatusHtml = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-down"></i> DOWN</span>`;
        }
    }

    const kpiMomRow = `
        <tr class="bg-slate-800 text-white dark:bg-slate-950 border-b border-slate-700">
            <td class="py-4 pr-4 pl-4 font-black sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate bg-slate-800 dark:bg-slate-950">
                🌟 OVERALL GROSS MARGIN %
            </td>
            <td class="p-3 text-right font-bold">${marginBase.toFixed(1)}%</td>
            <td class="p-3 text-right font-bold">${marginComp.toFixed(1)}%</td>
            <td class="p-3 text-right ${marginTextClass}">${marginDeltaStr}</td>
            <td class="p-3 text-right text-slate-400">-</td>
            <td class="p-3 text-center">${marginStatusHtml}</td>
        </tr>
    `;

    // --- FEATURE 1: BUILD COST OF REVENUE (COR%) ROW ---
    const corBase = revBase > 0 ? (cogsBase / revBase) * 100 : 0;
    const corComp = revComp > 0 ? (cogsComp / revComp) * 100 : 0;
    const corDelta = corComp - corBase; 

    let corDeltaStr = '-';
    let corStatusHtml = `<span class="text-slate-400">-</span>`;
    let corTextClass = 'text-slate-600 dark:text-slate-400';

    if (corDelta !== 0) {
        const prefix = corDelta > 0 ? '+' : '';
        corDeltaStr = prefix + corDelta.toFixed(1) + '%';
        // REVERSE LOGIC: COR decrease is GOOD (Green)
        if (corDelta < 0) { 
            corTextClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
            corStatusHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-down"></i> DOWN</span>`;
        } else { 
            corTextClass = 'text-rose-600 dark:text-rose-400 font-bold';
            corStatusHtml = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-up"></i> UP</span>`;
        }
    }

    const kpiCorRow = `
        <tr class="bg-slate-700/20 text-slate-700 dark:text-slate-300 dark:bg-slate-800/50 border-b-[3px] border-slate-300 dark:border-slate-700">
            <td class="py-3 pr-4 pl-4 font-bold sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate bg-slate-100 dark:bg-slate-900">
                📊 COST OF REVENUE (COR) %
            </td>
            <td class="p-3 text-right font-semibold">${corBase.toFixed(1)}%</td>
            <td class="p-3 text-right font-semibold">${corComp.toFixed(1)}%</td>
            <td class="p-3 text-right ${corTextClass}">${corDeltaStr}</td>
            <td class="p-3 text-right text-slate-400">-</td>
            <td class="p-3 text-center">${corStatusHtml}</td>
        </tr>
    `;
    
    // Inject KPI rows first
    tbody.innerHTML += kpiMomRow + kpiCorRow;

    let topIncreaser = null;
    let topDecreaser = null;
    const getSafeId = str => encodeURIComponent(str).replace(/%/g, '_');

    results.forEach(res => {
        if (res.level === 1 && !res.name.toLowerCase().includes('headcount') && !res.name.toLowerCase().includes('volume')) {
            if (res.deltaCost > 0 && (!topIncreaser || res.deltaCost > topIncreaser.deltaCost)) topIncreaser = res;
            if (res.deltaCost < 0 && (!topDecreaser || res.deltaCost < topDecreaser.deltaCost)) topDecreaser = res;
        }

        const safeId = getSafeId(res.id);
        const safeParentId = res.parentId ? getSafeId(res.parentId) : '';
        const startCollapsed = res.level > 0; 
        const chevronIcon = res.isExpandable ? (startCollapsed ? 'fa-chevron-right' : 'fa-chevron-down') : '';
        const displayStyle = res.level > 1 ? 'display: none;' : ''; 
        
        const isRevenue = res.name.toLowerCase().includes('revenue') || res.id.toLowerCase().includes('revenue');
        const isCount = res.name.toLowerCase().includes('headcount') || res.name.toLowerCase().includes('volume') || res.id.toLowerCase().includes('headcount') || res.id.toLowerCase().includes('volume');

        const formatVal = (val) => {
            if (val === 0) return '-';
            return isCount ? val.toLocaleString(undefined, {maximumFractionDigits:0}) : '$' + Math.abs(val).toLocaleString(undefined, {maximumFractionDigits:0});
        };

        const baseStr = formatVal(res.baseCost);
        const compStr = formatVal(res.compCost);
        
        let deltaStr = '-';
        if (res.deltaCost !== 0) {
            let prefix = res.deltaCost > 0 ? '+' : '-';
            deltaStr = prefix + (isCount ? Math.abs(res.deltaCost).toLocaleString() : '$' + Math.abs(res.deltaCost).toLocaleString());
        }

        const isIncrease = res.deltaCost > 0;
        const isDecrease = res.deltaCost < 0;
        
        let statusHtml = `<span class="text-slate-400">-</span>`;
        let textClass = 'text-slate-600 dark:text-slate-400';

        if (isIncrease) {
            if (isRevenue) {
                textClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
                statusHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-up"></i> UP</span>`;
            } else {
                textClass = 'text-rose-600 dark:text-rose-400 font-bold';
                statusHtml = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-up"></i> UP</span>`;
            }
        } else if (isDecrease) {
            if (isRevenue) {
                textClass = 'text-rose-600 dark:text-rose-400 font-bold';
                statusHtml = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-down"></i> DOWN</span>`;
            } else {
                textClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
                statusHtml = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 w-fit mx-auto"><i class="fas fa-arrow-down"></i> DOWN</span>`;
            }
        }

        let bgClass = 'bg-white dark:bg-slate-900';
        let textWeight = 'font-medium text-slate-600 dark:text-slate-400';
        if (res.level === 0) {
            bgClass = 'bg-slate-100 dark:bg-slate-800/80'; 
            textWeight = 'font-black text-blue-800 dark:text-blue-400';
        } else if (res.level === 1) {
            textWeight = 'font-extrabold text-slate-800 dark:text-white';
        }
        
        const rowColorClass = isRevenue ? 'text-pink-600 dark:text-pink-400' : '';
        const paddingLeft = 1 + (res.level * 1.5); 
        
        let expandHtml = res.isExpandable 
            ? `<i id="icon-${safeId}" class="fas ${chevronIcon} mr-2 text-slate-400 w-4 transition-transform"></i>` 
            : `<span class="inline-block w-6"></span>`;
            
        let clickAttr = res.isExpandable ? `onclick="toggleMomRow('${safeId}')" class="cursor-pointer group select-none"` : ``;

        tbody.innerHTML += `
            <tr data-row="${safeId}" data-parent="${safeParentId}" style="${displayStyle}" class="hover:bg-slate-200/70 dark:hover:bg-white/[0.05] transition-colors border-b border-slate-100 dark:border-slate-800/50">
                <td ${clickAttr} class="py-3 pr-4 ${textWeight} ${rowColorClass} ${bgClass} sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[300px]" style="padding-left: ${paddingLeft}rem;" title="${res.id}">
                    <div class="flex items-center">
                        ${expandHtml} <span class="${res.isExpandable ? 'group-hover:text-blue-500 transition-colors' : ''}">${res.name}</span>
                    </div>
                </td>
                <td class="p-3 text-right text-slate-600 dark:text-slate-300 font-medium ${rowColorClass} ${res.level===0 ? bgClass : ''}">${res.baseCost < 0 && !isCount ? '-' : ''}${baseStr}</td>
                <td class="p-3 text-right text-slate-600 dark:text-slate-300 font-medium ${rowColorClass} ${res.level===0 ? bgClass : ''}">${res.compCost < 0 && !isCount ? '-' : ''}${compStr}</td>
                <td class="p-3 text-right ${textClass} ${res.level===0 ? bgClass : ''}">${deltaStr}</td>
                <td class="p-3 text-right ${textClass} ${res.level===0 ? bgClass : ''}">${res.deltaCost > 0 ? '+' : ''}${res.deltaPct.toFixed(1)}%</td>
                <td class="p-3 text-center ${res.level===0 ? bgClass : ''}">${statusHtml}</td>
            </tr>
        `;
    });

    // 5. Generate Dynamic Insights
    const overallDelta = totalComp - totalBase;
    const overallPct = totalBase !== 0 ? (overallDelta / totalBase) * 100 : 0;
    const insightContainer = document.getElementById('mom-insights');
    
    // Made the overall delta a neutral blue so it doesn't falsely show red for revenue increases!
    let insightHtml = `<p>Between <strong>${baseM}</strong> and <strong>${compM}</strong>, total filtered activity changed by <strong class="text-blue-600 dark:text-blue-400">${overallDelta > 0 ? '+' : ''}$${Math.abs(overallDelta).toLocaleString(undefined, {maximumFractionDigits:0})} (${overallPct.toFixed(1)}%)</strong>.</p>`;
    
    if (topIncreaser && topIncreaser.deltaCost > 0) {
        // Reverse colors if it's Revenue (Increase = Good/Green)
        const isRev = topIncreaser.name.toLowerCase().includes('revenue') || topIncreaser.id.toLowerCase().includes('revenue');
        const colorClass = isRev ? 'text-emerald-600' : 'text-rose-600';
        
        insightHtml += `<p>• The largest variance driver was <strong>${topIncreaser.name}</strong> under <strong>${topIncreaser.projName}</strong>, moving by <span class="${colorClass} font-bold">+$${topIncreaser.deltaCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>.</p>`;
    }
    
    if (topDecreaser && topDecreaser.deltaCost < 0) {
        // Reverse colors if it's Revenue (Decrease = Bad/Red)
        const isRev = topDecreaser.name.toLowerCase().includes('revenue') || topDecreaser.id.toLowerCase().includes('revenue');
        const colorClass = isRev ? 'text-rose-600' : 'text-emerald-600'; 
        
        insightHtml += `<p>• The largest reduction was <strong>${topDecreaser.name}</strong> under <strong>${topDecreaser.projName}</strong>, moving by <span class="${colorClass} font-bold">-$${Math.abs(topDecreaser.deltaCost).toLocaleString(undefined, {maximumFractionDigits:0})}</span>.</p>`;
    }

    insightContainer.innerHTML = insightHtml;

    if (!btnRefresh.hasAttribute('data-bound')) {
        btnRefresh.addEventListener('click', () => {
            const costFieldToUse = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';
            renderView2MoM(null, costFieldToUse);
        });
        btnRefresh.setAttribute('data-bound', 'true');
    }
}

// ----------------------------------------------------
// HELPER FUNCTIONS: HIERARCHY ACCORDION
// ----------------------------------------------------
window.toggleMomRow = function(safeId) {
    const icon = document.getElementById(`icon-${safeId}`);
    if (!icon) return;
    
    const isCollapsed = icon.classList.contains('fa-chevron-right');
    
    if (isCollapsed) {
        icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        document.querySelectorAll(`tr[data-parent="${safeId}"]`).forEach(tr => {
            tr.style.display = ''; 
        });
    } else {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        window.hideAllDescendants(safeId);
    }
};

window.hideAllDescendants = function(parentId) {
    document.querySelectorAll(`tr[data-parent="${parentId}"]`).forEach(tr => {
        tr.style.display = 'none';
        const childId = tr.dataset.row;
        const childIcon = document.getElementById(`icon-${childId}`);
        if (childIcon && childIcon.classList.contains('fa-chevron-down')) {
            childIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
        window.hideAllDescendants(childId);
    });
};

// ----------------------------------------------------
// HELPER FUNCTIONS: HIERARCHY ACCORDION
// ----------------------------------------------------
window.toggleMomRow = function(safeId) {
    const icon = document.getElementById(`icon-${safeId}`);
    if (!icon) return;
    
    const isCollapsed = icon.classList.contains('fa-chevron-right');
    
    if (isCollapsed) {
        // Expand: Change icon to down, show DIRECT children
        icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        document.querySelectorAll(`tr[data-parent="${safeId}"]`).forEach(tr => {
            tr.style.display = ''; 
        });
    } else {
        // Collapse: Change icon to right, hide ALL deep descendants
        icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        hideAllDescendants(safeId);
    }
};

function hideAllDescendants(parentId) {
    document.querySelectorAll(`tr[data-parent="${parentId}"]`).forEach(tr => {
        tr.style.display = 'none';
        const childId = tr.dataset.row;
        const childIcon = document.getElementById(`icon-${childId}`);
        // Reset child's state so it is collapsed next time it is revealed
        if (childIcon && childIcon.classList.contains('fa-chevron-down')) {
            childIcon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
        // Recursively hide grandchildren
        hideAllDescendants(childId);
    });
}

// ----------------------------------------------------
// VIEW 4: VISUALIZATIONS
// ----------------------------------------------------
window.renderView3Visuals = function() {
    if (!document.getElementById('vis-line-chart')) return;

    const dataToUse = filteredData || [];
    if (dataToUse.length === 0) return;

    const costField = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';
    
    // --- FIX 1: EXACT DARK MODE DETECTION ---
    // Your main.php uses 'dark-theme-variables' to trigger dark mode
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark-theme-variables') ||
                   document.documentElement.classList.contains('dark-theme-variables');
                   
    const textColor = isDark ? '#e2e8f0' : '#475569'; // Crisp white/gray in dark mode
    const gridColor = isDark ? '#334155' : '#e2e8f0'; 
    const themeColors = ['#8A2B3D', '#E35B5B', '#F28F43', '#F4C145'];

    const heatmapMetricObj = document.querySelector('input[name="heatmap_metric"]:checked');
    const heatmapMetric = heatmapMetricObj ? heatmapMetricObj.value : 'personnel';

    // --- 1. DATA AGGREGATION ---
    const monthlyData = {};
    let totalRev = 0, totalCogs = 0;
    const projFinancials = {}; 
    const projectHeatmapData = {}; 

    dataToUse.forEach(row => {
        const dStr = row.Dated || row.dated || '';
        let m = '';
        if (dStr) {
            const d = new Date(dStr);
            m = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : String(dStr).substring(0, 7);
        }
        if (!m) return;

        const cost = parseFloat(row[costField] || row.cost || 0);
        if (cost === 0) return;

        const proj = (row.Project || row.project || row.PROJECT || 'Uncategorized').trim();
        const h1 = (row.Header1 || row.header1 || '').trim().toLowerCase();
        const h2 = (row.Header2 || row.header2 || '').trim().toLowerCase();

        const isRev = h1.includes('revenue');
        const isCOGS = h1.includes('cost of goods') || h1.includes('cogs');
        const isPersonnel = h2.includes('personnel');
        const isAssociated = h2.includes('associated');
        const isCount = h1.includes('headcount') || h1.includes('volume');

        if (!monthlyData[m]) monthlyData[m] = { rev: 0, cogs: 0, personnel: 0, associated: 0 };
        if (!projFinancials[proj]) projFinancials[proj] = { rev: 0, cogs: 0 };
        if (!projectHeatmapData[proj]) projectHeatmapData[proj] = { personnel: 0, associated: 0 };

        if (!isCount) {
            if (isRev) {
                monthlyData[m].rev += Math.abs(cost);
                totalRev += Math.abs(cost);
                projFinancials[proj].rev += Math.abs(cost);
            }
            if (isCOGS) {
                monthlyData[m].cogs += cost;
                totalCogs += cost;
                projFinancials[proj].cogs += cost;
            }
            if (isPersonnel) {
                monthlyData[m].personnel += cost;
                projectHeatmapData[proj].personnel += cost;
            }
            if (isAssociated) {
                monthlyData[m].associated += cost;
                projectHeatmapData[proj].associated += cost;
            }
        }
    });

    const months = Object.keys(monthlyData).sort();
    const mLabels = months.map(m => new Date(m+"-01").toLocaleString('default', {month:'short', year:'2-digit'}));

    const initChart = (id) => {
        const dom = document.getElementById(id);
        const existing = echarts.getInstanceByDom(dom);
        if (existing) existing.dispose();
        return echarts.init(dom);
    };

    const dropPinMarker = {
        symbol: 'pin', symbolSize: 45,
        label: { color: '#fff', fontSize: 10, formatter: (p) => '$' + (p.value/1000).toFixed(0) + 'k' },
        data: [{ type: 'max', name: 'Max' }, { type: 'min', name: 'Min' }]
    };

    // --- 1. SMOOTH LINE CHART ---
    const lineChart = initChart('vis-line-chart');
    lineChart.setOption({
        color: [themeColors[0], themeColors[2]],
        tooltip: { trigger: 'axis' },
        legend: { data: ['Personnel Costs', 'Associated Costs'], textStyle: { color: textColor, fontWeight: 'bold' }, top: '0%' },
        grid: { left: '6%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: mLabels, axisLine: { lineStyle: { color: textColor } }, axisLabel: { color: textColor } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor, formatter: (v) => '$' + v/1000 + 'k' } },
        series: [
            { name: 'Personnel Costs', type: 'line', smooth: true, data: months.map(m => monthlyData[m].personnel), markPoint: dropPinMarker, lineStyle: { width: 3 } },
            { name: 'Associated Costs', type: 'line', smooth: true, data: months.map(m => monthlyData[m].associated), markPoint: dropPinMarker, lineStyle: { width: 3 } }
        ]
    });

    // --- 2. BAR CHART ---
    const barChart = initChart('vis-bar-chart');
    barChart.setOption({
        color: [themeColors[1], themeColors[3]],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['Revenue', 'COGS'], textStyle: { color: textColor, fontWeight: 'bold' }, top: '0%' },
        grid: { left: '6%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: mLabels, axisLine: { lineStyle: { color: textColor } }, axisLabel: { color: textColor } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor, formatter: (v) => '$' + v/1000 + 'k' } },
        series: [
            { name: 'Revenue', type: 'bar', data: months.map(m => monthlyData[m].rev), markPoint: dropPinMarker, itemStyle: { borderRadius: [4, 4, 0, 0] } },
            { name: 'COGS', type: 'bar', data: months.map(m => monthlyData[m].cogs), markPoint: dropPinMarker, itemStyle: { borderRadius: [4, 4, 0, 0] } }
        ]
    });

    // --- 3. PIE CHART ---
    const pieChart = initChart('vis-pie-chart');
    pieChart.setOption({
        color: [themeColors[1], themeColors[0]],
        tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
        legend: { bottom: '0%', textStyle: { color: textColor, fontWeight: 'bold' } },
        series: [{
            type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
            itemStyle: { borderRadius: 5, borderColor: isDark ? '#0f172a' : '#fff', borderWidth: 2 },
            data: [ { value: totalRev, name: 'Revenue' }, { value: totalCogs, name: 'COGS' } ],
            label: { color: textColor }
        }]
    });

    // --- 4. SCATTER PLOT ---
    const scatterData = [];
    Object.keys(projFinancials).forEach(p => {
        const rev = projFinancials[p].rev;
        const cogs = projFinancials[p].cogs;
        if (rev > 0 && cogs > 0) {
            const margin = ((rev - cogs) / rev) * 100;
            const size = Math.max(15, Math.min(60, (cogs / totalCogs) * 200));
            scatterData.push([margin, cogs, p, size]);
        }
    });

    const scatterChart = initChart('vis-scatter-chart');
    scatterChart.setOption({
        color: [themeColors[2]],
        tooltip: { formatter: (p) => `<strong>${p.data[2]}</strong><br>Gross Margin: ${p.data[0].toFixed(1)}%<br>COGS: $${p.data[1].toLocaleString()}` },
        grid: { left: '15%', right: '10%', bottom: '15%', top: '15%', containLabel: false },
        xAxis: { type: 'value', name: 'Margin %', nameTextStyle: { color: textColor }, axisLine: { lineStyle: { color: textColor } }, axisLabel: { color: textColor, formatter: '{value}%' }, splitLine: { show: false } },
        yAxis: { type: 'value', name: 'COGS', nameTextStyle: { color: textColor }, axisLine: { lineStyle: { color: textColor } }, splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor, formatter: (v) => '$' + v/1000 + 'k' } },
        series: [{
            type: 'scatter', data: scatterData, symbolSize: (data) => data[3], 
            itemStyle: { opacity: 0.8, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' }
        }]
    });

    // --- FIX 2: HEATMAP COLOR LOGIC ---
    let maxHeatmapVal = 0;
    const treemapData = Object.keys(projectHeatmapData).map(proj => {
        const val = projectHeatmapData[proj][heatmapMetric];
        if (val > maxHeatmapVal) maxHeatmapVal = val; // Find the highest value to set the Red threshold
        return { name: proj, value: val };
    }).filter(item => item.value > 0);

    const heatmapChart = initChart('vis-treemap-chart');
    heatmapChart.setOption({
        tooltip: { formatter: (info) => `<strong>${info.name}</strong><br/>${heatmapMetric === 'personnel' ? 'Personnel' : 'Associated'} Cost: $${info.value.toLocaleString(undefined, {maximumFractionDigits:0})}` },
        // VisualMap forces ECharts to color code strictly by value!
        visualMap: {
            type: 'continuous',
            min: 0,
            max: maxHeatmapVal,
            inRange: {
                color: ['#10b981', '#F4C145', '#F28F43', '#E35B5B'] // Green -> Yellow -> Orange -> RED (Highest)
            },
            show: false // Hides the color bar legend to keep the UI clean
        },
        series: [{
            type: 'treemap',
            data: treemapData,
            roam: false,
            label: { show: true, formatter: (params) => `${params.name}\n$${(params.value/1000).toFixed(1)}k`, color: '#fff', fontWeight: 'bold' },
            itemStyle: { borderColor: isDark ? '#0f172a' : '#fff', borderWidth: 2, gapWidth: 2 }
        }]
    });

    // --- FIX 3: DYNAMIC EXECUTIVE SUMMARY ---
    const insightsBox = document.getElementById('vis-insights');
    if (months.length >= 2) {
        const lastM = months[months.length - 1];
        const prevM = months[months.length - 2];
        const lastMargin = monthlyData[lastM].rev > 0 ? ((monthlyData[lastM].rev - monthlyData[lastM].cogs) / monthlyData[lastM].rev) * 100 : 0;
        const prevMargin = monthlyData[prevM].rev > 0 ? ((monthlyData[prevM].rev - monthlyData[prevM].cogs) / monthlyData[prevM].rev) * 100 : 0;
        const marginDelta = lastMargin - prevMargin;

        const trendIcon = marginDelta >= 0 ? '<i class="fas fa-arrow-trend-up text-emerald-500"></i>' : '<i class="fas fa-arrow-trend-down text-rose-500"></i>';

        // Find the top project pushing the heatmap metrics
        let topProj = 'None';
        let topVal = 0;
        treemapData.forEach(d => { if (d.value > topVal) { topVal = d.value; topProj = d.name; } });

        const marginAlertClass = marginDelta >= 0 ? "text-emerald-500" : "text-rose-500";
        
        insightsBox.innerHTML = `
            <p>${trendIcon} <strong>Margin Trajectory:</strong> Gross margin moved by <strong class="${marginAlertClass}">${marginDelta > 0 ? '+' : ''}${marginDelta.toFixed(1)}%</strong> from the previous month, currently sitting at <strong>${lastMargin.toFixed(1)}%</strong>.</p>
            <p><i class="fas fa-exclamation-triangle text-amber-500"></i> <strong>Overhead Alert:</strong> <strong>${topProj}</strong> is currently driving the highest <strong>${heatmapMetric}</strong> costs at <strong>$${(topVal/1000).toFixed(1)}k</strong>.</p>
            <p><i class="fas fa-chart-pie text-blue-500"></i> <strong>Cost Ratio:</strong> Across the selected period, direct COGS consumed <strong>${totalRev > 0 ? ((totalCogs/totalRev)*100).toFixed(1) : 0}%</strong> of total recognized revenue.</p>
        `;
    } else {
        insightsBox.innerHTML = `<p class="text-slate-500 italic">Awaiting additional chronological data to generate MoM trend insights. Ensure your Date Range includes at least two months.</p>`;
    }

    window.addEventListener('resize', () => {
        lineChart.resize(); barChart.resize(); pieChart.resize(); scatterChart.resize(); heatmapChart.resize();
    });
}

// ----------------------------------------------------
// VIEW 5: SIMULATION
// ----------------------------------------------------

window.runSimulation = function() {
    const revInput = document.getElementById('sim-rev');
    if (!revInput) return; 

    // 1. Get Live Actuals from Filtered Data
    let actRev = 0, actCogs = 0, actOpex = 0;
    const costField = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';

    (filteredData || []).forEach(row => {
        const cost = parseFloat(row[costField] || row.cost || 0);
        const h1 = (row.Header1 || row.header1 || '').toLowerCase();
        const h2 = (row.Header2 || row.header2 || '').toLowerCase();
        
        // --- CRITICAL FIX: ISOLATE COUNTS FROM CURRENCY ---
        if (h1.includes('headcount') || h1.includes('volume') || h2.includes('headcount')) return;

        // 1st: Revenue
        if (h1.includes('revenue')) {
            actRev += Math.abs(cost);
        } 
        // 2nd: Associated Costs (Strictly relying on Header text now!)
        else if (h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) {
            actOpex += cost;
        } 
        // 3rd: Direct COGS
        else if (h1.includes('cost of goods') || h1.includes('cogs')) {
            actCogs += cost;
        }
    });

    const actProfit = actRev - actCogs - actOpex;
    const actMargin = actRev > 0 ? (actProfit / actRev) * 100 : 0;

    // 2. Read Scenario Sliders
    const revMod = parseFloat(revInput.value) / 100;
    const cogsMod = parseFloat(document.getElementById('sim-cogs').value) / 100;
    const hcMod = parseFloat(document.getElementById('sim-hc').value) / 100;
    const opexMod = parseFloat(document.getElementById('sim-opex').value) / 100;

    const setElemText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    setElemText('sim-rev-val', (revMod > 0 ? '+' : '') + (revMod*100).toFixed(0) + '%');
    setElemText('sim-cogs-val', (cogsMod > 0 ? '+' : '') + (cogsMod*100).toFixed(0) + '%');
    setElemText('sim-hc-val', (hcMod > 0 ? '+' : '') + (hcMod*100).toFixed(0) + '%');
    setElemText('sim-opex-val', (opexMod > 0 ? '+' : '') + (opexMod*100).toFixed(0) + '%');

    // 3. Calculate Projections
    // NOTE: Headcount changes affect BOTH Revenue (more billable hours) and COGS (more wages)
    const projRev = actRev * (1 + revMod) * (1 + hcMod); 
    const projCogs = actCogs * (1 + cogsMod) * (1 + hcMod);
    const projOpex = actOpex * (1 + opexMod); // Opex rarely scales perfectly with HC, treating as independent step

    const projProfit = projRev - projCogs - projOpex;
    const projMargin = projRev > 0 ? (projProfit / projRev) * 100 : 0;

    const marginDiff = projMargin - actMargin;
    const profitDiff = projProfit - actProfit;

    // 4. Update UI Results
    setElemText('sim-res-margin', projMargin.toFixed(1) + '%');
    const mDiffEl = document.getElementById('sim-res-margin-diff');
    mDiffEl.textContent = (marginDiff >= 0 ? '+' : '') + marginDiff.toFixed(1) + '%';
    mDiffEl.className = `text-sm font-bold ${marginDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    
    setElemText('sim-res-profit', '$' + projProfit.toLocaleString(undefined, {maximumFractionDigits:0}));
    const pDiffEl = document.getElementById('sim-res-profit-diff');
    pDiffEl.textContent = (profitDiff >= 0 ? '+$' : '-$') + Math.abs(profitDiff).toLocaleString(undefined, {maximumFractionDigits:0});
    pDiffEl.className = `text-sm font-bold ${profitDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;

    // 5. Generate Dynamic CFO Insights
    const insightBox = document.getElementById('sim-insights');
    if (actRev === 0) {
        insightBox.innerHTML = "<span class='text-rose-500 font-bold'>Error: Your current filters have $0 Revenue.</span> Adjust the 'Data Configurations' on the left to include a Project/Mapping that generates revenue to run a scenario.";
    } else {
        let text = `Based on current actuals, this project generates a <strong>${actMargin.toFixed(1)}%</strong> margin. `;
        
        if (marginDiff < 0) {
            text += `Under this scenario, margin compresses by <strong class="text-rose-600">${Math.abs(marginDiff).toFixed(1)}%</strong>, destroying <strong class="text-rose-600">$${Math.abs(profitDiff).toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in profit. `;
            if (cogsMod > 0 && revMod <= 0) text += `<br><strong>Recommendation:</strong> You are absorbing a wage/cost increase without passing it to the client. We must negotiate a yield increase to defend our EBITDA.`;
            else if (opexMod > 0) text += `<br><strong>Recommendation:</strong> Administrative bloat is threatening profitability. Institute a hiring freeze on indirect personnel.`;
        } else if (marginDiff > 0) {
            text += `This is a highly accretive scenario. Margin expands by <strong class="text-emerald-600">${marginDiff.toFixed(1)}%</strong>, generating <strong class="text-emerald-600">$${profitDiff.toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in additional profit. `;
            if (revMod > 0) text += `Pricing optimizations are successfully flowing straight to the bottom line.`;
            else if (cogsMod < 0 || opexMod < 0) text += `Cost efficiency initiatives are yielding significant returns.`;
        } else {
            text += `The adjustments mathematically offset, resulting in a flat margin impact.`;
        }
        insightBox.innerHTML = text;
    }

    // 6. ECharts Waterfall Logic (Calculates the "Bridge")
    // A waterfall uses a hidden "Help" bar to float the positive/negative impacts.
    const helpData = [], posData = [], negData = [];
    let currentLevel = actProfit;

    // Step 0: Base Actual Profit
    helpData.push(0); 
    posData.push(actProfit >= 0 ? actProfit : 0); 
    negData.push(actProfit < 0 ? Math.abs(actProfit) : 0);

    const steps = [
        { name: 'Revenue/Vol Impact', val: projRev - actRev },
        { name: 'COGS Impact', val: -(projCogs - actCogs) }, // Cost increase = negative impact
        { name: 'Overhead Impact', val: -(projOpex - actOpex) }
    ];

    steps.forEach(step => {
        if (step.val >= 0) {
            helpData.push(currentLevel); posData.push(step.val); negData.push(0);
        } else {
            currentLevel += step.val;
            helpData.push(currentLevel); posData.push(0); negData.push(Math.abs(step.val));
        }
        if (step.val >= 0) currentLevel += step.val; // Add after pushing if positive
    });

    // Final Step: Projected Profit
    helpData.push(0);
    posData.push(currentLevel >= 0 ? currentLevel : 0);
    negData.push(currentLevel < 0 ? Math.abs(currentLevel) : 0);

    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark-theme-variables');
    const textColor = isDark ? '#cbd5e1' : '#475569'; 
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const dom = document.getElementById('sim-waterfall-chart');
    if (!dom) return;
    let chart = echarts.getInstanceByDom(dom);
    if (chart) chart.dispose();
    chart = echarts.init(dom);

    chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (params) {
            let tar = params[1].value !== 0 ? params[1] : params[2];
            let prefix = tar.seriesName === 'Positive' ? '+' : '-';
            if (params[0].name === 'Base Actuals' || params[0].name === 'Proj Profit') prefix = '';
            return `<strong>${tar.name}</strong><br/>${prefix}$${tar.value.toLocaleString(undefined, {maximumFractionDigits:0})}`;
        }},
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['Base Actuals', 'Rev/Vol Impact', 'COGS Impact', 'Overhead Impact', 'Proj Profit'], axisLine: { lineStyle: { color: textColor } }, axisLabel: { color: textColor, fontWeight: 'bold' } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: gridColor } }, axisLabel: { color: textColor, formatter: (v) => '$' + v/1000 + 'k' } },
        series: [
            { name: 'Help', type: 'bar', stack: 'Total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, data: helpData }, // Invisible floating pillar
            { name: 'Positive', type: 'bar', stack: 'Total', label: { show: true, position: 'top', formatter: (p) => p.value > 0 ? '+$'+(p.value/1000).toFixed(0)+'k' : '' }, itemStyle: { color: '#10b981', borderRadius: 4 }, data: posData },
            { name: 'Negative', type: 'bar', stack: 'Total', label: { show: true, position: 'bottom', formatter: (p) => p.value > 0 ? '-$'+(p.value/1000).toFixed(0)+'k' : '' }, itemStyle: { color: '#f43f5e', borderRadius: 4 }, data: negData }
        ]
    });

    window.addEventListener('resize', () => chart.resize());
};

window.resetSimulation = function() {
    const revInput = document.getElementById('sim-rev');
    if (!revInput) return;
    
    revInput.value = 0;
    document.getElementById('sim-cogs').value = 0;
    document.getElementById('sim-hc').value = 0;
    document.getElementById('sim-opex').value = 0;
    runSimulation();
};

// ----------------------------------------------------
// UTILITIES: CHARTS, EXPORT, SECURE IMPORT
// ----------------------------------------------------
function renderChart(canvasId, type, labels, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return; 

    if(charts[canvasId]) charts[canvasId].destroy();
    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    
    // Support multi-colors for Pie Charts
    const bgColors = type === 'pie' || type === 'doughnut' 
        ? ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'] 
        : (type === 'line' ? 'transparent' : '#10b981');

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: bgColors,
                borderColor: type === 'pie' ? (isDark ? '#0f172a' : '#ffffff') : '#10b981',
                borderWidth: type === 'pie' ? 3 : 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                // Show legend only for Pie/Doughnut charts
                legend: { 
                    display: type === 'pie' || type === 'doughnut',
                    position: 'right',
                    labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, padding: 20 }
                } 
            },
            // Hide grid lines for Pie/Doughnut charts
            scales: type === 'pie' || type === 'doughnut' ? {} : {
                y: { grid: { color: isDark ? '#334155' : '#e2e8f0' }, ticks: { color: isDark ? '#cbd5e1' : '#475569' } },
                x: { grid: { display: false }, ticks: { color: isDark ? '#cbd5e1' : '#475569' } }
            }
        }
    });
}

const HC_EXPORT_HEADERS = [
    { id: 'dated', label: 'Dated' },
    { id: 'empid', label: 'EmpID' },
    { id: 'empname', label: 'EmpName' },
    { id: 'groupname', label: 'GroupName' },
    { id: 'headcount', label: 'Headcount' },
    { id: 'position', label: 'Position' },
    { id: 'plm_project_name', label: 'PLM Project Name' },
    { id: 'cost_pct', label: 'Cost %' },
    { id: 'cost', label: 'Cost' },
    { id: 'dept_based_on_summary', label: 'Dept based on summary' }
];

window.toggleExportDataset = function() {
    const dataset = document.getElementById('export-dataset').value;
    const hcOptionsBox = document.getElementById('export-hc-options');
    const container = document.getElementById('export-checkboxes');
    container.innerHTML = '';

    if (dataset === 'financial') {
        hcOptionsBox.classList.replace('flex', 'hidden'); 
        FIN_HEADERS.forEach(header => {
            const isChecked = ['Dated', 'Project', 'Entity', 'Header1', 'Cost'].includes(header) ? 'checked' : '';
            container.innerHTML += `
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                    <input type="checkbox" value="${header}" class="export-col-cb text-blue-600 focus:ring-blue-500" ${isChecked}>
                    <span class="truncate">${header}</span>
                </label>
            `;
        });
    } else {
        hcOptionsBox.classList.replace('hidden', 'flex'); 
        HC_EXPORT_HEADERS.forEach(col => {
            container.innerHTML += `
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                    <input type="checkbox" value="${col.id}" data-label="${col.label}" class="export-col-cb text-blue-600 focus:ring-blue-500" checked>
                    <span class="truncate">${col.label}</span>
                </label>
            `;
        });
    }
};

window.populateExportCheckboxes = window.toggleExportDataset;

window.executeCustomExport = function() {
    const dataset = document.getElementById('export-dataset').value;
    const checkboxes = document.querySelectorAll('.export-col-cb:checked');
    const start = document.getElementById('export-start').value;
    const end = document.getElementById('export-end').value;
    
    if (checkboxes.length === 0) {
        Swal.fire({ icon: 'error', title: 'Action Required', text: 'Select at least one column to export.' });
        return;
    }

    if (!start || !end) {
        Swal.fire({ icon: 'error', title: 'Missing Data', text: 'Please select a Start and End month to define the export range.' });
        return;
    }

    if (dataset === 'financial') {
        // --- ROUTE 1: FINANCIAL EXPORT (WITH CUSTOM DATE FILTER) ---
        const selectedHeaders = Array.from(checkboxes).map(cb => cb.value);
        let csvContent = selectedHeaders.join(",") + "\n";
        
        // Filter the base data (which has sidebar filters applied) by the newly selected dates
        const customDateData = (window.baseFilteredData || []).filter(row => {
            const rowDate = row.Dated || row.dated || '';
            let rowMonth = '';
            if (rowDate) {
                const d = new Date(rowDate);
                if (!isNaN(d.getTime())) {
                    rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                } else {
                    rowMonth = String(rowDate).substring(0, 7); 
                }
            }
            return rowMonth >= start && rowMonth <= end;
        });

        if (customDateData.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Data Found', text: 'No financial records match the selected date range and sidebar filters.' });
            return;
        }

        customDateData.forEach(row => {
            let rowData = selectedHeaders.map(header => {
                let val = String(row[header] || row[header.toLowerCase()] || '');
                return val.includes(',') ? `"${val}"` : val;
            });
            csvContent += rowData.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Financial_P&L_${start}_to_${end}.csv`; // Dynamic filename!
        link.click();
        
        document.getElementById('export-modal').classList.add('hidden');

    } else {
        // --- ROUTE 2: SECURE HEADCOUNT EXPORT ---
        const selectedColsArray = Array.from(checkboxes).map(cb => cb.value);

        if (selectedColsArray.includes('cost') || selectedColsArray.includes('cost_pct')) {
            Swal.fire({
                title: 'Privacy Restriction Active',
                html: "The <b>Cost</b> and <b>Cost %</b> columns contain highly sensitive data.<br><br>Please seek authorization to perform this extraction:",
                input: 'password',
                inputPlaceholder: 'Enter master extraction key...',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6', 
                cancelButtonColor: '#f43f5e', 
                confirmButtonText: 'Authorize Export',
                preConfirm: (password) => {
                    if (password !== "FP&A2026!") {
                        Swal.showValidationMessage('⛔ Export Blocked: Incorrect Master Password.');
                    }
                    return password;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    processHeadcountExportForm(checkboxes, start, end);
                }
            });
        } else {
            processHeadcountExportForm(checkboxes, start, end);
        }
    }
};

// Helper function
function processHeadcountExportForm(checkboxes, start, end) {
    const selectedCols = Array.from(checkboxes).map(cb => cb.value).join(',');
    const selectedLabels = Array.from(checkboxes).map(cb => cb.getAttribute('data-label')).join(',');
    const filename = document.getElementById('export-filename').value;
    const password = document.getElementById('export-password').value;
    
    if (!password) {
        Swal.fire({ icon: 'error', title: 'Authentication Required', text: 'Please enter the Manager Password for this dataset.' });
        return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'financial_headcount_api.php';
    form.target = '_blank'; 

    const params = { cols: selectedCols, labels: selectedLabels, start: start, end: end, filename: filename, password: password };
    for (const key in params) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
    }
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    document.getElementById('export-modal').classList.add('hidden');
    document.getElementById('export-password').value = ''; 
}

window.processSecureImport = async function(btn) {
    const password = document.getElementById('import-password')?.value;
    const fileInput = document.getElementById('import-file');
    const datasetTarget = document.getElementById('import-dataset').value;
    const modeObj = document.querySelector('input[name="import_mode"]:checked');
    const mode = modeObj ? modeObj.value : 'append';

    if (!password) return alert("Admin password is required.");
    if (!fileInput || fileInput.files.length === 0) return alert("Please select at least one file to import.");

    const originalText = btn.innerHTML;
    btn.disabled = true;

    let successCount = 0;
    let errorMessages = [];

    // Process files ONE AT A TIME sequentially
    for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        btn.innerHTML = `<span class="material-icons-sharp animate-spin text-sm mr-2">sync</span> Processing ${i + 1} of ${fileInput.files.length}...`;

        const formData = new FormData();
        formData.append('password', password);
        formData.append('file', file);
        formData.append('mode', mode);
        formData.append('dataset', datasetTarget); // Tells PHP which table to use

        try {
            const response = await fetch('financial_import_api.php', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                successCount++;
            } else {
                errorMessages.push(`${file.name}: ${data.message}`);
            }
        } catch (err) {
            console.error(err);
            errorMessages.push(`${file.name}: Network or server error.`);
        }
    }

    // Reset UI and show final results
    btn.innerHTML = originalText;
    btn.disabled = false;

    if (errorMessages.length === 0) {
        alert(`✅ Successfully imported ${successCount} file(s)!`);
        document.getElementById('secure-import-modal').classList.add('hidden');
        document.getElementById('import-password').value = '';
        document.getElementById('import-file').value = '';
        if (datasetTarget === 'financial') initFinancialDashboard(); // Only reload UI if we updated the main ledger
    } else {
        alert(`Import complete with errors:\n\n${errorMessages.join('\n')}\n\nSuccessfully imported: ${successCount}`);
    }
};

window.toggleAiChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
        // Tiny delay to allow display:block to apply before animating opacity/scale
        setTimeout(() => {
            chatWindow.classList.remove('scale-95', 'opacity-0');
            chatWindow.classList.add('scale-100', 'opacity-100');
        }, 10);
    } else {
        chatWindow.classList.remove('scale-100', 'opacity-100');
        chatWindow.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            chatWindow.classList.add('hidden');
        }, 300); // Wait for transition to finish
    }
};

// ====================================================
// FLOATING AI CHATBOT ENGINE (LOCAL ANALYTICS)
// ====================================================

window.toggleAiChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
        setTimeout(() => {
            chatWindow.classList.remove('scale-95', 'opacity-0');
            chatWindow.classList.add('scale-100', 'opacity-100');
        }, 10);
    } else {
        chatWindow.classList.remove('scale-100', 'opacity-100');
        chatWindow.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { chatWindow.classList.add('hidden'); }, 300); 
    }
};

window.sendAiMessage = function(actionId = null, buttonText = null) {
    const inputEl = document.getElementById('ai-chat-input');
    // If user clicked a button, use the buttonText. Otherwise, use what they typed.
    const message = buttonText || inputEl.value.trim(); 
    if (!message) return;

    const historyBox = document.getElementById('ai-chat-history');

    // 1. Append User Message
    const userHtml = `
        <div class="flex gap-2 justify-end animate-fade-in">
            <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-sm shadow-sm max-w-[85%]">
                ${message}
            </div>
            <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-1">
                <span class="material-icons-sharp text-[12px]">person</span>
            </div>
        </div>
    `;
    historyBox.innerHTML += userHtml;
    inputEl.value = ''; 
    historyBox.scrollTop = historyBox.scrollHeight; 

    // 2. Append "AI is calculating..." indicator
    const typingId = 'typing-' + Date.now();
    const typingHtml = `
        <div id="${typingId}" class="flex gap-2 animate-fade-in">
            <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-1">
                <span class="material-icons-sharp text-[12px]">smart_toy</span>
            </div>
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-sm text-slate-500 dark:text-slate-400 shadow-sm flex items-center gap-2 font-medium">
                <span class="material-icons-sharp text-[14px] animate-spin">sync</span> Crunching numbers...
            </div>
        </div>
    `;
    historyBox.innerHTML += typingHtml;
    historyBox.scrollTop = historyBox.scrollHeight;

    // 3. Simulate Calculation Delay & Send Dynamic Response
    setTimeout(() => {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        // Calculate the answer based on the local dataset!
        const responseText = calculateAiResponse(actionId, message);

        const aiHtml = `
            <div class="flex gap-2 animate-fade-in">
                <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0 flex items-center justify-center text-blue-600 dark:text-blue-400 mt-1">
                    <span class="material-icons-sharp text-[12px]">smart_toy</span>
                </div>
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 shadow-sm max-w-[85%] leading-relaxed">
                    ${responseText}
                </div>
            </div>
        `;
        historyBox.innerHTML += aiHtml;
        historyBox.scrollTop = historyBox.scrollHeight;

    }, 800); 
};

// --- THE LOCAL AI LOGIC ENGINE ---
function calculateAiResponse(actionId, rawMessage) {
    if (!filteredData || filteredData.length === 0) {
        return "I cannot perform that calculation because there is no data currently loaded. Please adjust your dashboard filters.";
    }

    const costField = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';

    // 1. GROSS MARGIN
    if (actionId === 'q_margin' || rawMessage.toLowerCase().includes('margin')) {
        let rev = 0, cogs = 0;
        filteredData.forEach(r => {
            const h1 = (r.Header1 || '').toLowerCase();
            const cost = parseFloat(r[costField] || r.cost || 0);
            if (h1.includes('headcount') || h1.includes('volume')) return;
            if (h1.includes('revenue')) rev += Math.abs(cost);
            else if (h1.includes('cost of goods') || h1.includes('cogs')) cogs += cost;
        });
        const margin = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;
        return `Based on your current filters, your overall Gross Margin is <strong class="text-blue-600 dark:text-blue-400 text-base">${margin.toFixed(1)}%</strong>. <br><br>This is derived from <strong>$${rev.toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in Revenue against <strong>$${cogs.toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in direct COGS.`;
    }

    // 2. HIGHEST COGS PROJECT
    if (actionId === 'q_cogs') {
        let projCogs = {};
        filteredData.forEach(r => {
            const h1 = (r.Header1 || '').toLowerCase();
            const proj = r.Project || 'Uncategorized';
            const cost = parseFloat(r[costField] || r.cost || 0);
            if (!h1.includes('headcount') && !h1.includes('volume') && (h1.includes('cogs') || h1.includes('cost of goods'))) {
                projCogs[proj] = (projCogs[proj] || 0) + cost;
            }
        });
        const topProj = Object.keys(projCogs).reduce((a, b) => projCogs[a] > projCogs[b] ? a : b, '');
        if (!topProj) return "I couldn't find any direct labor/COGS data in the current selection.";
        return `The project driving the highest direct labor (COGS) is <strong class="text-rose-600 dark:text-rose-400">${topProj}</strong>, accumulating <strong>$${projCogs[topProj].toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in costs.`;
    }

    // 3. NET LOSS PROJECTS
    if (actionId === 'q_loss') {
        let projPnl = {};
        filteredData.forEach(r => {
            const h1 = (r.Header1 || '').toLowerCase();
            const h2 = (r.Header2 || '').toLowerCase();
            const proj = r.Project || 'Uncategorized';
            const cost = parseFloat(r[costField] || r.cost || 0);

            if (h1.includes('headcount') || h1.includes('volume')) return;
            if (!projPnl[proj]) projPnl[proj] = { rev: 0, cost: 0 };

            if (h1.includes('revenue')) projPnl[proj].rev += Math.abs(cost);
            else if (h1.includes('cogs') || h1.includes('cost of goods') || h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) {
                projPnl[proj].cost += cost;
            }
        });
        
        let losers = Object.keys(projPnl).filter(p => (projPnl[p].rev - projPnl[p].cost) < 0 && projPnl[p].cost > 0);
        if (losers.length === 0) return "✅ <strong>Great news!</strong> No projects are currently operating at a net loss based on your active filters.";
        return `⚠️ I found <strong>${losers.length}</strong> project(s) currently operating at a net loss:<br><br><span class="text-rose-600 dark:text-rose-400 font-bold">${losers.join(', ')}</span>`;
    }

    // 4. REV PER HEADCOUNT
    if (actionId === 'q_revhc') {
        let rev = 0, hc = 0;
        let months = new Set();
        filteredData.forEach(r => {
            const h1 = (r.Header1 || '').toLowerCase();
            const cost = parseFloat(r[costField] || r.cost || 0);
            const d = r.Dated || r.dated;
            if (d) months.add(d.substring(0, 7));

            if (h1.includes('revenue')) rev += Math.abs(cost);
            if (h1.includes('headcount')) hc += cost;
        });
        const avgHc = hc / (months.size || 1);
        const revPerHc = avgHc > 0 ? rev / avgHc : 0;
        return `Across the selected timeframe, you have generated <strong>$${rev.toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in revenue supported by an average of <strong>${avgHc.toFixed(1)}</strong> headcount.<br><br>This equates to <strong class="text-emerald-600 dark:text-emerald-400 text-base">$${revPerHc.toLocaleString(undefined, {maximumFractionDigits:0})}</strong> in revenue per head.`;
    }

    // 5. HIGHEST OVERHEAD ENTITY
    if (actionId === 'q_overhead') {
        let entOpex = {};
        filteredData.forEach(r => {
            const h1 = (r.Header1 || '').toLowerCase();
            const h2 = (r.Header2 || '').toLowerCase();
            const ent = r.Entity || 'Uncategorized';
            const cost = parseFloat(r[costField] || r.cost || 0);

            if (!h1.includes('headcount') && !h1.includes('volume')) {
                if (h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) {
                    entOpex[ent] = (entOpex[ent] || 0) + cost;
                }
            }
        });
        const topEnt = Object.keys(entOpex).reduce((a, b) => entOpex[a] > entOpex[b] ? a : b, '');
        if (!topEnt) return "I couldn't find any associated overhead data in your current selection.";
        return `The entity carrying the heaviest overhead/associated cost burden is <strong class="text-amber-600 dark:text-amber-400">${topEnt}</strong> at <strong>$${entOpex[topEnt].toLocaleString(undefined, {maximumFractionDigits:0})}</strong>.`;
    }

    // FALLBACK FOR TYPED MESSAGES
    return "Since my cloud integration is offline, I am currently running strictly as a local analytical engine. Please click one of the predefined chips below so I can scan your dashboard data!";
}

window.openFullscreenTable = function(tableContainerId, titleText) {
    let modal = document.getElementById('fs-modal-overlay');
    if (!modal) {
        const modalHtml = `
            <div id="fs-modal-overlay" class="fixed inset-0 z-[600] hidden bg-slate-900/95 backdrop-blur-sm p-4 md:p-8 flex-col transition-opacity duration-300 opacity-0">
                <div class="flex justify-between items-center mb-4 text-white">
                    <h2 id="fs-modal-title" class="text-2xl font-black flex items-center gap-2">
                        <span class="material-icons-sharp text-blue-500">fullscreen</span> 
                        <span>Expanded View</span>
                    </h2>
                    <button onclick="closeFullscreenTable()" class="w-12 h-12 bg-slate-800 hover:bg-rose-500 rounded-full flex items-center justify-center transition-colors shadow-lg">
                        <span class="material-icons-sharp">close</span>
                    </button>
                </div>
                <div id="fs-modal-body" class="flex-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col">
                    </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('fs-modal-overlay');
    }

    const targetDiv = document.getElementById(tableContainerId);
    const modalBody = document.getElementById('fs-modal-body');
    
    window.fsOriginalParent = targetDiv.parentElement;
    window.fsOriginalNode = targetDiv;
    
    document.querySelector('#fs-modal-title span:last-child').textContent = titleText;
    
    modalBody.appendChild(targetDiv);
    targetDiv.classList.add('flex-1', 'rounded-2xl');
    
    // --- CRITICAL FIX: STRIP HARDCODED HEIGHT LIMITS FOR FULLSCREEN ---
    targetDiv.style.maxHeight = 'none';
    targetDiv.style.height = '100%';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
};

window.closeFullscreenTable = function() {
    const modal = document.getElementById('fs-modal-overlay');
    
    if (window.fsOriginalParent && window.fsOriginalNode) {
        window.fsOriginalNode.classList.remove('flex-1', 'rounded-2xl');
        
        // --- RESTORE ORIGINAL CSS HANDLING ---
        window.fsOriginalNode.style.maxHeight = '';
        window.fsOriginalNode.style.height = '';
        
        window.fsOriginalParent.appendChild(window.fsOriginalNode);
    }
    
    modal.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.generateExecutivePPT = async function() {
    if (!filteredData || filteredData.length === 0) return;

    const btn = event.currentTarget;
    btn.innerHTML = `<i class="fas fa-sync-alt animate-spin"></i> Generating...`;

    // 1. Setup Data (Same logic as Briefing Modal)
    const costField = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';
    let globalRev = 0, globalCogs = 0, globalOpex = 0;
    let buData = {};

    filteredData.forEach(row => {
        const cost = parseFloat(row[costField] || row.cost || 0);
        const h1 = (row.Header1 || '').toLowerCase();
        const h2 = (row.Header2 || '').toLowerCase();
        const proj = row.Project || 'Uncategorized';
        if (h1.includes('headcount') || h1.includes('volume')) return;
        if (!buData[proj]) buData[proj] = { rev: 0, cogs: 0, opex: 0 };
        if (h1.includes('revenue')) { globalRev += Math.abs(cost); buData[proj].rev += Math.abs(cost); } 
        else if (h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) { globalOpex += cost; buData[proj].opex += cost; } 
        else if (h1.includes('cogs') || h1.includes('cost of goods')) { globalCogs += cost; buData[proj].cogs += cost; }
    });

    const globalGrossProfit = globalRev - globalCogs;
    const globalOpProfit = globalRev - globalCogs - globalOpex;
    const globalNetMargin = globalRev > 0 ? (globalOpProfit / globalRev) * 100 : 0;

    // 2. Initialize PPTX
    let pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const theme = { bg: '0F172A', indigo: '4F46E5', green: '10B981', red: 'F43F5E', text: 'FFFFFF', gray: '94A3B8' };

    // --- SLIDE 1: TITLE ---
    let s1 = pptx.addSlide();
    s1.background = { color: theme.bg };
    s1.addText("EXECUTIVE PERFORMANCE BRIEFING", { x: 0.5, y: 2.2, w: 9, h: 1, fontSize: 44, color: theme.green, bold: true });
    s1.addText(`Financial Cycle Review | Generated: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 3.2, w: 9, h: 0.5, fontSize: 18, color: theme.text });

    // --- SLIDE 2: PORTFOLIO NARRATIVE ---
    let s2 = pptx.addSlide();
    s2.background = { color: theme.bg };
    s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.5, fill: { color: theme.indigo } });
    s2.addText("PORTFOLIO STRATEGIC VIEW", { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 28, color: theme.text, bold: true });
    
    const narrativeText = document.getElementById('brief-portfolio-summary').innerText;
    s2.addText(narrativeText, { x: 0.5, y: 2.5, w: 9, h: 3, fontSize: 20, color: theme.text, lineSpacing: 28 });

    // --- SLIDES 3+: BU CARDS ---
    const topProjects = Object.keys(buData).sort((a, b) => buData[b].rev - buData[a].rev).slice(0, 5);
    
    // NEW: Smart PPT Formatter
    const formatCurrency = (val) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) return (val < 0 ? '-$' : '$') + (absVal / 1000000).toFixed(2) + 'M';
        return (val < 0 ? '-$' : '$') + Math.round(absVal).toLocaleString();
    };

    topProjects.forEach(proj => {
        const d = buData[proj];
        const grossProfit = d.rev - d.cogs;
        const opProfit = d.rev - d.cogs - d.opex;
        const netMargin = d.rev > 0 ? (opProfit / d.rev) * 100 : 0;
        const grossMargin = d.rev > 0 ? (grossProfit / d.rev) * 100 : 0;

        let s = pptx.addSlide();
        s.background = { color: theme.bg };
        
        // Status & Title
        const isLoss = opProfit < 0;
        const statusColor = isLoss ? theme.red : (grossMargin < 50 ? 'EAB308' : theme.green);
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.5, w: 0.1, h: 0.6, fill: { color: statusColor } });
        s.addText(proj.toUpperCase(), { x: 0.7, y: 0.45, w: 6, h: 0.7, fontSize: 32, color: theme.text, bold: true });
        s.addText(isLoss ? "AT RISK" : (grossMargin < 50 ? "WATCHLIST" : "ON TRACK"), { x: 7, y: 0.55, w: 2.5, h: 0.5, fontSize: 14, color: statusColor, bold: true, align: 'right' });

        // Scorecard Boxes
        const boxes = [
            { label: "REVENUE", val: formatCurrency(d.rev), color: theme.text },
            { label: "GROSS PROFIT", val: formatCurrency(grossProfit), color: theme.text },
            { label: "NET MARGIN %", val: netMargin.toFixed(1) + "%", color: isLoss ? theme.red : theme.text },
            { label: "DIRECT COGS", val: formatCurrency(d.cogs), color: theme.gray },
            { label: "ASSOC. COST", val: formatCurrency(d.opex), color: 'EAB308' }
        ];

        boxes.forEach((box, idx) => {
            const posX = 0.5 + (idx * 1.9);
            s.addShape(pptx.ShapeType.rect, { x: posX, y: 1.5, w: 1.8, h: 1.2, fill: { color: '1E293B' } });
            s.addText(box.label, { x: posX, y: 1.6, w: 1.8, h: 0.3, fontSize: 10, color: theme.gray, align: 'center', bold: true });
            s.addText(box.val, { x: posX, y: 1.9, w: 1.8, h: 0.6, fontSize: 20, color: box.color, align: 'center', bold: true });
        });

        // Highlights & Risks
        s.addText("EXECUTIVE INSIGHTS", { x: 0.5, y: 3.3, w: 9, h: 0.4, fontSize: 14, color: theme.green, bold: true });
        
        // We scrape the dynamic text generated in the modal for this specific project
        const buCards = document.querySelectorAll('#brief-bu-container > div');
        let projectCard = null;
        buCards.forEach(c => { if(c.querySelector('h3').innerText.trim() === proj) projectCard = c; });

        if (projectCard) {
            // FIX: Safely target the <ul> elements directly to avoid Tailwind slash (/) selector errors
            const uls = projectCard.querySelectorAll('ul');
            let hText = "• No material highlights.";
            let rText = "• No material risks detected.";

            if (uls.length >= 2) {
                // Grab all <li> elements, trim white space, and double-space them for readability
                hText = Array.from(uls[0].querySelectorAll('li')).map(li => "• " + li.innerText.trim()).join("\n\n");
                rText = Array.from(uls[1].querySelectorAll('li')).map(li => "• " + li.innerText.trim()).join("\n\n");
            }

            // Draw Dark Green Box & Text (Added valign: 'top' so text starts at the top)
            s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.8, w: 4.4, h: 2.8, fill: { color: '132626' } });
            s.addText(hText, { x: 0.6, y: 3.9, w: 4.2, h: 2.6, fontSize: 11, color: theme.green, valign: 'top' });

            // Draw Dark Red Box & Text (Added valign: 'top')
            s.addShape(pptx.ShapeType.rect, { x: 5.1, y: 3.8, w: 4.4, h: 2.8, fill: { color: '2D1A1A' } });
            s.addText(rText, { x: 5.2, y: 3.9, w: 4.2, h: 2.6, fontSize: 11, color: theme.red, valign: 'top' });
        }
    });

    await pptx.writeFile({ fileName: `Executive_Briefing_Deck_${new Date().toISOString().split('T')[0]}.pptx` });
    btn.innerHTML = `<i class="far fa-file-powerpoint"></i> PPT`;
};

window.exportBriefToPdf = function() {
    const element = document.querySelector('#exec-brief-modal .bg-slate-50'); // Target modal content
    const opt = {
        margin:       10,
        filename:     `Executive_Briefing_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#f8fafc' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Show loading state on button
    const btn = event.currentTarget;
    btn.innerHTML = '<i class="fas fa-sync-alt animate-spin"></i> Processing...';
    
    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = '<i class="far fa-file-pdf"></i> PDF';
    });
};

window.openExecutiveBrief = function() {
    if (!filteredData || filteredData.length === 0) {
        alert("No data available to generate a briefing. Please adjust your filters.");
        return;
    }

    // 1. Data Aggregation by Project (Acting as BUs)
    const costField = document.getElementById('config-opt-tech')?.checked ? 'Cost_Tech' : 'Cost';
    let globalRev = 0, globalCogs = 0, globalOpex = 0;
    let buData = {};

    filteredData.forEach(row => {
        const cost = parseFloat(row[costField] || row.cost || 0);
        const h1 = (row.Header1 || '').toLowerCase();
        const h2 = (row.Header2 || '').toLowerCase();
        const proj = row.Project || 'Uncategorized';

        if (h1.includes('headcount') || h1.includes('volume') || h2.includes('headcount')) return;

        if (!buData[proj]) buData[proj] = { rev: 0, cogs: 0, opex: 0 };

        // 1st: Check for Revenue
        if (h1.includes('revenue')) {
            globalRev += Math.abs(cost);
            buData[proj].rev += Math.abs(cost);
        } 
        // 2nd: Intercept Associated Costs FIRST so it separates from Direct COGS
        else if (h2.includes('associated') || h1.includes('associated') || h1.includes('admin')) {
            globalOpex += cost;
            buData[proj].opex += cost;
        } 
        // 3rd: Whatever is left over in COGS is strictly Direct Labor / Direct Cost
        else if (h1.includes('cogs') || h1.includes('cost of goods')) {
            globalCogs += cost;
            buData[proj].cogs += cost;
        }
    });

    // 2. Build the Global Narrative
    const globalGrossProfit = globalRev - globalCogs;
    const globalOpProfit = globalRev - globalCogs - globalOpex;
    const globalNetMargin = globalRev > 0 ? (globalOpProfit / globalRev) * 100 : 0;
    
    // NEW: Smart Currency Formatter
    const formatCurrency = (val) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) return (val < 0 ? '-$' : '$') + (absVal / 1000000).toFixed(2) + 'M';
        return (val < 0 ? '-$' : '$') + Math.round(absVal).toLocaleString(); // Exact value if under 1M
    };

    // Build a cohesive FP&A story from top-line to bottom-line
    let narrative = `The active portfolio is currently tracking at <strong class="text-white">${formatCurrency(globalRev)}</strong> in revenue, generating a Gross Profit of <strong class="text-white">${formatCurrency(globalGrossProfit)}</strong>. `;
    
    narrative += `After accounting for <strong>${formatCurrency(globalOpex)}</strong> in associated overhead, the fully loaded Net Margin sits at <strong class="text-white">${globalNetMargin.toFixed(1)}%</strong>. `;

    if (globalNetMargin >= 15) {
        narrative += `This reflects strong operational health and highly efficient cost utilization across the board.`;
    } else if (globalOpProfit > 0) {
        narrative += `While profitable, margin compression is a key focus area this period, requiring strict overhead governance moving into month-end close.`;
    } else {
        narrative += `The portfolio is currently operating at a net deficit, requiring immediate intervention on both direct labor efficiency and overhead reduction.`;
    }

    document.getElementById('brief-portfolio-summary').innerHTML = narrative;

    // 3. Build the Individual BU Cards
    const container = document.getElementById('brief-bu-container');
    container.innerHTML = '';
    
    const topProjects = Object.keys(buData).sort((a, b) => buData[b].rev - buData[a].rev).slice(0, 5);
    document.getElementById('brief-footer-count').textContent = `${topProjects.length} Top BUs Analyzed`;

    topProjects.forEach(proj => {
        const d = buData[proj];
        
        // --- PROPER FP&A MATH ---
        const grossProfit = d.rev - d.cogs; 
        const opProfit = d.rev - d.cogs - d.opex; 
        
        const grossMarginPct = d.rev > 0 ? (grossProfit / d.rev) * 100 : 0; 
        const pMargin = d.rev > 0 ? (opProfit / d.rev) * 100 : 0; 
        
        let statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        let statusText = 'ON TRACK';
        if (grossMarginPct < 50 && grossMarginPct > 0) { statusColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'; statusText = 'WATCHLIST'; }
        if (opProfit < 0) { statusColor = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'; statusText = 'AT RISK'; }
        
        // Dynamic Highlights & Risks
        const getVariation = (array, val) => {
            const randomStr = array[Math.floor(Math.random() * array.length)];
            return randomStr.replace('{VAL}', val);
        };

        const phrases = {
            revGood: [
                "Revenue generation is active, accumulating <strong>{VAL}</strong> for the filtered period.",
                "Top-line performance is steady, delivering <strong>{VAL}</strong> in recognizable revenue.",
                "The project successfully generated <strong>{VAL}</strong> in gross billings this cycle.",
                "Healthy top-line activity recorded, bringing in <strong>{VAL}</strong> over the selected timeframe.",
                "Revenue streams remain fully operational, contributing <strong>{VAL}</strong> to the portfolio.",
                "Delivered a solid <strong>{VAL}</strong> in top-line revenue during this operating period.",
                "Billing operations established a reliable baseline, capturing <strong>{VAL}</strong>.",
                "The business unit realized <strong>{VAL}</strong> in total gross revenue inflows.",
                "Top-line results remain highly stable, with <strong>{VAL}</strong> successfully billed.",
                "Revenue capture remains effective, logging <strong>{VAL}</strong> in total volume.",
                "Achieved <strong>{VAL}</strong> in recognized revenue, demonstrating consistent demand.",
                "Project top-line sits at <strong>{VAL}</strong>, validating current operational scale.",
                "Commercial activity successfully yielded <strong>{VAL}</strong> in gross revenue.",
                "The unit successfully recognized and captured <strong>{VAL}</strong> in total revenue.",
                "Sustained operational delivery generated <strong>{VAL}</strong> in top-line value."
            ],
            marginGood: [
                "Fully loaded margin is highly accretive at <strong>{VAL}</strong>, indicating excellent total cost control.",
                "Cost delivery is highly optimized, yielding a robust Gross Margin of <strong>{VAL}</strong>.",
                "The project boasts a premier margin profile of <strong>{VAL}</strong>, reflecting tight governance.",
                "Operational efficiency is driving an exceptional <strong>{VAL}</strong> gross margin.",
                "Strong cost containment has secured a highly profitable <strong>{VAL}</strong> margin.",
                "Delivering best-in-class profitability with fully loaded margins at <strong>{VAL}</strong>.",
                "The unit's cost structure is lean, capturing an impressive <strong>{VAL}</strong> gross margin.",
                "Excellent labor and overhead management is producing a <strong>{VAL}</strong> profit yield.",
                "Profitability remains a core strength, tracking at a healthy <strong>{VAL}</strong> gross margin.",
                "High-value delivery and strict cost discipline resulted in a <strong>{VAL}</strong> margin.",
                "Margin performance is stellar at <strong>{VAL}</strong>, far exceeding baseline thresholds.",
                "The operating model is highly efficient, converting revenue at a <strong>{VAL}</strong> margin.",
                "Yielding a strong <strong>{VAL}</strong> gross margin due to optimized direct and indirect spend.",
                "Cost ratios are highly favorable, culminating in a <strong>{VAL}</strong> bottom-line margin.",
                "The project is highly lucrative, sustaining a fully loaded margin of <strong>{VAL}</strong>."
            ],
            profitGood: [
                "Operating Profit remains positive, successfully covering all associated overhead burdens.",
                "The unit is fully self-sustaining, generating positive net operating income.",
                "Bottom-line profitability is secure, easily absorbing all allocated indirect costs.",
                "Operating income is solidly in the black, indicating a healthy financial footprint.",
                "The project generated positive net earnings after all cost layers were applied.",
                "Successfully protecting the bottom line, with operating profit remaining positive.",
                "Overhead burdens are fully neutralized by healthy operational gross profits.",
                "The business unit is operating profitably, adding net value to the overall portfolio.",
                "Revenue yield comfortably eclipses total expenditures, ensuring positive net profit.",
                "The project maintains a profitable run-rate despite fully loaded cost allocations.",
                "Demonstrated strong fiscal health by clearing all direct and indirect cost hurdles.",
                "Bottom-line results are resilient, maintaining profitability after overhead absorption.",
                "Operating profit cleared the breakeven threshold, confirming financial viability.",
                "The unit delivered a positive net return, absorbing corporate/admin costs effortlessly.",
                "Final operating profit remains constructive, safeguarding bottom-line stability."
            ],
            opexBad: [
                "Associated overhead (<strong>{VAL}</strong>) is consuming a significant portion of revenue. Institute strict cost governance.",
                "Indirect costs are running high at <strong>{VAL}</strong>. Immediate review of administrative spend is recommended.",
                "Overhead burdens are dragging profitability, accumulating to <strong>{VAL}</strong>. Consider lean optimization.",
                "The project is carrying <strong>{VAL}</strong> in associated costs, indicating potential operational bloat.",
                "Non-direct spend is disproportionately high (<strong>{VAL}</strong>). Tighter governance on overhead is required.",
                "Associated expenditures reached <strong>{VAL}</strong>, presenting a material risk to bottom-line yield.",
                "Overhead ratios are elevated. Review the <strong>{VAL}</strong> in indirect costs for consolidation opportunities.",
                "Operating expenses are diluting returns, with <strong>{VAL}</strong> spent on associated overhead.",
                "The <strong>{VAL}</strong> administrative burden is heavy relative to the project's top-line scale.",
                "Indirect cost leakage is a primary concern, with associated spend hitting <strong>{VAL}</strong>.",
                "Overhead absorption is straining the P&L, accumulating <strong>{VAL}</strong> in indirect expenses.",
                "Tame the <strong>{VAL}</strong> overhead spend to protect the unit's fully-loaded profitability.",
                "Structural overhead costs (<strong>{VAL}</strong>) are eroding margins and require immediate rationalization.",
                "Too much revenue is being diverted to the <strong>{VAL}</strong> associated cost layer.",
                "Limit discretionary and administrative spend; current overhead sits at a concerning <strong>{VAL}</strong>."
            ],
            marginBad: [
                "Fully loaded costs are suppressing operating margins (<strong>{VAL}</strong>). Consider wage inflation offsets or pricing negotiations.",
                "Margins are notably compressed at <strong>{VAL}</strong>. A strategic review of delivery efficiency is advised.",
                "The <strong>{VAL}</strong> gross margin leaves little room for error. Focus on improving direct labor utilization.",
                "Profitability is thin (<strong>{VAL}</strong>). Investigate opportunities to negotiate better vendor or labor rates.",
                "Operating at a vulnerable <strong>{VAL}</strong> margin. Revenue growth must outpace cost escalation moving forward.",
                "Margin yield is dangerously tight at <strong>{VAL}</strong>. Scope creep or labor inefficiencies may be occurring.",
                "The project is barely breaking even with a <strong>{VAL}</strong> margin. Immediate pricing or cost actions are needed.",
                "A narrow <strong>{VAL}</strong> margin indicates that the cost of delivery is misaligned with current billing rates.",
                "Profit margins have shrunk to <strong>{VAL}</strong>. Operational leadership must focus on cost containment.",
                "The <strong>{VAL}</strong> gross margin highlights a need to restructure resource allocation to improve profitability.",
                "Financial buffer is limited due to a <strong>{VAL}</strong> operating margin. Target process automation to reduce COGS.",
                "Experiencing margin degradation, currently sitting at <strong>{VAL}</strong>. Prioritize high-margin activities.",
                "The <strong>{VAL}</strong> bottom-line return is suboptimal. Challenge current staffing and indirect cost models.",
                "Thin operating margins (<strong>{VAL}</strong>) suggest the project is highly sensitive to any future cost shocks.",
                "Yield is currently constrained at <strong>{VAL}</strong>. Commercial teams should explore rate card adjustments."
            ],
            profitBad: [
                "Project is operating at a net loss. Gross profit is insufficient to cover the combined direct and indirect cost footprint.",
                "The unit is currently underwater, generating negative operating profit for the selected period.",
                "Experiencing a severe profitability deficit. Expenditures are materially outpacing revenue generation.",
                "The project is bleeding cash. Immediate executive intervention is required to right-size the cost structure.",
                "Operating in the red. The current revenue model fails to support the fully loaded operational footprint.",
                "This BU is a loss leader this cycle. Total combined COGS and overhead have eclipsed top-line billings.",
                "Financials indicate a net deficit. A comprehensive turnaround plan is needed to address the operating loss.",
                "The bottom line is negative. Direct costs and administrative burdens have completely eroded profitability.",
                "Unprofitable operating period. The unit failed to break even after associated costs were applied.",
                "The project is currently destructive to portfolio EBITDA, registering a clear operating loss.",
                "Cost overruns have pushed the unit into a net loss position. Halt non-essential spend immediately.",
                "Revenue is actively failing to cover the fixed and variable cost base, resulting in a bottom-line deficit.",
                "Operating margins have inverted. The project is consuming more capital than it is generating.",
                "Severe margin failure. The combination of high delivery costs and overhead has triggered an operating loss.",
                "The unit requires urgent restructuring; current run-rates are producing unsustainable operating losses."
            ]
        };

        // Initialize Highlights & Risks
        let highlights = '';
        let risks = '';

        const revStr = formatCurrency(d.rev);
        const opexStr = formatCurrency(d.opex);
        const netMarginStr = pMargin.toFixed(1) + '%';
        const grossMarginStr = grossMarginPct.toFixed(1) + '%';

        // Apply logic with random variation selection
        if (d.rev > 0) {
            highlights += `<li class="flex items-start gap-2"><i class="fas fa-caret-up text-emerald-500 mt-1"></i><span>${getVariation(phrases.revGood, revStr)}</span></li>`;
        }
        if (pMargin >= 20) {
            highlights += `<li class="flex items-start gap-2"><i class="fas fa-caret-up text-emerald-500 mt-1"></i><span>${getVariation(phrases.marginGood, netMarginStr)}</span></li>`;
        }
        if (opProfit > 0) {
            highlights += `<li class="flex items-start gap-2"><i class="fas fa-caret-up text-emerald-500 mt-1"></i><span>${getVariation(phrases.profitGood, "")}</span></li>`;
        }

        if (d.opex > (d.rev * 0.15)) {
            risks += `<li class="flex items-start gap-2"><i class="fas fa-caret-down text-rose-500 mt-1"></i><span>${getVariation(phrases.opexBad, opexStr)}</span></li>`;
        }
        
        // NEW RULE: Trigger if Gross Margin % is less than 50%
        if (grossMarginPct < 50 && grossMarginPct > 0) {
            risks += `<li class="flex items-start gap-2"><i class="fas fa-caret-down text-rose-500 mt-1"></i><span>${getVariation(phrases.marginBad, grossMarginStr)}</span></li>`;
        }
        
        if (opProfit < 0) {
            risks += `<li class="flex items-start gap-2"><i class="fas fa-caret-down text-rose-500 mt-1"></i><span>${getVariation(phrases.profitBad, "")}</span></li>`;
        }

        // Fallbacks
        if (!highlights) highlights = `<li class="text-slate-400 italic text-sm">No positive material drivers identified in this period.</li>`;
        if (!risks) risks = `<li class="text-slate-400 italic text-sm">No significant operational risks detected.</li>`;

        const cardHtml = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative">
                
                <div class="flex items-center gap-3 mb-4">
                    <h3 class="text-xl font-black text-slate-800 dark:text-white">${proj}</h3>
                    <span class="px-2 py-1 rounded-md text-[10px] font-bold tracking-widest ${statusColor}">${statusText}</span>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Revenue</span>
                        <span class="text-xl font-black text-slate-800 dark:text-white">${formatCurrency(d.rev)}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gross Profit</span>
                        <span class="text-xl font-black ${grossProfit < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}">${formatCurrency(grossProfit)}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Net Margin %</span>
                        <span class="text-xl font-black ${pMargin < 15 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}">${pMargin.toFixed(1)}%</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Direct COGS</span>
                        <span class="text-xl font-black text-slate-600 dark:text-slate-300">${formatCurrency(d.cogs)}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assoc. Cost</span>
                        <span class="text-xl font-black text-amber-600 dark:text-amber-500">${formatCurrency(d.opex)}</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-5">
                        <h4 class="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-3">Highlights</h4>
                        <ul class="text-sm text-emerald-900 dark:text-emerald-300 space-y-3 font-medium">
                            ${highlights}
                        </ul>
                    </div>
                    <div class="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50 rounded-xl p-5">
                        <h4 class="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest mb-3">Key Improvement Points</h4>
                        <ul class="text-sm text-rose-900 dark:text-rose-300 space-y-3 font-medium">
                            ${risks}
                        </ul>
                    </div>
                </div>

            </div>
        `;
        container.innerHTML += cardHtml;
    });

    // 4. Show the Modal
    const modal = document.getElementById('exec-brief-modal');
    modal.classList.remove('hidden');
};

window.closeExecutiveBrief = function() {
    document.getElementById('exec-brief-modal').classList.add('hidden');
};