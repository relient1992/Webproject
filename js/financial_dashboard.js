window.initFinancialDashboard = initFinancialDashboard;

let financialData = [];
let filteredData = [];
let charts = {};

const FIN_HEADERS = [
    "Proj_ID", "Mapping", "Project", "LOB", "Customer", "PLM_Head", "PLM", "Project_Manager", 
    "Entity", "Entity_Region", "Region", "Location", "CPTMapping", "SubProj_ID", "Project_Code", 
    "Site", "Dated", "VM_ID", "Header1", "Header2", "Header3", "Header4", "Header5", 
    "Cost", "Cost_Tech", "SortOrder1", "SortOrder2", "UserView"
];

async function initFinancialDashboard() {
    console.log("🚦 [Financial Dashboard] Initialization started...");

    const filterPanel = document.getElementById('advanced-filters');
    if (!filterPanel) return;

    try {
        const response = await fetch('financial_fetch_api.php');
        const rawText = await response.text(); 
        
        try {
            const result = JSON.parse(rawText);
            financialData = result.success ? result.data : [];
            console.log(`✅ Loaded ${financialData.length} rows of data.`);
        } catch (parseError) {
            console.error("❌ JSON Parse Failed. PHP output:", rawText);
            financialData = [];
        }
    } catch (networkError) {
        console.error("❌ Network Error.", networkError);
        financialData = [];
    }

    try {
        populateConfigurationFilters(); 
        initProjectSearch(); // Attach search listener
        applyGlobalFilters(true); 
        populateExportCheckboxes();
    } catch (renderError) {
        console.error("❌ Error rendering the UI:", renderError);
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
            // Include class "filter-item" to help with the Live Search
            container.innerHTML += `
                <label class="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-colors group filter-item">
                    <input type="checkbox" value="${val}" class="filter-cb-${key.toLowerCase()} text-emerald-500 focus:ring-emerald-500 rounded border-slate-300 dark:border-slate-600 bg-transparent">
                    <span class="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">${val}</span>
                </label>
            `;
        });
    });
}

