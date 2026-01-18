// --- GLOBAL HELPERS ---
window.dashboardGlobals = {
    getApiUrl: () => '../hr_dashboard_api.php',
    getDropdownData: () => dropdownData,
    refreshAllData: async () => {}, 
    getCurrentView: () => currentView,
    getFilteredIds: () => [] 
};

document.addEventListener('DOMContentLoaded', function () {

    // --- CONFIGURATION & STATE ---
    let USER_ROLE = 'hr_staff'; 
    const API_URL = '../hr_dashboard_api.php';
    
    // Drag & Drop State
    let dragSrcColumn = null;

    // 1. College Degrees List
    const collegeDegrees = [
        "Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", 
        "Bachelor of Science in Business Administration", "Bachelor of Arts in Communication",
        "Bachelor of Science in Psychology", "Bachelor of Science in Nursing", "Bachelor of Science in Accountancy",
        "Bachelor of Science in Engineering", "Bachelor of Arts in English", "Bachelor of Science in Biology",
        "Bachelor of Elementary/Secondary Education", "Other"
    ];

    // 2. Position & Expertise Logic
    const positionLogic = {
        'Accounting': { label: 'Accounting Specialization', options: ['Payroll Processing', 'Taxation/Compliance', 'Accounts Payable/Receivable', 'General Audit'] },
        'Call Center Agent': { label: 'Account Type Experience', options: ['International Voice', 'Technical Support', 'Sales/Telemarketing', 'Customer Service (Chat/Email)'] },
        'Data Entry Operator': { label: 'Typing & Software Proficiency', options: ['Alpha-Numeric (High Speed)', 'Transcription', 'MS Excel Advanced', 'Database Management'] },
        'Facilities': { label: 'Facilities Expertise', options: ['Building Maintenance', 'Electrical/Plumbing', 'Vendor Management', 'Security Operations'] },
        'Human Resource': { label: 'HR Focus Area', options: ['Recruitment/Sourcing', 'Employee Relations', 'Compensation & Benefits', 'Training & Development'] },
        'IT': { label: 'IT Specialization', options: ['Network Administration', 'Technical Helpdesk', 'System Security', 'Software Troubleshooting'] },
        'Manager Level': { label: 'Management Experience', options: ['Operations Management', 'Team Lead (People Management)', 'Project Management', 'Strategic Planning'] },
        'Medcoder': { label: 'Coding Certification/Skill', options: ['ICD-10-CM Proficiency', 'CPC Certified', 'Medical Billing', 'Inpatient/Outpatient Coding'] },
        'Nurse': { label: 'Clinical Area', options: ['ER/ICU Experience', 'General Ward', 'Occupational Health', 'Pediatrics/OB-GYN'] },
        'Procurement': { label: 'Supply Chain Focus', options: ['Purchasing/Buying', 'Inventory Management', 'Logistics/Distribution', 'Vendor Negotiation'] },
        'Quality Analyst': { label: 'QA Expertise', options: ['Call Monitoring', 'Process Improvement (Six Sigma)', 'Data Analysis', 'Compliance Auditing'] },
        'Reports Analyst': { label: 'Reporting Tools', options: ['Real-time Monitoring', 'Advanced Excel/VBA', 'Power BI/Tableau', 'SQL/Data Mining'] }
    };

    // 3. Column Definitions
    const ALL_COLUMNS = [
        { key: 'select', label: '<input type="checkbox" id="selectAllCheckbox" />', editable: false },
        { key: 'application_id', label: 'ID', editable: false },
        { key: 'surname', label: 'Surname', editable: true, type: 'text', required: true },
        { key: 'firstname', label: 'First Name', editable: true, type: 'text', required: true },
        { key: 'middlename', label: 'Middle Name', editable: true, type: 'text' },
        { key: 'screening_score', label: 'Score', editable: true, type: 'number' },
        { key: 'screening_status', label: 'Pre-Screen', editable: true, type: 'text' },
        { key: 'position_applied', label: 'Position', editable: true, type: 'select', options: Object.keys(positionLogic), required: true },
        { key: 'experience_years', label: 'Experience', editable: true, type: 'select', options: ['0','1','2','3','5'] },
        { key: 'age', label: 'age', editable: true, type: 'number'},
        { key: 'specific_skill', label: 'Expertise', editable: true, type: 'select' },
        { key: 'birthday', label: 'Birthday', editable: true, type: 'date', required: true },
        { key: 'gender', label: 'Gender', editable: true, type: 'select', options: ['Male', 'Female'], required: true },
        { key: 'mobile_number', label: 'Mobile', editable: true, type: 'tel', required: true },
        { key: 'email', label: 'Email', editable: true, type: 'email', required: true },
        { key: 'street_address', label: 'Street', editable: true, type: 'text', required: true },
        { key: 'city', label: 'City', editable: true, type: 'text', required: true },
        { key: 'province', label: 'Province', editable: true, type: 'text', required: true },
        { key: 'postcode', label: 'Postcode', editable: true, type: 'text', required: true },
        { key: 'recruiter_name', label: 'Recruiter', editable: true, type: 'select', options_key: 'recruiters' },
        { key: 'recruitment_status_text', label: 'Status', editable: false },
        { key: 'recruitment_status_id', label: 'Status', editable: true, type: 'select', options_key: 'statuses' },
        { key: 'status_date', label: 'Status Date', editable: true, type: 'date' },
        { key: 'application_source', label: 'Source', editable: true, type: 'select', options: ['Job Portal', 'Employee Referral', 'Career Page', 'Recruitment Agency', 'Walk-in'], required: true },
        { key: 'application_date', label: 'Applied On', editable: false },
        { key: 'facebook_account', label: 'Facebook', editable: true, type: 'url' },
        { key: 'instagram_account', label: 'Instagram', editable: true, type: 'text' },
        { key: 'twitter_account', label: 'Twitter (X)', editable: true, type: 'text' },
        { key: 'viber_account', label: 'Viber', editable: true, type: 'tel' },
        { key: 'education_level', label: 'Education Level', editable: true, type: 'select', options: ['High School Graduate', 'Vocational Graduate', 'Some College', 'College Graduate', "Post Graduate (Master's/Doctorate)"], required: true },
        { key: 'college_degree', label: 'Degree', editable: true, type: 'select', options: collegeDegrees },
        { key: 'interview_dates', label: 'Interview Date', editable: true, type: 'datetime-local' },
        { key: 'interviewers', label: 'Interviewers', editable: true, type: 'textarea' },
        { key: 'feedback_comments', label: 'Feedback', editable: true, type: 'textarea' },
        { key: 'offer_status', label: 'Offer', editable: true, type: 'select', options: ['Pending', 'Accepted', 'Declined'] },
        { key: 'offer_date', label: 'Offer Date', editable: true, type: 'date' },
        { key: 'joining_date', label: 'Joining Date', editable: true, type: 'date' },
        { key: 'employee_id', label: 'Employee ID', editable: true, type: 'text' },
        { key: 'Project', label: 'Project', editable: true, type: 'text' },
        { key: 'actions', label: 'Actions', editable: false },
    ];

    // IMPORTANT: Defined as a separate constant so Reset can use it
    const DEFAULT_VISIBLE_COLUMNS = ['select', 'application_id', 'surname', 'firstname', 'position_applied', 'screening_score', 'screening_status', 'recruitment_status_text','specific_skill','recruiter_name', 'application_date'];
    
    // --- VARIABLES ---
    let allApplicants = [], allRecruiterData = [], visibleColumns = [...DEFAULT_VISIBLE_COLUMNS, 'actions'];
    let sortConfig = { key: 'application_date', direction: 'desc' }, currentStatusFilter = 'all';
    let dropdownData = { recruiters: [], statuses: {} };
    let currentView = 'active', currentPage = 1, rowsPerPage = 10, selectedApplicants = [];
    let mainChartInstance, sidebarChartInstance, dateRangePicker; 

    // --- DOM SELECTORS ---
    const getEl = (id) => document.getElementById(id);
    const tableHead = getEl('tableHead'), tableBody = getEl('tableBody'), searchInput = getEl('searchInput'), searchFieldSelector = getEl('searchFieldSelector');
    const columnToggleBtn = getEl('columnToggleBtn'), columnSelector = getEl('columnSelector'), columnCheckboxes = getEl('columnCheckboxes'), closeColumnSelector = getEl('closeColumnSelector');
    const saveViewBtn = getEl('saveViewBtn'), resetViewBtn = getEl('resetViewBtn'); // Buttons
    
    const statusFiltersContainer = getEl('statusFilters');
    const editModal = getEl('editModal'), editFormContent = getEl('editFormContent'), editForm = getEl('editForm'), deleteBtn = getEl('deleteBtn'), cancelEditBtn = getEl('cancelEditBtn'), editApplicationIdInput = getEl('edit_application_id');
    const newApplicantBtn = getEl('newApplicantBtn'), addApplicantModal = getEl('addApplicantModal'), addApplicantForm = getEl('addApplicantForm'), addFormContent = getEl('addFormContent'), cancelAddBtn = getEl('cancelAddBtn');
    const viewActiveBtn = getEl('viewActiveBtn'), viewArchivedBtn = getEl('viewArchivedBtn'), viewRecruiterBtn = getEl('viewRecruiterBtn'), viewLogsBtn = getEl('viewLogsBtn'), logsModal = getEl('logsModal'), logsTableBody = getEl('logsTableBody'), closeLogsModal = getEl('closeLogsModal');
    const paginationControls = getEl('paginationControls'), prevPageBtn = getEl('prevPageBtn'), nextPageBtn = getEl('nextPageBtn'), pageInfo = getEl('pageInfo'), rowsPerPageSelect = getEl('rowsPerPageSelect'), exportDataBtn = getEl('exportDataBtn');
    const chartContainer = getEl('chartContainer'), mainChartCanvas = getEl('mainChart'), chartMetricSelect = getEl('chartMetricSelect'), toggleChartBtn = getEl('toggleChartBtn'), sidebarChartCanvas = getEl('sidebarChart');
    const mainDisplayArea = getEl('mainDisplayArea'), recruiterPerformanceArea = getEl('recruiterPerformanceArea');
    const logDateRangePickerEl = getEl('logDateRangePicker'), exportLogsBtn = getEl('exportLogsBtn');

    // --Applicant Requirement Selector
    const requirementsModal = getEl('requirementsModal');
    const requirementsForm = getEl('requirementsForm');
    const saveRequirementsBtn = getEl('saveRequirementsBtn');
    const closeRequirementsModal = getEl('closeRequirementsModal');
    const cancelRequirementsBtn = getEl('cancelRequirementsBtn');
    const reqProgressBar = getEl('reqProgressBar');
    const reqProgressText = getEl('reqProgressText');
    
    // --- HELPER FUNCTIONS ---
    function getStatusColorClass(statusText) { 
        if (!statusText) return 'bg-gray-100 text-gray-800'; 
        statusText = statusText.toLowerCase(); 
        if (statusText.includes('failed') || statusText.includes('withdrawn') || statusText.includes('declined')) return 'bg-red-100 text-red-800'; 
        if (statusText.includes('deployed')) return 'bg-green-100 text-green-800'; 
        if (statusText.includes('job offer') || statusText.includes('onboarding') || statusText.includes('bgv')) return 'bg-blue-100 text-blue-800'; 
        if (statusText.includes('interview')) return 'bg-yellow-100 text-yellow-800'; 
        return 'bg-gray-100 text-gray-800'; 
    }

    function getLocalDateString(dateObj) {
        if (!dateObj) return null;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-11
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getScoreColorClass(score) {
        const val = parseInt(score);
        if (val >= 70) return 'score-high';
        if (val >= 40) return 'score-mid';
        return 'score-low';
    }

    function formatDate(dateString) { 
        if (!dateString) return 'N/A'; 
        const date = new Date(dateString); 
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); 
    }
    
    
    // --- INITIALIZATION ---
    async function initializeDashboard() {
        try {
            // Anti-cache: force fresh user data
            const userRes = await fetch(`${API_URL}?action=getUserInfo&_t=${new Date().getTime()}`);
            if (!userRes.ok) throw new Error("Authentication failed");
            const userInfo = await userRes.json();
            USER_ROLE = userInfo.role || 'hr_staff'; 

            // ============================================================
            // --- NEW: RESTRICT RECRUITER SCORES TO MANAGERS ONLY ---
            // ============================================================
            if (viewRecruiterBtn) {
                if (USER_ROLE === 'hr_manager' || USER_ROLE === 'super_user') {
                    // Show button for Managers
                    viewRecruiterBtn.classList.remove('hidden');
                    viewRecruiterBtn.style.display = 'inline-block'; 
                } else {
                    // Hide button for everyone else (Staff)
                    viewRecruiterBtn.classList.add('hidden');
                    viewRecruiterBtn.style.display = 'none';
                    
                    // Safety: If they are somehow on the recruiters view, kick them back to active
                    if (currentView === 'recruiters') {
                        currentView = 'active';
                        viewActiveBtn.click();
                    }
                }
            }
            
            // --- LOAD SAVED COLUMN PREFERENCES ---
            if (userInfo.preferences && userInfo.preferences.visibleColumns) {
                const savedCols = userInfo.preferences.visibleColumns;
                const validCols = savedCols.filter(key => ALL_COLUMNS.some(c => c.key === key));
                
                // Safety checks for essential columns
                if (!validCols.includes('select')) validCols.unshift('select');
                if (!validCols.includes('actions')) validCols.push('actions');
                
                visibleColumns = validCols;
            }

            initializePlugins(); 
            await refreshAllData();
            setupColumnSelector();
            addEventListeners();
        } catch (error) {
            console.error("Init Error:", error);
            document.body.innerHTML = `<div class="p-8 text-center text-red-600 font-semibold">Error: ${error.message}. Please log in.</div>`;
        }
    }

    function initializePlugins() {
        const today = new Date();
        const last7 = new Date(); last7.setDate(today.getDate() - 6);
        const last30 = new Date(); last30.setDate(today.getDate() - 29);
    
        dateRangePicker = new Litepicker({
            element: document.getElementById('dateRangePicker'),
            singleMode: false,
            allowRepick: true,
            autoApply: false,
            resetButton: true,
            plugins: ['ranges'],
            ranges: {
                'Last 7 Days': [last7, today],
                'Last 30 Days': [last30, today],
            },
            setup: (picker) => {
                picker.on('selected', () => refreshAllData());
                picker.on('clear:selection', () => refreshAllData());
            }
        });
    }

    // --- DATA FETCHING ---
    async function refreshAllData() { 
        updateHeaderDates();
        await fetchDropdownAndStatusData();
        await Promise.all([fetchData(), fetchChartData(), fetchRecruiterPerformance()]);
    }

    async function fetchDropdownAndStatusData() { 
        try { 
            // FIXED: Use Local Date String
            const startDate = getLocalDateString(dateRangePicker.getStartDate()?.toJSDate()); 
            const endDate = getLocalDateString(dateRangePicker.getEndDate()?.toJSDate());
            
            let statusUrl = `${API_URL}?action=getStatusCounts&view=${currentView}&_t=${new Date().getTime()}`;
            if (startDate && endDate) { statusUrl += `&start_date=${startDate}&end_date=${endDate}`; }
            
            const [statusRes, dropdownRes] = await Promise.all([
                fetch(statusUrl), 
                fetch(`${API_URL}?action=getDropdownData`)
            ]); 
            
            const statusCounts = await statusRes.json(); 
            dropdownData = await dropdownRes.json(); 
            renderSidebar(statusCounts); 
        } catch (error) { 
            console.error(error); 
            statusFiltersContainer.innerHTML = `<p class="p-4 text-red-500">Could not load filters.</p>`; 
        } 
    }

    async function fetchData() { 
        tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-8">Loading...</td></tr>'; 
        try { 
            // FIXED: Use Local Date String
            const startDate = getLocalDateString(dateRangePicker.getStartDate()?.toJSDate()); 
            const endDate = getLocalDateString(dateRangePicker.getEndDate()?.toJSDate());

            let url = `${API_URL}?action=readAll&status=${currentStatusFilter}&view=${currentView}&_t=${new Date().getTime()}`;
            // IMPORTANT: Pass dates to readAll API too if you want server-side filtering
            // For now, client-side filtering handles it, but this keeps variables consistent.
            
            const response = await fetch(url); 
            if (!response.ok) throw new Error('Network response was not ok.'); 
            allApplicants = await response.json(); 
            currentPage = 1; 
            selectedApplicants = [];
            const selectAll = document.getElementById('selectAllCheckbox');
            if (selectAll) selectAll.checked = false;
            renderAll(); 
        } catch (error) { 
            tableBody.innerHTML = `<tr><td colspan="99" class="text-center p-8 text-red-500">Failed to load data: ${error.message}</td></tr>`; 
        } 
    }

    async function fetchChartData() { 
        try { 
            const metric = chartMetricSelect.value;
            // FIXED: Use Local Date String
            const startDate = getLocalDateString(dateRangePicker.getStartDate()?.toJSDate()); 
            const endDate = getLocalDateString(dateRangePicker.getEndDate()?.toJSDate());
            
            let chartUrl = `${API_URL}?action=getChartData&metric=${metric}&_t=${new Date().getTime()}`;
            if (startDate && endDate) { chartUrl += `&start_date=${startDate}&end_date=${endDate}`; }
            
            const response = await fetch(chartUrl);
            const chartData = await response.json();
            renderMainChart(chartData, metric);
            
            const sidebarResponse = await fetch(`${API_URL}?action=getChartData&metric=deploymentTrend&days=7`);
            const sidebarData = await sidebarResponse.json();
            renderSidebarChart(sidebarData);
        } catch (error) { console.error('Failed to load chart data:', error); } 
    }

    async function fetchRecruiterPerformance() { 
        try { 
            // FIXED: Use Local Date String
            const startDate = getLocalDateString(dateRangePicker.getStartDate()?.toJSDate()); 
            const endDate = getLocalDateString(dateRangePicker.getEndDate()?.toJSDate());

            let perfUrl = `${API_URL}?action=getRecruiterPerformance`;
            if (startDate && endDate) { perfUrl += `&start_date=${startDate}&end_date=${endDate}`; }
            
            const response = await fetch(perfUrl);
            allRecruiterData = await response.json();
            renderRecruiterPerformance();
        } catch (error) { console.error('Failed to load recruiter performance:', error); } 
    }
    // --- RENDERING ---
    function renderAll() {
        const dataToDisplay = getFilteredAndSortedData();
        window.dashboardGlobals.getFilteredIds = () => dataToDisplay.map(a => a.application_id);

        if (currentView === 'recruiters') {
            mainDisplayArea.firstElementChild.classList.add('hidden');
            recruiterPerformanceArea.classList.remove('hidden');
            paginationControls.classList.add('hidden');
        } else {
            mainDisplayArea.firstElementChild.classList.remove('hidden');
            recruiterPerformanceArea.classList.add('hidden');
            if (dataToDisplay.length > 0) paginationControls.classList.remove('hidden'); else paginationControls.classList.add('hidden');
            renderTable(paginateData(dataToDisplay));
            renderPagination(dataToDisplay.length);
        }
        updateAnalytics(dataToDisplay);
        // Important: Update checkbox state in case columns were removed via header
        setupColumnSelector(); 
    }
    
    function getFilteredAndSortedData() {
        const searchTerm = searchInput.value.toLowerCase();
        const searchField = searchFieldSelector ? searchFieldSelector.value : 'firstname';
        const startDate = dateRangePicker.getStartDate()?.toJSDate();
        const endDate = dateRangePicker.getEndDate()?.toJSDate();
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        let filteredData = allApplicants.filter(applicant => {
            let matchesSearch = false;
            if (!searchTerm) matchesSearch = true;
            else if (applicant[searchField]) matchesSearch = String(applicant[searchField]).toLowerCase().includes(searchTerm);
            
            if (!startDate && !endDate) return matchesSearch;
            const appDateStr = applicant.application_date || applicant.status_date; 
            const matchesDate = (!startDate || new Date(appDateStr) >= startDate) && (!endDate || new Date(appDateStr) <= endDate);
            return matchesSearch && matchesDate;
        });

        filteredData.sort((a, b) => { 
            const valA = a[sortConfig.key] || '', valB = b[sortConfig.key] || ''; 
            if (sortConfig.key === 'screening_score') return sortConfig.direction === 'asc' ? (valA - valB) : (valB - valA);
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; 
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; 
            return 0; 
        });
        return filteredData;
    }

    function paginateData(data) { const start = (currentPage - 1) * rowsPerPage; const end = start + rowsPerPage; return data.slice(start, end); }
    function renderPagination(totalItems) { const totalPages = Math.ceil(totalItems / rowsPerPage); pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`; prevPageBtn.disabled = currentPage === 1; nextPageBtn.disabled = currentPage >= totalPages; }

    function renderTable(applicants) {
        // --- HEADER RENDER (With Drag & Drop + Remove Btn) ---
        let headerHTML = '<tr>';
        visibleColumns.forEach((colKey, index) => { 
            const colConfig = ALL_COLUMNS.find(c => c.key === colKey);
            if (!colConfig) return;

            let sortClass = sortConfig.key === colConfig.key ? sortConfig.direction : ''; 
            const isDraggable = colKey !== 'select' && colKey !== 'actions' ? 'draggable="true"' : '';
            const dragClass = colKey !== 'select' && colKey !== 'actions' ? 'cursor-move hover:bg-gray-200' : '';

            // Create Remove Button (Small X)
            let removeBtn = '';
            if (colKey !== 'select' && colKey !== 'actions') {
                removeBtn = `<span class="remove-col-btn ml-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Hide Column" data-key="${colKey}"><i class="fas fa-times"></i></span>`;
            }

            if (colKey === 'select') {
                // Compact header for checkbox
                headerHTML += `<th scope="col" class="px-2 py-2 w-8 text-center sticky left-0 bg-gray-50 z-10">${colConfig.label}</th>`;
            } else {
                // UPDATED: Reduced padding (px-2), smaller font (text-xs), and added max-width constraints
                headerHTML += `<th scope="col" class="px-2 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 sortable ${sortClass} ${dragClass}" ${isDraggable} data-key="${colKey}" data-index="${index}" style="min-width: 100px; max-width: 200px;">
                    <div class="flex items-center justify-between truncate">
                        <span class="truncate" title="${colConfig.label}">${colConfig.label}</span>
                        ${removeBtn}
                    </div>
                </th>`; 
            }
        });
        headerHTML += '</tr>'; 
        tableHead.innerHTML = headerHTML;
        
        // --- ADD DRAG LISTENERS (Unchanged) ---
        const ths = tableHead.querySelectorAll('th[draggable="true"]');
        ths.forEach(th => {
            th.addEventListener('dragstart', handleDragStart);
            th.addEventListener('dragover', handleDragOver);
            th.addEventListener('drop', handleDrop);
            th.addEventListener('dragenter', handleDragEnter);
            th.addEventListener('dragleave', handleDragLeave);
        });

        // --- ADD REMOVE COLUMN LISTENER (Unchanged) ---
        tableHead.querySelectorAll('.remove-col-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const keyToRemove = btn.dataset.key;
                visibleColumns = visibleColumns.filter(c => c !== keyToRemove);
                renderAll();
            });
        });

        let bodyHTML = '';
        if (applicants.length > 0) {
            applicants.forEach(applicant => {
                const isSelected = selectedApplicants.includes(parseInt(applicant.application_id));
                bodyHTML += `<tr class="bg-white border-b hover:bg-gray-50 transition duration-150 ease-in-out">`;
                
                visibleColumns.forEach(colKey => { 
                    const colConfig = ALL_COLUMNS.find(c => c.key === colKey);
                    if (!colConfig) return;
                
                    let content = applicant[colKey] === null || applicant[colKey] === undefined ? '' : applicant[colKey];
                    
                    // Format Names to Title Case
                    if (['surname', 'firstname', 'middlename', 'email','street_address','city','province'].includes(colKey) && typeof content === 'string') {
                        content = content.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
                    }

                    if (colKey === 'surname') {
                        let completedItems = [];
                        try { completedItems = JSON.parse(applicant.requirements_checklist || '[]'); } catch(e) { completedItems = []; }
                        const isComplete = completedItems.length >= 14;
                        const colorClass = isComplete ? 'text-green-600 font-bold' : 'text-blue-600 font-semibold';
                        const icon = isComplete ? '<i class="fas fa-check-circle ml-1 text-xs"></i>' : '';
                        content = `<button class="req-btn hover:underline text-left truncate w-full ${colorClass}" data-id="${applicant.application_id}" title="Click to view requirements">${content} ${icon}</button>`;
                    }

                    
                    if (colKey === 'select') {
                        content = (currentView === 'active') ? `<div class="flex justify-center"><input type="checkbox" class="applicant-checkbox h-4 w-4 text-blue-600 rounded" data-id="${applicant.application_id}" ${isSelected ? 'checked' : ''}></div>` : '';
                    }
                    else if (colKey === 'screening_score') {
                        content = `<span class="${getScoreColorClass(content)} px-2 py-0.5 rounded text-xs font-semibold">${content}</span>`;
                    }
                    else if (colKey === 'recruitment_status_text') { 
                        if (currentView === 'active') {
                            const fullColorClass = getStatusColorClass(content);
                            const bgColor = fullColorClass.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-100';
                            let options = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicant.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                            // Compact Select
                            content = `<div class="${bgColor} rounded-md px-1"><select class="table-select bg-transparent border-none w-full focus:ring-0 p-0 text-xs font-semibold cursor-pointer" data-id="${applicant.application_id}" data-field="recruitment_status">${options}</select></div>`;
                        } else {
                            const fullColorClass = getStatusColorClass(content);
                            content = `<span class="px-2 py-0.5 font-semibold leading-tight ${fullColorClass} rounded-full text-[10px]">${content}</span>`;
                        }
                    } 
                    else if (colKey === 'actions') { 
                        content = currentView === 'active' 
                            ? `<button class="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs edit-btn" data-id="${applicant.application_id}">Edit</button>` 
                            : `<button class="text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs restore-btn" data-id="${applicant.application_id}">Restore</button>`; 
                    }
                    
                    else if (colKey === 'interview_dates') {
                        if (content) {
                            const dateObj = new Date(content);
                            // Formats to: "Oct 24, 2025, 10:30 AM"
                            content = `<span class="whitespace-nowrap font-medium text-blue-700">
                                ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                                <span class="text-gray-500 text-[10px] ml-1">${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>`;
                        } else {
                            content = '-';
                        }
                    }

                    // Generic Date Format (Date Only)
                    else if (colKey.includes('date')) { 
                        content = `<span class="whitespace-nowrap">${formatDate(content)}</span>`; 
                    }
                    else if (colKey === 'recruiter_name' && currentView === 'active') {
                         let options = `<option value="">-</option>` + dropdownData.recruiters.map(r => `<option value="${r}" ${r === content ? 'selected' : ''}>${r.split(',')[0]}</option>`).join(''); 
                         content = `<select class="table-select text-xs p-1 border border-gray-200 rounded w-full" data-id="${applicant.application_id}" data-field="recruiter_name">${options}</select>`; 
                    }

                    // --- CRITICAL UPDATE FOR COMPRESSION ---
                    // 1. px-2 py-2: Reduces padding significantly
                    // 2. text-xs: Makes font smaller
                    // 3. whitespace-normal: Allows text to wrap to the next line (vertical growth)
                    // 4. break-words: Breaks long emails so they don't widen the column
                    // 5. max-w-[150px]: Hard limit on width
                    
                    let cellClass = "px-2 py-2 text-xs text-gray-700 whitespace-normal break-words align-middle";
                    let style = "max-width: 150px;"; 

                    if (colKey === 'select') { 
                        cellClass = "px-2 py-2 w-8 sticky left-0 bg-white z-0"; // Keep checkbox sticky
                        style = "";
                    } else if (colKey === 'email') {
                         style = "max-width: 180px; word-break: break-all;"; // Special handling for emails
                    }

                    bodyHTML += `<td class="${cellClass}" style="${style}">${content}</td>`;
                });
                bodyHTML += '</tr>';
            });
        } else { bodyHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center p-8 text-gray-500">No applicants found for this filter.</td></tr>`; }
        tableBody.innerHTML = bodyHTML;
    }

    // --- REQUIREMENTS MODAL LOGIC ---
    
    function updateReqProgress() {
        const checkboxes = requirementsForm.querySelectorAll('input[name="req_item"]');
        const checked = requirementsForm.querySelectorAll('input[name="req_item"]:checked');
        const total = checkboxes.length; // Should be 14
        const count = checked.length;
        
        // Update Text & Bar
        reqProgressText.textContent = `${count} / ${total}`;
        const pct = Math.round((count / total) * 100);
        reqProgressBar.style.width = `${pct}%`;
        
        // Change bar color based on completeness
        if(pct === 100) {
            reqProgressBar.classList.remove('bg-blue-600');
            reqProgressBar.classList.add('bg-green-500');
        } else {
            reqProgressBar.classList.add('bg-blue-600');
            reqProgressBar.classList.remove('bg-green-500');
        }
    }

    function openRequirementsModal(applicant) {
        // 1. Reset Form & Set IDs
        requirementsForm.reset();
        getEl('req_application_id').value = applicant.application_id;
        getEl('reqApplicantName').textContent = `${applicant.surname}, ${applicant.firstname}`;

        // 2. Load Saved Data
        let savedReqs = [];
        try { 
            savedReqs = JSON.parse(applicant.requirements_checklist || '[]'); 
        } catch(e) { console.error('JSON Parse error', e); }

        // 3. Check the boxes
        const checkboxes = requirementsForm.querySelectorAll('input[name="req_item"]');
        checkboxes.forEach(cb => {
            if (savedReqs.includes(cb.value)) cb.checked = true;
        });

        // 4. Update UI & Show
        updateReqProgress();
        requirementsModal.classList.remove('hidden');
    }

    async function saveRequirements() {
        const id = getEl('req_application_id').value;
        const checkboxes = requirementsForm.querySelectorAll('input[name="req_item"]:checked');
        
        // Convert checked items to Array -> JSON String
        const checkedValues = Array.from(checkboxes).map(cb => cb.value);
        const jsonString = JSON.stringify(checkedValues);

        // Show Loading
        saveRequirementsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
        saveRequirementsBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=updateApplicant`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    application_id: id, 
                    requirements_checklist: jsonString 
                }) 
            });
            const result = await response.json();
            
            if(result.status !== 'success') throw new Error(result.message);

            // Update Local Data immediately to reflect color change
            const applicant = allApplicants.find(a => a.application_id == id);
            if(applicant) {
                applicant.requirements_checklist = jsonString;
            }

            renderAll(); // Re-render table to show Green/Blue color
            requirementsModal.classList.add('hidden');
            Swal.fire({ icon: 'success', title: 'Saved', text: 'Requirements checklist updated.', timer: 1000, showConfirmButton: false });

        } catch (error) {
            alert('Save failed: ' + error.message);
        } finally {
            saveRequirementsBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Checklist';
            saveRequirementsBtn.disabled = false;
        }
    }

    // --- DRAG & DROP HANDLERS ---
    function handleDragStart(e) {
        dragSrcColumn = e.target.closest('th');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcColumn.dataset.key);
        dragSrcColumn.classList.add('opacity-50', 'bg-blue-100');
    }

    function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); return false; }

    function handleDragEnter(e) {
        const target = e.target.closest('th');
        if (target && target !== dragSrcColumn && target.getAttribute('draggable') === 'true') {
            target.classList.add('border-l-4', 'border-blue-500');
        }
    }

    function handleDragLeave(e) {
        const target = e.target.closest('th');
        if (target) target.classList.remove('border-l-4', 'border-blue-500');
    }

    function handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();
        const targetTh = e.target.closest('th');
        if (dragSrcColumn && targetTh && targetTh !== dragSrcColumn && targetTh.getAttribute('draggable') === 'true') {
            const srcKey = dragSrcColumn.dataset.key;
            const destKey = targetTh.dataset.key;
            const srcIndex = visibleColumns.indexOf(srcKey);
            const destIndex = visibleColumns.indexOf(destKey);
            if (srcIndex > -1 && destIndex > -1) {
                visibleColumns.splice(srcIndex, 1);
                visibleColumns.splice(destIndex, 0, srcKey);
                renderAll();
            }
        }
        if (dragSrcColumn) dragSrcColumn.classList.remove('opacity-50', 'bg-blue-100');
        tableHead.querySelectorAll('th').forEach(th => th.classList.remove('border-l-4', 'border-blue-500'));
        return false;
    }
    
    function renderRecruiterPerformance() {
        recruiterPerformanceArea.innerHTML = '';
        if (allRecruiterData.length > 0) {
            allRecruiterData.sort((a, b) => b.total_deployed - a.total_deployed);
            allRecruiterData.forEach(recruiter => {
                const cardHTML = `
                    <div class="bg-gray-50 p-4 rounded-lg shadow border">
                        <h3 class="font-bold text-lg text-gray-800">${recruiter.recruiter_name}</h3>
                        <div class="mt-2 space-y-1 text-sm text-gray-600">
                            <p><span class="font-semibold">Total Handled:</span> ${recruiter.total_handled}</p>
                            <p><span class="font-semibold">Total Deployed:</span> ${recruiter.total_deployed}</p>
                            <p><span class="font-semibold">Acceptance Rate:</span> ${recruiter.acceptance_rate}%</p>
                            <p><span class="font-semibold">Withdrawal Rate:</span> ${recruiter.withdrawal_rate}%</p>
                            <p><span class="font-semibold">Avg. Time to Hire:</span> ${recruiter.avg_time_to_hire ? recruiter.avg_time_to_hire + ' days' : 'N/A'}</p>
                        </div>
                    </div>
                `;
                recruiterPerformanceArea.innerHTML += cardHTML;
            });
        } else {
            recruiterPerformanceArea.innerHTML = `<p class="text-center col-span-full text-gray-500">No recruiter performance data available for the selected period.</p>`;
        }
    }
    
    function renderMainChart(data, metric) {
        // Helper to parse "YYYY-MM-DD" into a Local Date Object
        function parseLocalDate(dateStr) {
            if (!dateStr) return null;
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        const chartContainer = mainChartCanvas.parentElement;
        chartContainer.style.height = '350px'; 
        mainChartCanvas.style.height = '100%';
        mainChartCanvas.style.width = '100%';
        
        let labels = [], counts = [];
        // Use Litepicker dates directly
        let startDate = dateRangePicker?.getStartDate()?.toJSDate();
        let endDate = dateRangePicker?.getEndDate()?.toJSDate();
        
        // Default to current month if no range selected
        if (!startDate || !endDate) {
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), 1); 
            endDate = today; 
        } else {
            // Ensure times are normalized to prevent infinite loops or partial day issues
            startDate.setHours(0,0,0,0);
            endDate.setHours(23,59,59,999);
        }
    
        if (metric === 'applicantTrend' || metric === 'deploymentTrend') {
            // --- LINE CHART LOGIC ---
            const dataMap = new Map(data.map(d => [d.date, d.count]));
            const fullLabels = [], fullCounts = [];
            
            // Clone start date to iterate
            let currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                // --- FIX: Use getLocalDateString instead of toISOString ---
                // This prevents "Jan 1" from turning into "Dec 31"
                const dateString = getLocalDateString(currentDate); 
                
                // Create Label (e.g., "Jan 1")
                fullLabels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                
                // Match with API Data
                fullCounts.push(dataMap.get(dateString) || 0);
                
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }

            labels = fullLabels; 
            counts = fullCounts;
            
            const datasetLabel = metric === 'applicantTrend' ? 'New Applicants' : 'Deployments';
            const borderColor = metric === 'applicantTrend' ? '#3b82f6' : '#10b981';
            const backgroundColor = metric === 'applicantTrend' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)';
    
            const chartConfig = {
                type: 'line',
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        label: datasetLabel, 
                        data: counts, 
                        fill: true, 
                        backgroundColor: backgroundColor, 
                        borderColor: borderColor, 
                        borderWidth: 2, 
                        tension: 0.4, 
                        pointRadius: 3, 
                        pointHoverRadius: 5 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#e5e7eb' }, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } } 
                }
            };
            if (mainChartInstance) mainChartInstance.destroy();
            mainChartInstance = new Chart(mainChartCanvas, chartConfig);

        } else if (metric === 'topSources' || metric === 'screeningPerformance') {
            // ... (Keep existing Pie/Doughnut Chart Logic unchanged) ...
            // Just copy your existing 'else if' block for pie charts here.
             // --- PROFESSIONAL PIE/DOUGHNUT CHART LOGIC ---
            labels = data.map(d => d.label || d.source);
            counts = data.map(d => d.count);
            
            // Professional Color Palette (Modern UI)
            const backgroundColors = [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
            ];

            const chartConfig = {
                type: 'doughnut', // 'Doughnut' looks more modern than 'Pie'
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        data: counts, 
                        backgroundColor: backgroundColors.slice(0, labels.length),
                        borderColor: '#ffffff', // White borders between slices
                        borderWidth: 2,
                        hoverOffset: 4
                    }] 
                },
                // REGISTER THE PLUGIN HERE
                plugins: [ChartDataLabels], 
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    layout: { padding: 20 },
                    plugins: { 
                        legend: { 
                            position: 'right',
                            labels: {
                                usePointStyle: true, // Use circles instead of squares in legend
                                padding: 20,
                                font: { size: 12, family: "'Inter', sans-serif" }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#1f2937',
                            bodyColor: '#1f2937',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 4,
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) { label += ': '; }
                                    let value = context.raw;
                                    return label + value;
                                }
                            }
                        },
                        // CONFIGURATION FOR LABELS INSIDE THE CHART
                        datalabels: {
                            color: '#ffffff',
                            font: { weight: 'bold', size: 11 },
                            formatter: (value, ctx) => {
                                let sum = 0;
                                let dataArr = ctx.chart.data.datasets[0].data;
                                dataArr.map(data => { sum += data; });
                                let percentage = (value * 100 / sum).toFixed(1) + "%";
                                return percentage; // Display Percentage
                            },
                            display: function(context) {
                                // Hide label if value is less than 5% to avoid clutter
                                var index = context.dataIndex;
                                var value = context.dataset.data[index];
                                var sum = 0;
                                context.dataset.data.map(data => { sum += data; });
                                return (value * 100 / sum) > 5; 
                            }
                        }
                    } 
                }
            };
            if (mainChartInstance) mainChartInstance.destroy();
            mainChartInstance = new Chart(mainChartCanvas, chartConfig);
        }
    }

    function renderSidebarChart(data) {
        const chartContainer = sidebarChartCanvas.parentElement;
        chartContainer.style.height = '200px';
        sidebarChartCanvas.style.height = '100%';
        sidebarChartCanvas.style.width = '100%';
        const today = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            last7Days.push(date.toISOString().slice(0, 10));
        }
        const dataMap = {};
        data.forEach(d => { dataMap[new Date(d.date).toISOString().slice(0, 10)] = d.count; });
        const chartData = last7Days.map(date => ({ date, count: dataMap[date] || 0 }));
        const labels = chartData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const counts = chartData.map(d => d.count);
    
        if (sidebarChartInstance) {
            sidebarChartInstance.data.labels = labels;
            sidebarChartInstance.data.datasets[0].data = counts;
            sidebarChartInstance.update();
        } else {
            sidebarChartInstance = new Chart(sidebarChartCanvas, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Deployments', data: counts, backgroundColor: '#10b981', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }
            });
        }
    }

    function renderSidebar(statusCounts) { 
        let sidebarHTML = `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="all"><span>All Applicants</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${statusCounts.all || 0}</span></a>`; 
        Object.entries(statusCounts).forEach(([statusId, data]) => { 
            if (statusId !== 'all' && statusId !== 'qualified_total') { 
                sidebarHTML += `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="${statusId}"><span>${data.name}</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${data.count}</span></a>`; 
            } 
        }); 
        statusFiltersContainer.innerHTML = sidebarHTML; 
        const activeLink = document.querySelector(`.filter-link[data-status="${currentStatusFilter}"]`); 
        if (activeLink) activeLink.classList.add('active');
    }

    function updateAnalytics(applicants) {
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
    
        safeSetText('totalApplicants', applicants.length);
        const qualified = applicants.filter(a => parseInt(a.screening_score || 0) >= 70).length;
        safeSetText('qualifiedCount', qualified);
        const interviewing = applicants.filter(a => ['3', '5'].includes(String(a.recruitment_status_id))).length;
        safeSetText('interviewingCount', interviewing);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const deployedThisMonth = applicants.filter(a => {
            if (a.recruitment_status_id != '13' || !a.joining_date) return false;
            const joiningDate = new Date(a.joining_date);
            return joiningDate.getMonth() === currentMonth && joiningDate.getFullYear() === currentYear;
        }).length;
        safeSetText('deployedThisMonth', deployedThisMonth);
        const hiredApplicants = applicants.filter(a => a.joining_date && a.application_date && a.recruitment_status_id == '13');
        if(hiredApplicants.length > 0) {
            const totalDays = hiredApplicants.reduce((sum, a) => sum + (new Date(a.joining_date) - new Date(a.application_date)), 0);
            const avgDays = Math.round((totalDays / hiredApplicants.length) / (1000 * 60 * 60 * 24));
            safeSetText('avgTimeToHire', `${avgDays} days`);
        } else {
            safeSetText('avgTimeToHire', 'N/A');
        }
    }

    function setupColumnSelector() { 
        columnCheckboxes.innerHTML = ''; 
        ALL_COLUMNS.filter(c => c.key !== 'actions').forEach(col => { 
            const isChecked = visibleColumns.includes(col.key); 
            columnCheckboxes.innerHTML += `<label class="flex items-center space-x-2"><input type="checkbox" class="h-4 w-4" data-key="${col.key}" ${isChecked ? 'checked' : ''}><span>${col.label}</span></label>`; 
        }); 
    }

    async function handleQuickUpdate(applicantId, field, value) { 
        try { 
            const response = await fetch(`${API_URL}?action=updateApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: applicantId, [field]: value, status_date: new Date().toISOString().slice(0, 10) }) }); 
            const result = await response.json(); 
            if (result.status !== 'success') throw new Error(result.message); 
            const applicantToUpdate = allApplicants.find(a => a.application_id == applicantId); 
            if (applicantToUpdate) { 
                applicantToUpdate[field] = value; 
                if (field === 'recruitment_status') { 
                    applicantToUpdate.recruitment_status_id = value; 
                    applicantToUpdate.recruitment_status_text = dropdownData.statuses[value]; 
                } 
            } 
            await fetchDropdownAndStatusData(); 
            renderAll(); 
        } catch (error) { 
            alert('Update failed: ' + error.message); 
            fetchData(); 
        } 
    }
    
    // --- FORM & MODAL LOGIC ---
