document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIG & STATE ---
    let USER_ROLE = 'hr_staff'; 
    const API_URL = '../hr_dashboard_api.php';
    
    const collegeDegrees = [
        "Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", 
        "Bachelor of Science in Business Administration", "Bachelor of Arts in Communication",
        "Bachelor of Science in Psychology", "Bachelor of Science in Nursing", "Bachelor of Science in Accountancy",
        "Bachelor of Science in Engineering", "Bachelor of Arts in English", "Bachelor of Science in Biology",
        "Bachelor of Elementary/Secondary Education", "Other"
    ];

    const ALL_COLUMNS = [
        { key: 'application_id', label: 'ID', editable: false },
        { key: 'surname', label: 'Surname', editable: true, type: 'text', required: true },
        { key: 'firstname', label: 'First Name', editable: true, type: 'text', required: true },
        { key: 'middlename', label: 'Middle Name', editable: true, type: 'text' },
        { key: 'birthday', label: 'Birthday', editable: true, type: 'date', required: true },
        { key: 'gender', label: 'Gender', editable: true, type: 'select', options: ['Male', 'Female'], required: true },
        { key: 'mobile_number', label: 'Mobile', editable: true, type: 'tel', required: true },
        { key: 'email', label: 'Email', editable: true, type: 'email', required: true },
        { key: 'street_address', label: 'Street', editable: true, type: 'text', required: true },
        { key: 'city', label: 'City', editable: true, type: 'text', required: true },
        { key: 'province', label: 'Province', editable: true, type: 'text', required: true },
        { key: 'postcode', label: 'Postcode', editable: true, type: 'text', required: true },
        { key: 'position_applied', label: 'Position', editable: true, type: 'select', options: ['Data Entry Operator', 'Call Center Agent', 'Medcoder'], required: true },
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
        { key: 'interview_dates', label: 'Interview Dates', editable: true, type: 'textarea' },
        { key: 'interviewers', label: 'Interviewers', editable: true, type: 'textarea' },
        { key: 'feedback_comments', label: 'Feedback', editable: true, type: 'textarea' },
        { key: 'offer_status', label: 'Offer', editable: true, type: 'select', options: ['Pending', 'Accepted', 'Declined'] },
        { key: 'offer_date', label: 'Offer Date', editable: true, type: 'date' },
        { key: 'joining_date', label: 'Joining Date', editable: true, type: 'date' },
        { key: 'employee_id', label: 'Employee ID', editable: true, type: 'text' },
        { key: 'Project', label: 'Project', editable: true, type: 'text' },
        { key: 'actions', label: 'Actions', editable: false },
    ];
    const DEFAULT_VISIBLE_COLUMNS = ['surname', 'firstname', 'position_applied', 'recruiter_name', 'recruitment_status_text', 'application_date'];
    
    let allApplicants = [], allRecruiterData = [], visibleColumns = [...DEFAULT_VISIBLE_COLUMNS, 'actions'], sortConfig = { key: 'application_date', direction: 'desc' }, currentStatusFilter = 'all', dropdownData = { recruiters: [], statuses: {} };
    let currentView = 'active', currentPage = 1, rowsPerPage = 10;
    let mainChartInstance, sidebarChartInstance;
    let dateRangePicker, logDateRangePicker;

    const getEl = (id) => document.getElementById(id);
    const tableHead = getEl('tableHead'), tableBody = getEl('tableBody'), searchInput = getEl('searchInput'), columnToggleBtn = getEl('columnToggleBtn'), columnSelector = getEl('columnSelector'), columnCheckboxes = getEl('columnCheckboxes'), closeColumnSelector = getEl('closeColumnSelector'), statusFiltersContainer = getEl('statusFilters'), editModal = getEl('editModal'), editFormContent = getEl('editFormContent'), editForm = getEl('editForm'), deleteBtn = getEl('deleteBtn'), cancelEditBtn = getEl('cancelEditBtn'), editApplicationIdInput = getEl('edit_application_id');
    const newApplicantBtn = getEl('newApplicantBtn'), addApplicantModal = getEl('addApplicantModal'), addApplicantForm = getEl('addApplicantForm'), addFormContent = getEl('addFormContent'), cancelAddBtn = getEl('cancelAddBtn');
    const viewActiveBtn = getEl('viewActiveBtn'), viewArchivedBtn = getEl('viewArchivedBtn'), viewRecruiterBtn = getEl('viewRecruiterBtn'), viewLogsBtn = getEl('viewLogsBtn'), logsModal = getEl('logsModal'), logsTableBody = getEl('logsTableBody'), closeLogsModal = getEl('closeLogsModal');
    const paginationControls = getEl('paginationControls'), prevPageBtn = getEl('prevPageBtn'), nextPageBtn = getEl('nextPageBtn'), pageInfo = getEl('pageInfo'), rowsPerPageSelect = getEl('rowsPerPageSelect'), exportDataBtn = getEl('exportDataBtn');
    const chartContainer = getEl('chartContainer'), mainChartCanvas = getEl('mainChart'), chartMetricSelect = getEl('chartMetricSelect'), toggleChartBtn = getEl('toggleChartBtn'), sidebarChartCanvas = getEl('sidebarChart');
    const mainDisplayArea = getEl('mainDisplayArea'), recruiterPerformanceArea = getEl('recruiterPerformanceArea');
    const logDateRangePickerEl = getEl('logDateRangePicker'), exportLogsBtn = getEl('exportLogsBtn');
    
    function getStatusColorClass(statusText) { if (!statusText) return 'bg-gray-100 text-gray-800'; statusText = statusText.toLowerCase(); if (statusText.includes('failed') || statusText.includes('withdrawn') || statusText.includes('declined')) return 'bg-red-100 text-red-800'; if (statusText.includes('deployed')) return 'bg-green-100 text-green-800'; if (statusText.includes('job offer') || statusText.includes('onboarding') || statusText.includes('bgv')) return 'bg-blue-100 text-blue-800'; if (statusText.includes('interview')) return 'bg-yellow-100 text-yellow-800'; return 'bg-gray-100 text-gray-800'; }
    function formatDate(dateString) { if (!dateString) return 'N/A'; const date = new Date(dateString); return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    
    async function initializeDashboard() {
        try {
            const userRes = await fetch(`${API_URL}?action=getUserInfo`);
            if (!userRes.ok) { const errText = await userRes.text(); throw new Error(`Could not authenticate user. Server says: ${errText}`); }
            const userInfo = await userRes.json();
            USER_ROLE = userInfo.role || 'hr_staff'; 
            
            initializeDatePickers();
            await refreshAllData();
            setupColumnSelector();
            addEventListeners();
        } catch (error) {
            document.body.innerHTML = `<div class="p-8 text-center text-red-600 font-semibold">Initialization Error: ${error.message}. Please log in again.</div>`;
        }
    }

    function initializeDatePickers() {
        const today = new Date();
        const last7 = new Date(); last7.setDate(today.getDate() - 6);
        const last30 = new Date(); last30.setDate(today.getDate() - 29);

        dateRangePicker = new Litepicker({
            element: document.getElementById('dateRangePicker'),
            singleMode: false,
            allowRepick: true,
            plugins: ['ranges'],
            ranges: {
                'Last 7 Days': [last7, today],
                'Last 30 Days': [last30, today],
            },
            setup: (picker) => {
                picker.on('selected', (date1, date2) => {
                    refreshAllData();
                });
            }
        });

        if (logDateRangePickerEl) {
             logDateRangePicker = new Litepicker({
                element: logDateRangePickerEl,
                singleMode: false,
                allowRepick: true,
             });
        }
    }

    async function refreshAllData() { 
        await fetchDropdownAndStatusData();
        await Promise.all([
            fetchData(), 
            fetchChartData(), 
            fetchRecruiterPerformance()
        ]); 
    }

    async function fetchDropdownAndStatusData() { 
        try { 
            const startDate = dateRangePicker.getStartDate()?.toJSDate().toISOString().slice(0, 10); 
            const endDate = dateRangePicker.getEndDate()?.toJSDate().toISOString().slice(0, 10);
            let statusUrl = `${API_URL}?action=getStatusCounts&view=${currentView}`;
            if (startDate && endDate) { statusUrl += `&start_date=${startDate}&end_date=${endDate}`; }
            const [statusRes, dropdownRes] = await Promise.all([fetch(statusUrl), fetch(`${API_URL}?action=getDropdownData`)]); 
            if (!statusRes.ok || !dropdownRes.ok) throw new Error('Failed to fetch filter/dropdown data.'); 
            const statusCounts = await statusRes.json(); 
            dropdownData = await dropdownRes.json(); 
            renderSidebar(statusCounts); 
        } catch (error) { 
            console.error(error); statusFiltersContainer.innerHTML = `<p class="p-4 text-red-500">Could not load filters.</p>`; 
        } 
    }
    async function fetchData() { 
        tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-8">Loading...</td></tr>'; 
        try { 
            const response = await fetch(`${API_URL}?action=readAll&status=${currentStatusFilter}&view=${currentView}`); 
            if (!response.ok) throw new Error('Network response was not ok.'); 
            allApplicants = await response.json(); 
            currentPage = 1; 
            renderAll(); 
        } catch (error) { 
            tableBody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center p-8 text-red-500">Failed to load data: ${error.message}</td></tr>`; 
        } 
    }
    async function fetchChartData() { 
        try { 
            const metric = chartMetricSelect.value;
            const startDate = dateRangePicker.getStartDate()?.toJSDate().toISOString().slice(0, 10);
            const endDate = dateRangePicker.getEndDate()?.toJSDate().toISOString().slice(0, 10);
            let chartUrl = `${API_URL}?action=getChartData&metric=${metric}`;
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
            const startDate = dateRangePicker.getStartDate()?.toJSDate().toISOString().slice(0, 10);
            const endDate = dateRangePicker.getEndDate()?.toJSDate().toISOString().slice(0, 10);
            let perfUrl = `${API_URL}?action=getRecruiterPerformance`;
            if (startDate && endDate) { perfUrl += `&start_date=${startDate}&end_date=${endDate}`; }
            const response = await fetch(perfUrl);
            allRecruiterData = await response.json();
            renderRecruiterPerformance();
        } catch (error) { console.error('Failed to load recruiter performance:', error); } 
    }

    function renderAll() {
        const dataToDisplay = getFilteredAndSortedData();
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
        updateAnalytics(allApplicants);
    }
    
    function getFilteredAndSortedData() {
        const searchTerm = searchInput.value.toLowerCase();
        const searchField = searchFieldSelector.value; // Get the *single* selected field

        const startDate = dateRangePicker.getStartDate()?.toJSDate();
        const endDate = dateRangePicker.getEndDate()?.toJSDate();
        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        let filteredData = allApplicants.filter(applicant => {
            let matchesSearch = false;
            if (!searchTerm) {
                matchesSearch = true; // No search term, show all
            } else if (searchField === 'all') {
                // Search all fields (original behavior)
                matchesSearch = Object.values(applicant).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
            } else {
                // Search only the one selected field
                matchesSearch = applicant[searchField] && String(applicant[searchField]).toLowerCase().includes(searchTerm);
            }

            if (!startDate && !endDate) return matchesSearch;
            const applicationDate = new Date(applicant.application_date);
            const matchesDate = (!startDate || applicationDate >= startDate) && (!endDate || applicationDate <= endDate);
            return matchesSearch && matchesDate;
        });

        filteredData.sort((a, b) => { const valA = a[sortConfig.key] || '', valB = b[sortConfig.key] || ''; if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; });
        return filteredData;
    }

    function paginateData(data) { const start = (currentPage - 1) * rowsPerPage; const end = start + rowsPerPage; return data.slice(start, end); }
    function renderPagination(totalItems) { const totalPages = Math.ceil(totalItems / rowsPerPage); pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`; prevPageBtn.disabled = currentPage === 1; nextPageBtn.disabled = currentPage >= totalPages; }

    function renderTable(applicants) {
        let headerHTML = '<tr>';
        ALL_COLUMNS.forEach(col => { if (visibleColumns.includes(col.key)) { let sortClass = sortConfig.key === col.key ? sortConfig.direction : ''; headerHTML += `<th scope="col" class="px-6 py-3 sortable ${sortClass}" data-key="${col.key}">${col.label}</th>`; } });
        headerHTML += '</tr>'; tableHead.innerHTML = headerHTML;
        let bodyHTML = '';
        if (applicants.length > 0) {
            applicants.forEach(applicant => {
                bodyHTML += `<tr class="bg-white border-b hover:bg-gray-50">`;
                ALL_COLUMNS.forEach(col => {
                    if (visibleColumns.includes(col.key)) {
                        let content = applicant[col.key] === null || applicant[col.key] === undefined ? '' : applicant[col.key];
                        if (col.key === 'recruiter_name' && currentView === 'active') { let options = `<option value="">- Assign -</option>` + dropdownData.recruiters.map(r => `<option value="${r}" ${r === content ? 'selected' : ''}>${r}</option>`).join(''); content = `<select class="table-select" data-id="${applicant.application_id}" data-field="recruiter_name">${options}</select>`; } 
                        else if (col.key === 'recruitment_status_text' && currentView === 'active') { 
                            const fullColorClass = getStatusColorClass(content);
                            const bgColor = fullColorClass.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-100';
                            let options = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicant.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                            content = `<div class="${bgColor} rounded-full px-1">
                                           <select class="table-select bg-transparent border-none w-full focus:ring-0 p-1 font-semibold" data-id="${applicant.application_id}" data-field="recruitment_status">${options}</select>
                                       </div>`;
                        } else if (col.key === 'actions') { content = currentView === 'active' ? `<button class="text-blue-600 hover:underline edit-btn" data-id="${applicant.application_id}">Edit</button>` : `<button class="text-green-600 hover:underline restore-btn" data-id="${applicant.application_id}">Restore</button>`; }
                        else if (col.key.includes('date')) { content = formatDate(content); }
                        bodyHTML += `<td class="px-6 py-4">${content || 'N/A'}</td>`;
                    }
                });
                bodyHTML += '</tr>';
            });
        } else { bodyHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center p-8 text-gray-500">No applicants found for this filter.</td></tr>`; }
        tableBody.innerHTML = bodyHTML;
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
        // --- Helper: Parse YYYY-MM-DD as local date to avoid timezone offset ---
        function parseLocalDate(dateStr) {
            if (!dateStr) return null;
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
    
        // --- Chart container setup ---
        const chartContainer = mainChartCanvas.parentElement;
        chartContainer.style.height = '300px';
        mainChartCanvas.style.height = '100%';
        mainChartCanvas.style.width = '100%';
    
        let labels = [];
        let counts = [];
    
        // --- Determine date range (default to current month if not selected) ---
        let startDate = dateRangePicker?.getStartDate()?.toJSDate();
        let endDate = dateRangePicker?.getEndDate()?.toJSDate();
        if (!startDate || !endDate) {
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), 1); // first day of month
            endDate = today; // today
        }
    
        // --- Applicant & Deployment Trends (Line Chart) ---
        if (metric === 'applicantTrend' || metric === 'deploymentTrend') {
            const dataMap = new Map(data.map(d => [d.date, d.count]));
            const fullLabels = [];
            const fullCounts = [];
            let currentDate = new Date(startDate);
    
            while (currentDate <= endDate) {
                const dateString = currentDate.toISOString().slice(0, 10);
                fullLabels.push(parseLocalDate(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                fullCounts.push(dataMap.get(dateString) || 0);
                currentDate.setDate(currentDate.getDate() + 1);
            }
    
            labels = fullLabels;
            counts = fullCounts;
    
            const datasetLabel = metric === 'applicantTrend' ? 'New Applicants' : 'Deployments';
            const borderColor = metric === 'applicantTrend' ? '#3b82f6' : '#10b981';
            const backgroundColor = metric === 'applicantTrend' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)';
    
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
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: borderColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 },
                            grid: { drawBorder: false }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                autoSkip: true,
                                maxRotation: 45,
                                minRotation: 30,
                                font: { size: 11 },
                                padding: 6
                            }
                        }
                    }
                }
            };
    
            if (mainChartInstance) mainChartInstance.destroy();
            mainChartInstance = new Chart(mainChartCanvas, chartConfig);
        }
    
        // --- Top Sources (Pie Chart) ---
        else if (metric === 'topSources') {
            labels = data.map(d => d.label || d.source);
            counts = data.map(d => d.count);
    
            const backgroundColors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#64748b', '#f59e0b', '#14b8a6'];
    
            const chartConfig = {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Top Sources',
                        data: counts,
                        backgroundColor: backgroundColors.slice(0, labels.length)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
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
    data.forEach(d => {
        const dateKey = new Date(d.date).toISOString().slice(0, 10);
        dataMap[dateKey] = d.count;
    });

    const chartData = last7Days.map(date => ({
        date,
        count: dataMap[date] || 0
    }));

    const labels = chartData.map(d =>
        new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const counts = chartData.map(d => d.count);

    if (sidebarChartInstance) {
        sidebarChartInstance.data.labels = labels;
        sidebarChartInstance.data.datasets[0].data = counts;
        sidebarChartInstance.update();
    } else {
        sidebarChartCanvas.removeAttribute('height');
        sidebarChartCanvas.removeAttribute('width');

        sidebarChartInstance = new Chart(sidebarChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Deployments (Last 7 Days)',
                    data: counts,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { drawBorder: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,  // ⬅️ maximum angle in degrees
                            minRotation: 30,  // ⬅️ minimum angle in degrees
                            font: { size: 10 },
                            padding: 4        // ⬅️ add spacing so text doesn’t touch bars
                        }
                    }
                }
            }
        });
    }
}

    function renderSidebar(statusCounts) { let sidebarHTML = `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="all"><span>All Applicants</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${statusCounts.all || 0}</span></a>`; Object.entries(statusCounts).forEach(([statusId, data]) => { if (statusId !== 'all') { sidebarHTML += `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="${statusId}"><span>${data.name}</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${data.count}</span></a>`; } }); statusFiltersContainer.innerHTML = sidebarHTML; const activeLink = document.querySelector(`.filter-link[data-status="${currentStatusFilter}"]`); if (activeLink) activeLink.classList.add('active');}
    function updateAnalytics(applicants) {
        document.getElementById('totalApplicants').textContent = applicants.length;
        const interviewing = applicants.filter(a => ['3', '5'].includes(String(a.recruitment_status_id))).length;
        document.getElementById('interviewingCount').textContent = interviewing;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const deployedThisMonth = applicants.filter(a => {
            if (a.recruitment_status_id != '13' || !a.joining_date) return false;
            const joiningDate = new Date(a.joining_date);
            return joiningDate.getMonth() === currentMonth && joiningDate.getFullYear() === currentYear;
        }).length;
        document.getElementById('deployedThisMonth').textContent = deployedThisMonth;

        const hiredApplicants = applicants.filter(a => a.joining_date && a.application_date && a.recruitment_status_id == '13');
        if(hiredApplicants.length > 0) {
            const totalDays = hiredApplicants.reduce((sum, a) => sum + (new Date(a.joining_date) - new Date(a.application_date)), 0);
            const avgDays = Math.round((totalDays / hiredApplicants.length) / (1000 * 60 * 60 * 24));
            document.getElementById('avgTimeToHire').textContent = `${avgDays} days`;
        } else {
            document.getElementById('avgTimeToHire').textContent = 'N/A';
        }
    }

    function setupColumnSelector() { columnCheckboxes.innerHTML = ''; ALL_COLUMNS.filter(c => c.key !== 'actions').forEach(col => { const isChecked = visibleColumns.includes(col.key); columnCheckboxes.innerHTML += `<label class="flex items-center space-x-2"><input type="checkbox" class="h-4 w-4" data-key="${col.key}" ${isChecked ? 'checked' : ''}><span>${col.label}</span></label>`; }); }
    async function handleQuickUpdate(applicantId, field, value) { try { const response = await fetch(`${API_URL}?action=updateApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: applicantId, [field]: value, status_date: new Date().toISOString().slice(0, 10) }) }); const result = await response.json(); if (result.status !== 'success') throw new Error(result.message); const applicantToUpdate = allApplicants.find(a => a.application_id == applicantId); if (applicantToUpdate) { applicantToUpdate[field] = value; if (field === 'recruitment_status') { applicantToUpdate.recruitment_status_id = value; applicantToUpdate.recruitment_status_text = dropdownData.statuses[value]; } } await fetchDropdownAndStatusData(); renderAll(); } catch (error) { alert('Update failed: ' + error.message); fetchData(); } }
    
    function buildFormFields(container, applicantData = {}, formType) {
        container.innerHTML = '';
        ALL_COLUMNS.forEach(col => {
            if (!col.editable) return;
            let value = applicantData[col.key] || '';
            const keyForEdit = col.key === 'recruitment_status_text' ? 'recruitment_status_id' : col.key;
            let required = col.required ? 'required' : '';
            let requiredSpan = col.required ? ' <span class="text-red-500">*</span>' : '';
            const label = `<label for="${formType}_${keyForEdit}" class="block text-sm font-medium text-gray-700">${col.label}${requiredSpan}</label>`;
            let inputHTML = '';
            
            if (formType === 'add' && col.key === 'recruitment_status_id') return;

            let fieldWrapper = document.createElement('div');
            if (col.key === 'college_degree') {
                fieldWrapper.id = `${formType}_collegeDegreeContainer`;
                if (applicantData.education_level !== 'College Graduate') {
                    fieldWrapper.classList.add('hidden');
                }
            }

            switch(col.type) {
                case 'select': 
                    let optionsHTML = '';
                    if (col.options_key === 'statuses') {
                        optionsHTML = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicantData.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                    } else {
                        let options = col.options || dropdownData[col.options_key] || [];
                        optionsHTML = `<option value="">- Select -</option>` + options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                    }
                    inputHTML = `<select id="${formType}_${keyForEdit}" name="${keyForEdit === 'recruitment_status_id' ? 'recruitment_status' : keyForEdit}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" ${required}>${optionsHTML}</select>`;
                    break;
                case 'textarea': inputHTML = `<textarea id="${formType}_${keyForEdit}" name="${keyForEdit}" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" ${required}>${value}</textarea>`; break;
                default: inputHTML = `<input type="${col.type}" id="${formType}_${keyForEdit}" name="${keyForEdit}" value="${value}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" ${required}>`;
            }
            fieldWrapper.innerHTML = label + inputHTML;
            container.appendChild(fieldWrapper);

            if (col.key === 'college_degree') {
                let otherWrapper = document.createElement('div');
                otherWrapper.id = `${formType}_otherDegreeContainer`;
                otherWrapper.className = 'hidden mt-4'; 
                let otherLabel = `<label for="${formType}_college_degree_other" class="block text-sm font-medium text-gray-700">If "Other", please specify</label>`;
                let otherInput = `<input type="text" id="${formType}_college_degree_other" name="college_degree_other" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">`;
                otherWrapper.innerHTML = otherLabel + otherInput;
                container.appendChild(otherWrapper);
            }
        });
    }

    function openEditModal(applicant) { editApplicationIdInput.value = applicant.application_id; buildFormFields(editFormContent, applicant, 'edit'); deleteBtn.style.display = USER_ROLE === 'hr_manager' || USER_ROLE === 'super_user' ? 'inline-block' : 'none'; editModal.classList.remove('hidden'); }
    function openAddApplicantModal() { addApplicantForm.reset(); buildFormFields(addFormContent, {}, 'add'); addApplicantModal.classList.remove('hidden'); }
    
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
        columnCheckboxes.addEventListener('change', e => { if(e.target.type === 'checkbox') { const key = e.target.dataset.key; if (e.target.checked) { if (!visibleColumns.includes(key)) visibleColumns.push(key); } else { visibleColumns = visibleColumns.filter(col => col !== key); } renderAll(); } });
        statusFiltersContainer.addEventListener('click', e => { e.preventDefault(); const target = e.target.closest('.filter-link'); if (target) { const activeLink = document.querySelector('.filter-link.active'); if(activeLink) activeLink.classList.remove('active'); target.classList.add('active'); currentStatusFilter = target.dataset.status; fetchData(); } });
        tableHead.addEventListener('click', e => { const target = e.target.closest('.sortable'); if (target) { const key = target.dataset.key; if (sortConfig.key === key) { sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'; } else { sortConfig.key = key; sortConfig.direction = 'asc'; } renderAll(); } });
        tableBody.addEventListener('change', e => { if (e.target.classList.contains('table-select')) { const applicantId = e.target.dataset.id, field = e.target.dataset.field, value = e.target.value; handleQuickUpdate(applicantId, field, value); } });
        tableBody.addEventListener('click', e => { const target = e.target; if(target.classList.contains('edit-btn')) { const applicant = allApplicants.find(a => a.application_id == target.dataset.id); if(applicant) openEditModal(applicant); } if(target.classList.contains('restore-btn')) { const id = target.dataset.id; if (confirm(`Are you sure you want to restore this applicant?`)) { fetch(`${API_URL}?action=restoreApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: id }) }).then(res => res.json()).then(result => { if(result.status !== 'success') throw new Error(result.message); alert('Applicant restored!'); fetchData(); }).catch(err => alert('Restore failed: ' + err.message)); } } });
        editForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!editForm.checkValidity()) { editForm.reportValidity(); return; }
            const formData = new FormData(editForm);
            const dataFromForm = Object.fromEntries(formData.entries());
            try {
                const response = await fetch(`${API_URL}?action=updateApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataFromForm) });
                const result = await response.json();
                if(result.status !== 'success') throw new Error(result.message);
                
                alert('Applicant saved successfully!'); 
                
                const updatedApplicantIndex = allApplicants.findIndex(a => a.application_id == dataFromForm.application_id);
                if(updatedApplicantIndex !== -1) { allApplicants[updatedApplicantIndex] = {...allApplicants[updatedApplicantIndex], ...dataFromForm}; if (dataFromForm.recruitment_status) { allApplicants[updatedApplicantIndex].recruitment_status_text = dropdownData.statuses[dataFromForm.recruitment_status]; } }
                editModal.classList.add('hidden');
                renderAll();
                await fetchDropdownAndStatusData();
            } catch (error) { alert('Save failed: ' + error.message); }
        });
        addApplicantForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!addApplicantForm.checkValidity()) { addApplicantForm.reportValidity(); return; }
            const formData = new FormData(addApplicantForm);
            const submitUrl = '../recruitment_applicants.php'; 
            try {
                const response = await fetch(submitUrl, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                alert('Applicant added successfully!');
                addApplicantModal.classList.add('hidden');
                initializeDashboard();
            } catch (error) { alert('Failed to add applicant: ' + error.message); }
        });
        deleteBtn.addEventListener('click', async () => {
            const id = editApplicationIdInput.value;
            const applicantToDelete = allApplicants.find(a => a.application_id == id);
            const applicantName = applicantToDelete ? `${applicantToDelete.surname}, ${applicantToDelete.firstname}` : `applicant #${id}`;
            if(confirm(`Are you sure you want to archive ${applicantName}?`)) {
                try {
                    const response = await fetch(`${API_URL}?action=archiveApplicant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: id }) });
                    const result = await response.json();
                    if(result.status !== 'success') throw new Error(result.message);
                    alert('Applicant archived successfully!'); 
                    editModal.classList.add('hidden');
                    await initializeDashboard();
                } catch (error) { alert('Archive failed: ' + error.message); }
            }
        });
        
        document.addEventListener('change', e => {
            const targetId = e.target.id;
            const formType = targetId.startsWith('add_') ? 'add' : (targetId.startsWith('edit_') ? 'edit' : null);
            
            if (!formType) return;

            if (targetId.endsWith('_education_level')) {
                const degreeContainer = document.getElementById(`${formType}_collegeDegreeContainer`);
                if (degreeContainer) {
                    degreeContainer.classList.toggle('hidden', e.target.value !== 'College Graduate');
                }
            }
            
            if (targetId.endsWith('_college_degree')) {
                const otherDegreeContainer = document.getElementById(`${formType}_otherDegreeContainer`);
                if (otherDegreeContainer) {
                    otherDegreeContainer.classList.toggle('hidden', e.target.value !== 'Other');
                }
            }
        });

        toggleChartBtn.addEventListener('click', () => {
            chartContainer.classList.toggle('hidden');
            toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-up');
            toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-down');
        });
        chartMetricSelect.addEventListener('change', fetchChartData);
        exportDataBtn.addEventListener('click', exportVisibleData);
    }
    
    initializeDashboard();
});