function initProjectSearch() {
    const searchInput = document.getElementById('search-project');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        // Grab all the labels inside the project list
        const items = document.querySelectorAll('#filter-list-project .filter-item');
        
        items.forEach(item => {
            // Ignore the "SELECT ALL" button when searching
            if (item.textContent.includes('SELECT ALL')) return;
            
            const text = item.textContent.toLowerCase();
            // Show or hide based on match
            if (text.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

window.clearAllFilters = function() {
    document.querySelectorAll('[class^="filter-cb-"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[onchange^="toggleSelectAll"]').forEach(cb => cb.checked = false);
    
    if (document.getElementById('config-start-date')) document.getElementById('config-start-date').value = '';
    if (document.getElementById('config-end-date')) document.getElementById('config-end-date').value = '';
    if (document.getElementById('search-project')) {
        document.getElementById('search-project').value = '';
        // Manually trigger the input event to reset the list visibility
        document.getElementById('search-project').dispatchEvent(new Event('input'));
    }
    
    window.applyGlobalFilters();
};

window.toggleSelectAll = function(source, category) {
    const checkboxes = document.querySelectorAll(`.filter-cb-${category}`);
    checkboxes.forEach(cb => {
        // Only check it if it's currently visible (useful if they search and THEN hit select all)
        if (cb.closest('label').style.display !== 'none') {
            cb.checked = source.checked;
        }
    });
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

            filteredData = financialData.filter(row => {
                let pass = true;
                
                const rMapping = (row.Mapping || row.mapping || row.MAPPING || '').trim();
                const rProject = (row.Project || row.project || row.PROJECT || '').trim();
                const rLob = (row.LOB || row.lob || '').trim();
                const rEntity = (row.Entity || row.entity || row.ENTITY || '').trim();

                if (selectedMappings.length > 0 && !selectedMappings.includes(rMapping)) pass = false;
                if (selectedProjects.length > 0 && !selectedProjects.includes(rProject)) pass = false;
                if (selectedLOBs.length > 0 && !selectedLOBs.includes(rLob)) pass = false;
                if (selectedEntities.length > 0 && !selectedEntities.includes(rEntity)) pass = false;

                if (startInput && endInput) {
                    const rowDate = row.Dated || row.dated || '';
                    const rowMonth = rowDate ? rowDate.substring(0, 7) : ''; 
                    if (rowMonth && (rowMonth < startInput || rowMonth > endInput)) pass = false;
                }
                return pass;
            });

            const costFieldToUse = useTechCost ? 'Cost_Tech' : 'Cost';
            const headerLvlChecked = document.querySelector('input[name="header_lvl"]:checked');
            const activeHeaderKey = headerLvlChecked ? `Header${headerLvlChecked.value}` : 'Header1';

            renderView1Summary(activeHeaderKey, costFieldToUse);
            renderViewPLDatasheet(costFieldToUse); // NEW P&L RENDERER
            renderView2MoM(activeHeaderKey, costFieldToUse);
            renderView3Visuals();
            resetSimulation();

        } catch (error) {
            console.error("Error applying filters:", error);
        } finally {
            if (loadingScreen && !isInitialLoad) {
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
    
    filteredData.forEach(row => {
        const cost = parseFloat(row[costField] || row.cost || 0);
        const h1 = (row.Header1 || row.header1 || '').toLowerCase();
        const mapping = (row.Mapping || row.mapping || '').toLowerCase();

        if (h1.includes('revenue') || mapping.includes('revenue')) rev += Math.abs(cost);
        else if (h1.includes('cogs') || mapping.includes('cogs') || h1.includes('cost of goods')) cogs += cost;
        else if (h1.includes('associated')) associated += cost;

        if (row.Headcount3 || h1.includes('headcount')) hc += parseFloat(row.Headcount3 || cost || 0); 
    });

    const margin = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElemText('kpi-revenue', '$' + rev.toLocaleString(undefined, {maximumFractionDigits:0}));
    setElemText('kpi-cogs', '$' + cogs.toLocaleString(undefined, {maximumFractionDigits:0}));
    setElemText('kpi-margin', margin.toFixed(1) + '%');
    setElemText('kpi-associated', '$' + associated.toLocaleString(undefined, {maximumFractionDigits:0}));
    setElemText('kpi-headcount', hc.toLocaleString());

    const chartData = {};
    filteredData.forEach(row => {
        const key = row[aggKey] || row[aggKey.toLowerCase()] || 'Other';
        chartData[key] = (chartData[key] || 0) + parseFloat(row[costField] || row[costField.toLowerCase()] || 0);
    });

    renderChart('summary-chart', 'bar', Object.keys(chartData), Object.values(chartData), `Costs by ${aggKey}`);
    
    const container = document.getElementById('dynamic-insights');
    if (container) {
        const keys = Object.keys(chartData);
        if(keys.length === 0) {
            container.innerHTML = "<p>Not enough data to generate insights.</p>";
            return;
        }
        const highestKey = keys.reduce((a, b) => chartData[a] > chartData[b] ? a : b);
        const total = Object.values(chartData).reduce((a, b) => a + b, 0);
        const pct = total > 0 ? ((chartData[highestKey] / total) * 100).toFixed(1) : 0;

        let html = `<p><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-2"></span> <strong>${highestKey}</strong> is your highest cost driver, accounting for <strong>${pct}%</strong> of total filtered costs.</p>`;
        
        if (cogs > rev && rev > 0) {
            html += `<p><span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-2"></span> <strong>Warning:</strong> COGS exceeds recognized revenue.</p>`;
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

    // 1. Determine Level Limit based on Radio Buttons
    const headerLvlChecked = document.querySelector('input[name="header_lvl"]:checked');
    const maxLevel = headerLvlChecked ? parseInt(headerLvlChecked.value) : 5;

    // 2. Extract Distinct Months & Sort
    const monthSet = new Set();
    filteredData.forEach(row => {
        const d = row.Dated || row.dated;
        if(d) monthSet.add(d.substring(0,7)); // '2025-07'
    });
    const months = Array.from(monthSet).sort();

    // 3. Build Table Headers
    let headerHtml = `<tr><th class="p-4 bg-slate-100 dark:bg-slate-900 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Title</th>`;
    months.forEach(m => {
        // Format '2025-07' to 'Jul 25'
        const dateObj = new Date(m + "-01");
        const formatted = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
        headerHtml += `<th class="p-4 text-center">${formatted}</th>`;
    });
    headerHtml += `<th class="p-4 text-center border-l border-slate-200 dark:border-slate-700">Average</th></tr>`;
    thead.innerHTML = headerHtml;

    // 4. Build Hierarchical Matrix
    const matrix = {}; 
    // Format: matrix["Header1Value"] = { '2025-07': 500, _total: 500 }
    // matrix["Header1Value|Header2Value"] = { '2025-07': 100, _total: 100 }

    filteredData.forEach(row => {
        const m = (row.Dated || row.dated || '').substring(0,7);
        if (!m) return;
        const cost = parseFloat(row[costField] || row.cost || 0);

        let currentPath = "";
        for (let i = 1; i <= maxLevel; i++) {
            const hVal = (row[`Header${i}`] || row[`header${i}`] || '').trim();
            if (!hVal) break; // Stop drilling down if this row has no sub-headers

            currentPath = currentPath ? `${currentPath}|${hVal}` : hVal;

            if (!matrix[currentPath]) matrix[currentPath] = { _total: 0, _count: 0 };
            matrix[currentPath][m] = (matrix[currentPath][m] || 0) + cost;
            matrix[currentPath]._total += cost;
            matrix[currentPath]._count = months.length; // for simple averaging
        }
    });

    // 5. Render Rows Alphabetically
    const sortedPaths = Object.keys(matrix).sort();
    let bodyHtml = '';

    if (sortedPaths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${months.length + 2}" class="p-4 text-center italic text-slate-400">No data available for the selected filters.</td></tr>`;
        return;
    }

    sortedPaths.forEach(path => {
        const parts = path.split('|');
        const level = parts.length;
        const displayName = parts[level - 1]; // Only show the deepest part
        
        // Indentation calculation (adds padding-left based on depth)
        const indentClass = level > 1 ? `pl-${(level * 4) + 2}` : 'pl-4';
        const textWeight = level === 1 ? 'font-extrabold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400';
        
        // Special styling for "Revenue"
        const isRevenue = displayName.toLowerCase().includes('revenue');
        const rowColorClass = isRevenue ? 'text-pink-600 dark:text-pink-400' : '';

        // Add sticky column logic to the title to match the header
        let rowHtml = `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                        <td class="py-2.5 pr-4 ${indentClass} ${textWeight} ${rowColorClass} bg-white dark:bg-slate-900 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            ${level > 1 ? '<span class="text-slate-300 dark:text-slate-600 mr-1">...</span>' : ''}${displayName}
                        </td>`;

        const data = matrix[path];
        let rowTotal = 0;

        // Loop through each month dynamically
        months.forEach(m => {
            const val = data[m] || 0;
            rowTotal += val;
            const displayVal = val === 0 ? '-' : (isRevenue ? '$' : '$') + val.toLocaleString(undefined, {maximumFractionDigits:0});
            rowHtml += `<td class="py-2.5 px-4 text-center ${rowColorClass}">${displayVal}</td>`;
        });

        // Add Average Column
        const avg = rowTotal / (months.length || 1);
        rowHtml += `<td class="py-2.5 px-4 text-center font-bold border-l border-slate-200 dark:border-slate-700 ${rowColorClass}">$${avg.toLocaleString(undefined, {maximumFractionDigits:0})}</td></tr>`;
        
        bodyHtml += rowHtml;
    });

    tbody.innerHTML = bodyHtml;
}

// ----------------------------------------------------
// VIEW 3: MoM COMPARISON
// ----------------------------------------------------
function renderView2MoM(aggKey, costField) {
    const tbody = document.getElementById('mom-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const mockCategories = ['Operations', 'ITSSG', 'Admin Cost', 'Facilities'];
    mockCategories.forEach(cat => {
        const curr = Math.random() * 50000 + 10000;
        const prev = curr * (Math.random() * 0.4 + 0.8);
        const delta = ((curr - prev) / prev) * 100;
        
        let status = delta > 15 ? `<span class="text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded font-bold text-xs"><i class="fas fa-arrow-up"></i> ${delta.toFixed(1)}%</span>` 
                   : delta < -5 ? `<span class="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded font-bold text-xs"><i class="fas fa-arrow-down"></i> ${Math.abs(delta).toFixed(1)}%</span>`
                   : `<span class="text-slate-500 font-bold text-xs">${delta.toFixed(1)}%</span>`;

        if(delta > 40) status += ` <span class="ml-2 text-amber-500" title="1-Year Outlier"><i class="material-icons-sharp text-[16px] align-middle">warning</i></span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="p-4 font-bold text-slate-900 dark:text-white">${cat}</td>
                <td class="p-4">$${prev.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td class="p-4">$${curr.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td class="p-4">${delta.toFixed(1)}%</td>
                <td class="p-4">${status}</td>
            </tr>
        `;
    });
}

// ----------------------------------------------------
// VIEW 4: VISUALIZATIONS
// ----------------------------------------------------
function renderView3Visuals() {
    if(!document.getElementById('vis-line-chart')) return;
    renderChart('vis-line-chart', 'line', ['Jan', 'Feb', 'Mar', 'Apr', 'May'], [12, 19, 15, 22, 30], 'Cost Trend');
    renderChart('vis-bar-chart', 'bar', ['Entity A', 'Entity B', 'Entity C'], [400, 300, 600], 'Cost by Entity');
    
    if(charts['vis-scatter-chart']) charts['vis-scatter-chart'].destroy();
    const ctxScatter = document.getElementById('vis-scatter-chart').getContext('2d');
    charts['vis-scatter-chart'] = new Chart(ctxScatter, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Projects',
                data: [{x: 10, y: 20000}, {x: 50, y: 80000}, {x: 25, y: 45000}],
                backgroundColor: '#3b82f6'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const heatContainer = document.getElementById('vis-heatmap-container');
    if (heatContainer) {
        heatContainer.innerHTML = `
            <div class="grid grid-cols-4 gap-1 text-center text-xs font-bold text-white min-w-[400px]">
                <div class="bg-slate-200 text-slate-600 p-2 rounded">Region/Header</div>
                <div class="bg-slate-200 text-slate-600 p-2 rounded">COGS</div>
                <div class="bg-slate-200 text-slate-600 p-2 rounded">Opex</div>
                <div class="bg-slate-200 text-slate-600 p-2 rounded">CAPEX</div>
                
                <div class="bg-slate-100 text-slate-600 p-2 rounded flex items-center justify-center">APAC</div>
                <div class="bg-rose-500 p-2 rounded flex items-center justify-center">High</div>
                <div class="bg-emerald-400 p-2 rounded flex items-center justify-center">Low</div>
                <div class="bg-amber-400 p-2 rounded flex items-center justify-center">Med</div>
            </div>
        `;
    }
}

// ----------------------------------------------------
// VIEW 5: SIMULATION
// ----------------------------------------------------
let baseRev = 1000000;
let baseCogs = 650000;

window.runSimulation = function() {
    const revInput = document.getElementById('sim-revenue');
    if (!revInput) return; 

    const revMod = parseFloat(revInput.value) / 100;
    const cogsMod = parseFloat(document.getElementById('sim-cogs').value) / 100;
    const hcMod = parseFloat(document.getElementById('sim-hc').value) / 100;

    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElemText('sim-rev-val', (revMod > 0 ? '+' : '') + (revMod*100).toFixed(0) + '%');
    setElemText('sim-cogs-val', (cogsMod > 0 ? '+' : '') + (cogsMod*100).toFixed(0) + '%');
    setElemText('sim-hc-val', (hcMod > 0 ? '+' : '') + (hcMod*100).toFixed(0) + '%');

    const projRev = baseRev * (1 + revMod);
    const projCogs = baseCogs * (1 + cogsMod + (hcMod * 0.5)); 
    const projMargin = projRev > 0 ? ((projRev - projCogs) / projRev) * 100 : 0;
    const projProfit = projRev - projCogs;

    const baseMargin = baseRev > 0 ? ((baseRev - baseCogs) / baseRev) * 100 : 0;
    const marginDiff = projMargin - baseMargin;

    setElemText('sim-res-margin', projMargin.toFixed(1) + '%');
    setElemText('sim-res-margin-diff', (marginDiff > 0 ? '▲ +' : '▼ ') + marginDiff.toFixed(1) + '%');
    
    const marginDiffEl = document.getElementById('sim-res-margin-diff');
    if (marginDiffEl) marginDiffEl.className = `text-sm font-bold mb-1 ${marginDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    
    setElemText('sim-res-profit', '$' + projProfit.toLocaleString(undefined, {maximumFractionDigits:0}));
    
    renderChart('sim-waterfall-chart', 'bar', ['Base Profit', 'Rev Impact', 'COGS Impact', 'Projected Profit'], [baseRev-baseCogs, baseRev*revMod, -(baseCogs*cogsMod), projProfit], 'Simulation Waterfall');
};

window.resetSimulation = function() {
    const revInput = document.getElementById('sim-revenue');
    if (!revInput) return;
    
    revInput.value = 0;
    document.getElementById('sim-cogs').value = 0;
    document.getElementById('sim-hc').value = 0;
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
    
    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: type === 'line' ? 'transparent' : '#10b981',
                borderColor: '#10b981',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: isDark ? '#334155' : '#e2e8f0' }, ticks: { color: isDark ? '#cbd5e1' : '#475569' } },
                x: { grid: { display: false }, ticks: { color: isDark ? '#cbd5e1' : '#475569' } }
            }
        }
    });
}

window.populateExportCheckboxes = function() {
    const container = document.getElementById('export-checkboxes');
    if(!container) return;
    container.innerHTML = '';
    FIN_HEADERS.forEach(header => {
        const isChecked = ['Dated', 'Project', 'Entity', 'Header1', 'Cost'].includes(header) ? 'checked' : '';
        container.innerHTML += `
            <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                <input type="checkbox" value="${header}" class="export-col-cb text-blue-600 focus:ring-blue-500" ${isChecked}>
                <span class="truncate">${header}</span>
            </label>
        `;
    });
};

window.executeCustomExport = function() {
    const checkboxes = document.querySelectorAll('.export-col-cb:checked');
    const selectedHeaders = Array.from(checkboxes).map(cb => cb.value);

    if (selectedHeaders.length === 0) return alert("Select at least one column.");

    let csvContent = selectedHeaders.join(",") + "\n";
    filteredData.forEach(row => {
        let rowData = selectedHeaders.map(header => {
            let val = String(row[header] || row[header.toLowerCase()] || '');
            return val.includes(',') ? `"${val}"` : val;
        });
        csvContent += rowData.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Financial_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('hidden');
};

window.processSecureImport = function() {
    const password = document.getElementById('import-password')?.value;
    const fileInput = document.getElementById('import-file');
    const modeObj = document.querySelector('input[name="import_mode"]:checked');
    const mode = modeObj ? modeObj.value : 'append';

    if (!password) return alert("Admin password is required.");
    if (!fileInput || !fileInput.files[0]) return alert("Please select a file to import.");

    const formData = new FormData();
    formData.append('password', password);
    formData.append('file', fileInput.files[0]);
    formData.append('mode', mode); 

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "Processing...";
    btn.disabled = true;

    fetch('financial_import_api.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            alert(data.message);
            const modal = document.getElementById('secure-import-modal');
            if (modal) modal.classList.add('hidden');
            document.getElementById('import-password').value = '';
            document.getElementById('import-file').value = '';
            initFinancialDashboard(); 
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(err => console.error(err))
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
};