function buildFormFields(container, applicantData = {}, formType) {
        container.innerHTML = '';
        ALL_COLUMNS.forEach(col => {
            if (!col.editable) return;
            let value = applicantData[col.key] || '';
            const keyForEdit = col.key === 'recruitment_status_text' ? 'recruitment_status_id' : col.key;
            let required = col.required ? 'required' : '';
            let requiredSpan = col.required ? ' <span class="text-red-500">*</span>' : '';
            
            // --- NEW: Edit Button Logic & Styling ---
            let labelHTML = `<label for="${formType}_${keyForEdit}" class="block text-sm font-medium text-gray-700">${col.label}${requiredSpan}</label>`;
            
            if (formType === 'edit') {
                labelHTML = `
                    <div class="flex justify-between items-end">
                        ${labelHTML}
                        <button type="button" class="text-xs text-blue-600 hover:text-blue-800 unlock-btn mb-1" data-target="${formType}_${keyForEdit}">
                            <i class="fas fa-pencil-alt"></i> Edit
                        </button>
                    </div>
                `;
            }

            // --- NEW: Grayed Out Logic ---
            // If editing, add disabled attribute and gray styling
            const disabledAttr = formType === 'edit' ? 'disabled' : '';
            const bgClass = formType === 'edit' ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white';

            let inputHTML = '';
            
            if (formType === 'add' && col.key === 'recruitment_status_id') return;

            let fieldWrapper = document.createElement('div');
            if (col.key === 'college_degree') fieldWrapper.id = `${formType}_collegeDegreeContainer`;
            if (col.key === 'specific_skill') fieldWrapper.id = `${formType}_specificSkillContainer`;

            switch(col.type) {
                case 'select': 
                    let optionsHTML = `<option value="">- Select -</option>`;
                    let options = [];
                    if (col.options_key === 'statuses') {
                        optionsHTML = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicantData.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                    } 
                    else if (col.key === 'specific_skill' && applicantData.position_applied) {
                        options = positionLogic[applicantData.position_applied]?.options || [];
                        optionsHTML += options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                    }
                    else {
                        options = col.options || dropdownData[col.options_key] || [];
                        optionsHTML += options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                    }
                    // Apply disabled and class
                    inputHTML = `<select id="${formType}_${keyForEdit}" name="${keyForEdit === 'recruitment_status_id' ? 'recruitment_status' : keyForEdit}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm ${bgClass}" ${required} ${disabledAttr}>${optionsHTML}</select>`;
                    break;
                case 'textarea': 
                    inputHTML = `<textarea id="${formType}_${keyForEdit}" name="${keyForEdit}" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm ${bgClass}" ${required} ${disabledAttr}>${value}</textarea>`; 
                    break;
                default: 
                    inputHTML = `<input type="${col.type}" id="${formType}_${keyForEdit}" name="${keyForEdit}" value="${value}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm ${bgClass}" ${required} ${disabledAttr}>`;
            }
            fieldWrapper.innerHTML = labelHTML + inputHTML;
            container.appendChild(fieldWrapper);

            // Handle "Other" degree field visibility and locking
            if (col.key === 'college_degree') {
                let otherWrapper = document.createElement('div');
                otherWrapper.id = `${formType}_otherDegreeContainer`;
                otherWrapper.className = 'hidden mt-2'; 
                
                // Show "Other" field if value is "Other"
                if (value === 'Other') {
                    otherWrapper.classList.remove('hidden');
                }

                otherWrapper.innerHTML = `
                    <div class="flex justify-between items-end">
                        <label for="${formType}_college_degree_other" class="block text-sm font-medium text-gray-700">If "Other", please specify</label>
                        ${formType === 'edit' ? `<button type="button" class="text-xs text-blue-600 hover:text-blue-800 unlock-btn mb-1" data-target="${formType}_college_degree_other"><i class="fas fa-pencil-alt"></i> Edit</button>` : ''}
                    </div>
                    <input type="text" id="${formType}_college_degree_other" name="college_degree_other" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm ${bgClass}" ${disabledAttr}>
                `;
                container.appendChild(otherWrapper);
            }
        });
        
        const eduSelect = document.getElementById(`${formType}_education_level`);
        const degreeContainer = document.getElementById(`${formType}_collegeDegreeContainer`);
        if(eduSelect && degreeContainer) {
            degreeContainer.classList.toggle('hidden', eduSelect.value !== 'College Graduate' && eduSelect.value !== 'Post Graduate');
        }
    }

    function openEditModal(applicant) { 
        editApplicationIdInput.value = applicant.application_id; 
        if(document.getElementById('edit_screening_score_display')) {
            document.getElementById('edit_screening_score_display').textContent = applicant.screening_score || '0';
            document.getElementById('edit_screening_status_display').textContent = applicant.screening_status || 'Pending';
        }
        buildFormFields(editFormContent, applicant, 'edit'); 
        deleteBtn.style.display = USER_ROLE === 'hr_manager' || USER_ROLE === 'super_user' ? 'inline-block' : 'none'; 
        editModal.classList.remove('hidden'); 
    }
    
    function openAddApplicantModal() { 
        addApplicantForm.reset(); 
        buildFormFields(addFormContent, {}, 'add'); 
        addApplicantModal.classList.remove('hidden'); 
    }
    
    async function openLogsModal() {
        logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">Loading logs...</td></tr>`;
        logsModal.classList.remove('hidden');
        try {
            const response = await fetch(`${API_URL}?action=getSystemLogs`);
            if (!response.ok) throw new Error('Failed to fetch logs.');
            const logs = await response.json();
            let logsHTML = '';
            if (logs.length > 0) { logs.forEach(log => { logsHTML += `<tr class="border-b"><td class="px-6 py-4">${log.timestamp}</td><td class="px-6 py-4">${log.username}</td><td class="px-6 py-4 font-semibold">${log.action_type}</td><td class="px-6 py-4">${log.action_description}</td></tr>`; }); } 
            else { logsHTML = `<tr><td colspan="4" class="text-center p-4">No system logs found.</td></tr>`; }
            logsTableBody.innerHTML = logsHTML;
        } catch (error) { logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">${error.message}</td></tr>`; }
    }

    function exportVisibleData() {
        const dataToExport = getFilteredAndSortedData();
        if (dataToExport.length === 0) { alert('No data to export.'); return; }
        const headers = visibleColumns.map(key => ALL_COLUMNS.find(c => c.key === key).label).filter(label => label !== 'Actions');
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
        dataToExport.forEach(row => { const rowData = visibleColumns.map(key => { if (key === 'actions') return null; let cellData = row[key] === null || row[key] === undefined ? '' : String(row[key]); cellData = cellData.includes(',') ? `"${cellData.replace(/"/g, '""')}"` : cellData; return cellData; }).filter(data => data !== null); csvContent += rowData.join(",") + "\n"; });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `applicant_data_${currentView}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function updateHeaderDates() {
        const start = dateRangePicker.getStartDate();
        const end = dateRangePicker.getEndDate();
        
        let label = "All Time";
        
        if (start && end) {
            // UPDATED: Changed year to 'numeric'
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            
            const startStr = start.toJSDate().toLocaleDateString('en-US', options);
            const endStr = end.toJSDate().toLocaleDateString('en-US', options);
            
            // Result: "Oct 24, 2025 - Nov 24, 2025"
            label = `${startStr} - ${endStr}`;
        }

        // Update all badges
        const badges = [
            'dateBadge_total', 
            'dateBadge_qualified', 
            'dateBadge_interviewing', 
            'dateBadge_deployed'
        ];

        badges.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = label;
        });
    }
    
    // --- EVENT LISTENERS ---
    function addEventListeners() {
        searchInput.addEventListener('input', () => { currentPage = 1; renderAll(); });
        rowsPerPageSelect.addEventListener('change', (e) => { currentPage = 1; rowsPerPage = parseInt(e.target.value, 10); renderAll(); });
        prevPageBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderAll(); } });
        nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(getFilteredAndSortedData().length / rowsPerPage); if(currentPage < totalPages) { currentPage++; renderAll(); } });
        
        const viewButtons = { active: viewActiveBtn, archived: viewArchivedBtn, recruiters: viewRecruiterBtn };
        Object.entries(viewButtons).forEach(([view, btn]) => {
            btn.addEventListener('click', () => {
                Object.values(viewButtons).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = view;
                refreshAllData();
            });
        });
        
        viewLogsBtn.addEventListener('click', openLogsModal);
        closeLogsModal.addEventListener('click', () => logsModal.classList.add('hidden'));
        columnToggleBtn.addEventListener('click', () => columnSelector.classList.remove('hidden'));
        closeColumnSelector.addEventListener('click', () => columnSelector.classList.add('hidden'));
        cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
        newApplicantBtn.addEventListener('click', openAddApplicantModal);
        cancelAddBtn.addEventListener('click', () => addApplicantModal.classList.add('hidden'));
        
        columnCheckboxes.addEventListener('change', e => { 
            if(e.target.type === 'checkbox') { 
                const key = e.target.dataset.key; 
                if (e.target.checked) { if (!visibleColumns.includes(key)) visibleColumns.push(key); } 
                else { visibleColumns = visibleColumns.filter(col => col !== key); } 
                renderAll(); 
            } 
        });
        
        statusFiltersContainer.addEventListener('click', e => { 
            e.preventDefault(); 
            const target = e.target.closest('.filter-link'); 
            if (target) { 
                const activeLink = document.querySelector('.filter-link.active'); 
                if(activeLink) activeLink.classList.remove('active'); 
                target.classList.add('active'); 
                currentStatusFilter = target.dataset.status; 
                fetchData(); 
            } 
        });

        if (saveViewBtn) {
            saveViewBtn.addEventListener('click', () => {
                fetch(`${API_URL}?action=saveColumnPrefs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ columns: visibleColumns })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') Swal.fire('Saved!', data.message, 'success');
                    else Swal.fire('Error', data.message, 'error');
                });
            });
        }

        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                Swal.fire({
                    title: 'Reset Columns?',
                    text: 'This will revert your column order to the system default.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, reset',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6'
                }).then((result) => {
                    if (result.isConfirmed) {
                        fetch(`${API_URL}?action=resetColumnPrefs`, { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'success') {
                                // FIXED: Manually reset state in JS instantly, no reload needed
                                visibleColumns = [...DEFAULT_VISIBLE_COLUMNS];
                                renderAll();
                                Swal.fire({ icon: 'success', title: 'Reset!', text: 'Columns have been reset to default.', timer: 1500, showConfirmButton: false });
                            } else {
                                Swal.fire('Error', data.message, 'error');
                            }
                        });
                    }
                });
            });
        }

        document.getElementById('logoutBtn').addEventListener('click', () => {
            Swal.fire({
                title: 'Are you sure?',
                text: "You will be logged out of the system.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Red for logout
                cancelButtonColor: '#3085d6', // Blue for cancel
                confirmButtonText: 'Yes, log me out',
                cancelButtonText: 'Stay logged in'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Logging out...',
                        text: 'Please wait.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    
                    setTimeout(() => {
                        window.location.href = '../logout.php'; 
                    }, 800);
                }
            });
        });
        
        tableHead.addEventListener('click', e => { 
            const target = e.target.closest('.sortable'); 
            if (target) { 
                const key = target.dataset.key; 
                if (sortConfig.key === key) { sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'; } 
                else { sortConfig.key = key; sortConfig.direction = 'asc'; } 
                renderAll(); 
            } 
        });
        
        tableBody.addEventListener('change', e => { 
            if (e.target.classList.contains('table-select')) { 
                const applicantId = e.target.dataset.id, field = e.target.dataset.field, value = e.target.value; 
                handleQuickUpdate(applicantId, field, value); 
            } 
        });
        
        tableBody.addEventListener('click', e => { 
            const target = e.target; 
            if(target.classList.contains('edit-btn')) { 
                const applicant = allApplicants.find(a => a.application_id == target.dataset.id); 
                if(applicant) openEditModal(applicant); 
            } 
            if (target.classList.contains('restore-btn')) {
                const id = target.dataset.id;
                Swal.fire({
                    title: 'Restore Applicant?',
                    text: "This will move the applicant back to the Active list.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#10b981',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, restore record',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.showLoading();
                        fetch(`${API_URL}?action=restoreApplicant`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ application_id: id })
                        })
                        .then(res => res.json())
                        .then(result => {
                            if (result.status !== 'success') throw new Error(result.message);
                            Swal.fire({ icon: 'success', title: 'Restored!', text: 'The applicant is now active.', timer: 1500, showConfirmButton: false });
                            fetchData(); 
                        })
                        .catch(err => { Swal.fire({ icon: 'error', title: 'Action Failed', text: err.message }); });
                    }
                });
            }
        });

        tableBody.addEventListener('change', e => {
            if (e.target.classList.contains('applicant-checkbox')) {
                const id = parseInt(e.target.dataset.id);
                if (e.target.checked) { if (!selectedApplicants.includes(id)) selectedApplicants.push(id); }
                else { selectedApplicants = selectedApplicants.filter(aid => aid !== id); document.getElementById('selectAllCheckbox').checked = false; }
            }
        });

        tableHead.addEventListener('change', e => {
            if (e.target.id === 'selectAllCheckbox') {
                const isChecked = e.target.checked;
                const visibleIds = window.dashboardGlobals.getFilteredIds();
                document.querySelectorAll('.applicant-checkbox').forEach(cb => cb.checked = isChecked);
                selectedApplicants = isChecked ? [...visibleIds] : [];
            }
        });

        document.getElementById('applyBulkStatus').addEventListener('click', () => {
            if (!selectedApplicants.length) {
                return Swal.fire({ icon: 'warning', title: 'No Selection', text: 'Please select at least one applicant from the list.', confirmButtonColor: '#3b82f6' });
            }
            const statusDropdown = document.getElementById('bulkStatusDropdown');
            const newStatus = statusDropdown.value;
            const newStatusText = statusDropdown.options[statusDropdown.selectedIndex].text;

            if (!newStatus) {
                return Swal.fire({ icon: 'warning', title: 'No Status Selected', text: 'Please select a status to apply to the selected applicants.', confirmButtonColor: '#3b82f6' });
            }

            Swal.fire({
                title: 'Update Multiple Applicants?',
                text: `You are about to move ${selectedApplicants.length} applicants to "${newStatusText}". This cannot be undone easily.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6', 
                cancelButtonColor: '#6b7280', 
                confirmButtonText: 'Yes, apply update',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'Processing...', text: 'Updating applicant records.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
                    fetch(`${API_URL}?action=bulkUpdateStatus`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ application_ids: selectedApplicants, new_status: parseInt(newStatus) })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            Swal.fire({ icon: 'success', title: 'Batch Update Complete', text: data.message, timer: 2000, showConfirmButton: false });
                            refreshAllData();
                            selectedApplicants = [];
                            document.getElementById('selectAllCheckbox').checked = false;
                            statusDropdown.value = ""; 
                        } else { throw new Error(data.message); }
                    })
                    .catch(err => { Swal.fire({ icon: 'error', title: 'Update Failed', text: err.message || err }); });
                }
            });
        });

        document.addEventListener('change', e => {
            const targetId = e.target.id;
            const formType = targetId.startsWith('add_') ? 'add' : (targetId.startsWith('edit_') ? 'edit' : null);
            if (formType) {
                if (targetId.endsWith('_education_level')) {
                    const degreeContainer = document.getElementById(`${formType}_collegeDegreeContainer`);
                    if (degreeContainer) degreeContainer.classList.toggle('hidden', e.target.value !== 'College Graduate' && e.target.value !== 'Post Graduate');
                }
                if (targetId.endsWith('_college_degree')) {
                    const otherDegreeContainer = document.getElementById(`${formType}_otherDegreeContainer`);
                    if (otherDegreeContainer) otherDegreeContainer.classList.toggle('hidden', e.target.value !== 'Other');
                }
                if (targetId.endsWith('_position_applied')) {
                    const skillSelect = document.getElementById(`${formType}_specific_skill`);
                    if (skillSelect) {
                        const logic = positionLogic[e.target.value];
                        skillSelect.innerHTML = logic ? logic.options.map(o => `<option value="${o}">${o}</option>`).join('') : '<option value="">- No skills needed -</option>';
                    }
                }
            }
        });

        editForm.addEventListener('submit', async e => {
            e.preventDefault();
            
            // 1. TEMPORARILY ENABLE ALL FIELDS SO FORM DATA CAPTURES THEM
            const disabledInputs = editForm.querySelectorAll(':disabled');
            disabledInputs.forEach(el => el.disabled = false);

            if (!editForm.checkValidity()) { 
                editForm.reportValidity(); 
                // If invalid, leave them enabled so user can fix
                return; 
            }
            
            const formData = new FormData(editForm);
            const dataFromForm = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch(`${API_URL}?action=updateApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataFromForm) });
                const result = await response.json();
                if(result.status !== 'success') throw new Error(result.message);
                
                alert('Applicant saved successfully!'); 
                editModal.classList.add('hidden');
                refreshAllData();
            } catch (error) { 
                alert('Save failed: ' + error.message); 
                // Re-disable inputs if save failed (optional, usually better to leave open for retry)
            }
        });

        addApplicantForm.addEventListener('submit', async e => {
            e.preventDefault();
            
            // 1. Validate Form
            if (!addApplicantForm.checkValidity()) { 
                addApplicantForm.reportValidity(); 
                return; 
            }

            // 2. Prepare Data & Force Uppercase
            const formData = new FormData(addApplicantForm);
            // Ensure all text inputs are sent as Uppercase (to match recruitment form standard)
            for (let [key, value] of formData.entries()) {
                if (typeof value === 'string') {
                    formData.set(key, value.toUpperCase());
                }
            }

            const submitUrl = '../recruitment_applicants.php'; 

            // 3. Show Loading Spinner
            Swal.fire({
                title: 'Adding Applicant...',
                text: 'Submitting record to database.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const response = await fetch(submitUrl, { 
                    method: 'POST', 
                    body: formData 
                });
                
                // Handle non-JSON responses (e.g., PHP errors)
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    throw new Error("Server returned unexpected format: " + text.substring(0, 50));
                }

                const result = await response.json();
                
                if (result.status !== 'success') throw new Error(result.message);
                
                // 4. Success Notification
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Applicant added successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });

                // 5. Cleanup & Refresh
                addApplicantModal.classList.add('hidden');
                refreshAllData();
                
            } catch (error) {
                // 6. Error Notification
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: error.message
                });
            }
        });

        deleteBtn.addEventListener('click', async () => {
            const id = editApplicationIdInput.value;
            
            Swal.fire({
                title: 'Archive Applicant?',
                text: "This record will be moved to the Archived view and hidden from the active list.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Red to indicate removal
                cancelButtonColor: '#3085d6', // Blue for cancel
                confirmButtonText: 'Yes, archive record',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Show Loading Spinner
                    Swal.fire({
                        title: 'Archiving...',
                        text: 'Updating database records.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    // Perform API Request
                    fetch(`${API_URL}?action=archiveApplicant`, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ application_id: id }) 
                    })
                    .then(res => res.json())
                    .then(result => {
                        if(result.status !== 'success') throw new Error(result.message);
                        
                        // Success Notification
                        Swal.fire({
                            icon: 'success',
                            title: 'Archived Successfully',
                            text: 'The applicant has been moved to the archives.',
                            timer: 1500,
                            showConfirmButton: false
                        });

                        // Close Modal and Refresh Table
                        editModal.classList.add('hidden');
                        refreshAllData();
                    })
                    .catch(error => {
                        // Error Notification
                        Swal.fire({
                            icon: 'error',
                            title: 'Archive Failed',
                            text: error.message
                        });
                    });
                }
            });
        });

        toggleChartBtn.addEventListener('click', () => {
            chartContainer.classList.toggle('hidden');
            toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-up');
            toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-down');
        });
        chartMetricSelect.addEventListener('change', fetchChartData);
        exportDataBtn.addEventListener('click', exportVisibleData);

        // --- REQUIREMENTS MODAL LISTENERS ---
        
        // 1. Click on Surname (Delegated from Table Body)
        tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.req-btn');
            if (btn) {
                const id = btn.dataset.id;
                const applicant = allApplicants.find(a => a.application_id == id);
                if (applicant) openRequirementsModal(applicant);
            }
        });

        // 2. Modal Buttons
        if(saveRequirementsBtn) saveRequirementsBtn.addEventListener('click', saveRequirements);
        
        const closeReqs = () => requirementsModal.classList.add('hidden');
        if(closeRequirementsModal) closeRequirementsModal.addEventListener('click', closeReqs);
        if(cancelRequirementsBtn) cancelRequirementsBtn.addEventListener('click', closeReqs);

        // 3. Live Progress Bar Update
        if(requirementsForm) {
            requirementsForm.addEventListener('change', (e) => {
                if(e.target.name === 'req_item') updateReqProgress();
            });
        }

        if(editFormContent) {
            editFormContent.addEventListener('click', (e) => {
                const btn = e.target.closest('.unlock-btn');
                if (btn) {
                    const targetId = btn.dataset.target;
                    const input = document.getElementById(targetId);
                    if (input) {
                        const isDisabled = input.disabled;
                        input.disabled = !isDisabled;
                        
                        if (!isDisabled) { // Locked
                            input.classList.add('bg-gray-100', 'cursor-not-allowed', 'text-gray-600');
                            input.classList.remove('bg-white');
                            btn.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit';
                            btn.classList.remove('text-gray-500');
                            btn.classList.add('text-blue-600');
                        } else { // Unlocked
                            input.classList.remove('bg-gray-100', 'cursor-not-allowed', 'text-gray-600');
                            input.classList.add('bg-white');
                            btn.innerHTML = '<i class="fas fa-check"></i> Done';
                            btn.classList.remove('text-blue-600');
                            btn.classList.add('text-gray-500');
                            input.focus();
                        }
                    }
                }
            });
        }
    }
    
    initializeDashboard();
});

(function() {
    const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; 
    let timeoutTimer;

    function startTimer() {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(doLogout, INACTIVITY_LIMIT);
    }

    function doLogout() {
        window.location.href = '../logout.php'; 
    }

    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, startTimer, true);
    });

    startTimer();
})();




