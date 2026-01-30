// --- GLOBAL HELPERS ---
window.dashboardGlobals = {
    getApiUrl: () => '../hr_dashboard_api.php',
    getDropdownData: () => dropdownData,
    refreshAllData: async () => {}, 
    getCurrentView: () => currentView,
    getFilteredIds: () => [] 
};

window.openResumeModal = function(applicant) {
    // 1. Get Elements dynamically (Safe even if HTML updates lag)
    const modal = document.getElementById('resumeModal');
    const titleEl = document.getElementById('resumeModalTitle');
    const appIdField = document.getElementById('resume_app_id');
    const fileNameDisp = document.getElementById('fileNameDisplay');
    const linkInput = document.getElementById('resumeLinkInput');
    const resumeFrame = document.getElementById('resumeFrame');
    const noResumeState = document.getElementById('noResumeState');
    const downloadBtn = document.getElementById('downloadResumeBtn');

    // Elements to Hide/Show based on Role
    const uploadForm = document.getElementById('resumeUploadForm');
    const linkRow = document.getElementById('resumeLinkRow');

    if (!modal) {
        console.error("Resume Modal HTML is missing! Paste it into your PHP file.");
        return;
    }

    // --- NEW: CHECK PERMISSIONS ---
    // If we are on the Interviewer Page, HIDE the edit controls
    const isInterviewer = window.location.pathname.includes('interview_dashboard.php');

    if (isInterviewer) {
        if (uploadForm) uploadForm.classList.add('hidden'); // Hide Upload Button
        if (linkRow) linkRow.classList.add('hidden');       // Hide Link Input
        if (titleEl) titleEl.textContent = `${applicant.surname}, ${applicant.firstname} - Resume (View Only)`;
    } else {
        // HR Mode: Show everything
        if (uploadForm) uploadForm.classList.remove('hidden');
        if (linkRow) linkRow.classList.remove('hidden');
        if (titleEl) titleEl.textContent = `${applicant.surname}, ${applicant.firstname} - Resume`;
    }
    // -----------------------------

    // 2. Populate Data
    if (appIdField) appIdField.value = applicant.application_id;
    if (fileNameDisp) fileNameDisp.textContent = '';
    if (linkInput) linkInput.value = ''; 

    // 3. Determine File Type
    let rawPath = applicant.resume_path || '';
    let isUrl = rawPath.startsWith('http'); 
    let fileUrl = isUrl ? rawPath : (rawPath ? '../' + rawPath : null);

    // 4. Render Content (Logic unchanged)
    if (fileUrl) {
        if (downloadBtn) {
            downloadBtn.href = fileUrl;
            downloadBtn.classList.remove('hidden');
        }

        if (isUrl) {
            if (fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com')) {
                fileUrl = fileUrl.replace(/\/view.*/, '/preview').replace(/\/edit.*/, '/preview');
            }
            if(resumeFrame) { resumeFrame.src = fileUrl; resumeFrame.classList.remove('hidden'); }
            if(noResumeState) noResumeState.classList.add('hidden');
        } 
        else {
            const ext = fileUrl.split('.').pop().toLowerCase();
            const isViewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(ext);

            if (isViewable) {
                if(resumeFrame) { resumeFrame.src = fileUrl; resumeFrame.classList.remove('hidden'); }
                if(noResumeState) noResumeState.classList.add('hidden');
            } else {
                if(resumeFrame) { resumeFrame.src = ''; resumeFrame.classList.add('hidden'); }
                if(noResumeState) {
                    noResumeState.classList.remove('hidden');
                    noResumeState.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-gray-500">
                            <i class="fas fa-file-word text-6xl mb-4 text-blue-500"></i>
                            <p class="text-lg font-bold">Preview not available.</p>
                            <a href="${fileUrl}" target="_blank" class="bg-blue-600 text-white px-4 py-2 mt-2 rounded">Download File</a>
                        </div>`;
                }
            }
        }
    } else {
        if(resumeFrame) { resumeFrame.src = ''; resumeFrame.classList.add('hidden'); }
        if(noResumeState) {
            noResumeState.classList.remove('hidden');
            noResumeState.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <i class="fas fa-file-excel text-6xl mb-4 text-gray-300"></i>
                    <p class="text-lg">No resume available.</p>
                </div>`;
        }
        if(downloadBtn) downloadBtn.classList.add('hidden');
    }
    
    // 5. Show Modal
    modal.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', function () {

    // --- CONFIGURATION & STATE ---
    let USER_ROLE = 'hr_staff'; 
    const API_URL = '../hr_dashboard_api.php';

    let CURRENT_USER_ID = null
    
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
        { key: 'requisition_id', label: 'Requisition ID', editable: true, type: 'text' },
        { key: 'entity', label: 'Entity', editable: true, type: 'select', options: ['Scorp', 'Lexicode'] },
        { key: 'location', label: 'Location', editable: true, type: 'select', options: ['Subic', 'Clark'] },
        { key: 'marital_status', label: 'Marital Status', editable: true, type: 'select', options: ['Single', 'Married', 'Widowed', 'Separated'] },
        // { key: 'talento_id', label: 'Talento ID', editable: true, type: 'text' },
        { key: 'requisition_status', label: 'Req Status', editable: true, type: 'select', options: ['Open', 'Approved', 'Closed', 'Hold'] },
        { key: 'hdmf_id', label: 'HDMF (Pag-IBIG)', editable: true, type: 'text' },
        { key: 'sss_no', label: 'SSS No.', editable: true, type: 'text' },
        { key: 'philhealth_no', label: 'PhilHealth', editable: true, type: 'text' },
        { key: 'tin_no', label: 'TIN', editable: true, type: 'text' },
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
        { key: 'application_source', label: 'Source', editable: true, type: 'select', options: ['Job Portal', 'Employee Referral', 'Career Page', 'Recruitment Agency', 'Walk-in', 'Facebook','Indeed','Jobstreet','SBMA labor','PESO', 'Linked-in','Job Fair'], required: true },
        { key: 'application_date', label: 'Applied On', editable: true, type: 'datetime-local' },
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
        { key: 'employee_id', label: 'Employee ID', editable: true, type: 'number', validate: 'check_db' },
        { key: 'initial_interviewer_id', label: 'Initial Interviewer', editable: true, type: 'select', options_key: 'interviewers' },
        { key: 'final_interviewer_id', label: 'Final Interviewer', editable: true, type: 'select', options_key: 'interviewers' },
        { key: 'Project', label: 'Project', editable: true, type: 'select', options_key: 'projects' },
        { key: 'father_name', label: "Father's Name", editable: true, type: 'text' },
        { key: 'mother_name', label: "Mother's Name", editable: true, type: 'text' },
        { key: 'spouse_name', label: "Spouse Name", editable: true, type: 'text' },
        { key: 'relatives_at_xbp', label: "Relatives @ XBP", editable: true, type: 'select', options: ['Yes', 'No'] },
        { key: 'worked_at_xbp_details', label: "Last Worked @ XBP", editable: true, type: 'text' },
        { key: 'employment_history', label: "Employment History", editable: true, type: 'textarea' },
        { key: 'character_references', label: "References", editable: true, type: 'textarea' },
        { key: 'numeric_score', label: 'Numeric Score', editable: true, type: 'number' },
        { key: 'alphanumeric_score', label: 'AlphaNumeric Score', editable: true, type: 'text' },
        { key: 'written_exam_score', label: 'Written Exam', editable: true, type: 'text' },
        { key: 'actions', label: 'Actions', editable: false },
        
    ];

    // IMPORTANT: Defined as a separate constant so Reset can use it
    const DEFAULT_VISIBLE_COLUMNS = ['select', 'application_id', 'surname', 'firstname', 'position_applied', 'screening_score', 'screening_status', 'recruitment_status_text','specific_skill','recruiter_name', 'application_date'];
    
    // --- VARIABLES ---
    window.allApplicants = [];
    let allRecruiterData = [], visibleColumns = [...DEFAULT_VISIBLE_COLUMNS, 'actions'];
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

        // ==========================================
    // --- NOTIFICATION SYSTEM (INTERVIEWS) ---
    // ==========================================

    const btnNotification = document.getElementById('btnNotification');
    const notifModal = document.getElementById('notificationModal');
    const notifList = document.getElementById('notificationList');
    const notifBadge = document.getElementById('notifBadge');
    
    // Controls
    const notifTabs = document.getElementById('notifTabs');
    const notifSortSelect = document.getElementById('notifSortSelect');
    
    // Pagination Controls
    const notifPrevBtn = document.getElementById('notifPrevBtn');
    const notifNextBtn = document.getElementById('notifNextBtn');
    const notifPageInfo = document.getElementById('notifPageInfo');

    // Export Advanced logic
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const btnQuickExport = document.getElementById('btnQuickExport');
    const templateFileInput = document.getElementById('templateFileInput');
    const mappingContainer = document.getElementById('mappingContainer');
    const mappingList = document.getElementById('mappingList');
    const btnExecuteCustomExport = document.getElementById('btnExecuteCustomExport');

    // Export Template Saving Logic
    const savedTemplatesSelect = document.getElementById('savedTemplatesSelect');
    const btnSaveTemplate = document.getElementById('btnSaveTemplate');
    const btnDeleteTemplate = document.getElementById('btnDeleteTemplate');
    const STORAGE_KEY = 'hr_export_templates_v1';

    // State
    let allNotifications = [];
    let notifFilter = 'all'; // 'all', 'initial', 'final'
    let notifSort = 'asc';   // 'asc' (Oldest/Urgent first), 'desc'
    let notifPage = 1;
    const notifPerPage = 5;  // LIMIT 5 PER PAGE

    // 1. Fetch & Check
    async function checkNotifications() {
        // Safety check: if the list element is missing, stop
        if(!notifList) return;

        try {
            const response = await fetch(`${API_URL}?action=getNotifications&_t=${new Date().getTime()}`);
            const data = await response.json();
            
            // ERROR HANDLING: If DB error, show it on screen instead of spinning forever
            if (data.error) { 
                console.error("Notif SQL:", data.error);
                notifList.innerHTML = `<div class="text-center py-10 text-red-500"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>System Error: ${data.error}</p></div>`;
                return; 
            }

            if (Array.isArray(data) && data.length > 0) {
                allNotifications = data; 
                
                // Update Badge (HR Dashboard only)
                if(notifBadge) {
                    notifBadge.textContent = data.length;
                    notifBadge.classList.remove('hidden');
                }
                
                // Render the list (This clears the spinner)
                notifPage = 1; 
                renderSmartNotifications();

                // Auto-Popup Logic (HR Dashboard only)
                if (notifModal && !window.location.pathname.includes('interview_dashboard.php')) {
                    if (!sessionStorage.getItem('notifSeen')) {
                        notifModal.classList.remove('hidden');
                        sessionStorage.setItem('notifSeen', 'true');
                    }
                }
            } else {
                // NO DATA: Clear spinner and show "No Interviews" message
                if(notifBadge) notifBadge.classList.add('hidden');
                    notifList.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                            <i class="fas fa-calendar-check text-4xl mb-3 text-gray-300"></i>
                            <p>No pending interviews found.</p>
                        </div>`;
            }
        } catch (error) { 
            // FETCH ERROR: Clear spinner and show error
            console.error("Notif Error:", error); 
            notifList.innerHTML = `<div class="text-center py-10 text-red-500"><p>Connection Failed. Please refresh.</p></div>`;
        }
    }

    // 2. Render Logic (Filter -> Sort -> Paginate -> HTML)
    function renderSmartNotifications() {
        notifList.innerHTML = '';

        // A. FILTER
        let filtered = allNotifications.filter(app => {
            // 1. Tab Filter (Initial vs Final)
            if (notifFilter === 'initial' && app.recruitment_status != 3) return false;
            if (notifFilter === 'final' && app.recruitment_status != 5) return false;

            // 2. STRICT MODE: If on Interviewer Dashboard, ONLY show assigned tasks
            if (window.location.pathname.toLowerCase().includes('interview')) {
                // Get the IDs from the applicant object
                const initialID = String(app.initial_interviewer_id || '');
                const finalID = String(app.final_interviewer_id || '');
                const myID = String(CURRENT_USER_ID);

                // CHECK: Does the database string CONTAIN my ID?
                // Example: DB="ALUAGUE - 2373" includes MyID="2373" -> TRUE
                const isMyInitial = (app.recruitment_status == 3 && initialID.includes(myID));
                const isMyFinal = (app.recruitment_status == 5 && finalID.includes(myID));
                
                // If neither match, HIDE IT
                if (!isMyInitial && !isMyFinal) return false;
            }

            return true;
        });

        // B. SORT
        filtered.sort((a, b) => {
            const dateA = new Date(a.interview_dates);
            const dateB = new Date(b.interview_dates);
            return notifSort === 'asc' ? dateA - dateB : dateB - dateA;
        });

        // C. PAGINATION CALCULATION
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / notifPerPage) || 1;
        
        // Safety check if we filtered down to 0 pages
        if (notifPage > totalPages) notifPage = totalPages;
        if (notifPage < 1) notifPage = 1;

        const start = (notifPage - 1) * notifPerPage;
        const pageData = filtered.slice(start, start + notifPerPage);

        // Update Footer Info
        if (notifPageInfo) {
            notifPageInfo.textContent = `Showing ${pageData.length > 0 ? start + 1 : 0}-${Math.min(start + notifPerPage, totalItems)} of ${totalItems}`;
        }
        if (notifPrevBtn) notifPrevBtn.disabled = notifPage === 1;
        if (notifNextBtn) notifNextBtn.disabled = notifPage === totalPages;

        // D. RENDER CARDS
        if (pageData.length === 0) {
            notifList.innerHTML = `<div class="text-center py-8 text-gray-400">No ${notifFilter} interviews found.</div>`;
            return;
        }

        const todayDate = new Date().toDateString();

        pageData.forEach(app => {
            const dateObj = new Date(app.interview_dates);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const isToday = new Date(app.interview_dates).toDateString() === todayDate;
            const isOverdue = new Date(app.interview_dates) < new Date();

            // Colors
            let cardBorder = 'border-l-4 border-blue-500';
            let dateColor = 'text-gray-600';
            let statusBadge = '<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Upcoming</span>';

            if (isOverdue) {
                cardBorder = 'border-l-4 border-red-500 bg-red-50'; 
                dateColor = 'text-red-600 font-bold';
                statusBadge = '<span class="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase"><i class="fas fa-exclamation-circle"></i> Overdue</span>';
            } else if (isToday) {
                cardBorder = 'border-l-4 border-orange-400 bg-orange-50'; 
                dateColor = 'text-orange-600 font-bold';
                statusBadge = '<span class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">Today</span>';
            }

            // Compact Card HTML
            const card = document.createElement('div');
            card.className = `bg-white shadow-sm rounded-lg p-3 flex flex-col md:flex-row gap-3 items-center hover:shadow-md transition ${cardBorder}`;
            
            card.innerHTML = `
                <div class="flex-1 w-full">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm">${app.surname}, ${app.firstname}</h4>
                            <p class="text-xs text-gray-500">${app.position_applied} • ${app.interview_type}</p>
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <div class="${dateColor} flex items-center"><i class="far fa-clock mr-1"></i> ${dateStr} @ ${timeStr}</div>
                        <div title="Interviewer"><i class="far fa-user mr-1"></i> ${app.interviewer_name || 'N/A'}</div>
                        <div title="Phone"><i class="fas fa-phone mr-1"></i> ${app.mobile_number}</div>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <select class="text-xs border-gray-300 rounded focus:ring-blue-500 py-1" id="status_${app.application_id}">
                        <option value="">- Decision -</option>
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                        <option value="Reschedule">Reschedule</option>
                    </select>
                    
                    <button class="bg-blue-500 hover:bg-purple-700 text-white p-1.5 rounded shadow btn-update-interview" 
                        title="Save" data-id="${app.application_id}" data-current-stage="${app.recruitment_status}">
                        <i class="fas fa-save text-xs"></i>
                    </button>
                    
                    <button class="bg-gray-200 hover:bg-gray-300 text-gray-600 p-1.5 rounded" 
                        onclick="document.getElementById('note_${app.application_id}').classList.toggle('hidden')" title="Add Notes">
                        <i class="fas fa-comment-alt text-xs"></i>
                    </button>

                    <button class="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded shadow btn-view-resume" 
                        title="View Resume" data-id="${app.application_id}">
                        <i class="fas fa-file-alt text-xs"></i>
                    </button>

                </div>
                
                <div id="note_${app.application_id}" class="hidden w-full mt-2 border-t pt-2">
                    <textarea id="feedback_${app.application_id}" class="w-full text-xs border-gray-300 rounded p-2" rows="2" placeholder="Interview feedback...">${app.feedback_comments || ''}</textarea>
                </div>
            `;
            notifList.appendChild(card);
        });
    }

    // 3. Events
    if(notifTabs) {
        notifTabs.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                notifTabs.querySelectorAll('button').forEach(b => {
                    b.classList.remove('bg-white', 'text-purple-700', 'shadow');
                    b.classList.add('text-gray-500');
                });
                e.target.classList.add('bg-white', 'text-purple-700', 'shadow');
                e.target.classList.remove('text-gray-500');

                notifFilter = e.target.dataset.filter;
                notifPage = 1; // Reset page on filter change
                renderSmartNotifications();
            }
        });
    }

    if(notifSortSelect) {
        notifSortSelect.addEventListener('change', (e) => {
            notifSort = e.target.value;
            notifPage = 1; // Reset page on sort
            renderSmartNotifications();
        });
    }

    // Pagination Listeners
    if(notifPrevBtn) {
        notifPrevBtn.addEventListener('click', () => {
            if(notifPage > 1) {
                notifPage--;
                renderSmartNotifications();
            }
        });
    }

    if(notifNextBtn) {
        notifNextBtn.addEventListener('click', () => {
            const filtered = allNotifications.filter(app => {
                if (notifFilter === 'initial') return app.recruitment_status == 3;
                if (notifFilter === 'final') return app.recruitment_status == 5;
                return true;
            });
            const totalPages = Math.ceil(filtered.length / notifPerPage);
            
            if(notifPage < totalPages) {
                notifPage++;
                renderSmartNotifications();
            }
        });
    }

    
    if(notifList) {
        notifList.addEventListener('click', async (e) => {
            
            // -----------------------------
            // A. HANDLER: VIEW RESUME CLICK
            // -----------------------------
            const resumeBtn = e.target.closest('.btn-view-resume');
            if (resumeBtn) {
                // Prevent bubbling if needed
                e.preventDefault(); 
                
                const id = resumeBtn.dataset.id;
                
                // Find the applicant object in our loaded list
                const applicant = allNotifications.find(a => a.application_id == id);
                
                if (applicant) {
                    openResumeModal(applicant);
                } else {
                    console.error("Applicant data not found for ID:", id);
                }
                return; // Stop here, don't check for other buttons
            }

            // -----------------------------
            // B. HANDLER: SAVE/UPDATE CLICK
            // -----------------------------
            const btn = e.target.closest('.btn-update-interview');
            if (btn) {
                if(btn.disabled) return; // Prevent double-clicks

                const id = btn.dataset.id;
                const currentStage = parseInt(btn.dataset.currentStage);
                const outcome = document.getElementById(`status_${id}`).value;
                const feedback = document.getElementById(`feedback_${id}`)?.value || '';

                if (!outcome) { Swal.fire('Required', 'Select a decision.', 'warning'); return; }

                // Logic: Determine new status ID based on Pass/Fail
                let newStatusId = currentStage;
                if (outcome === 'Failed') newStatusId = (currentStage === 3) ? 4 : 6;
                else if (outcome === 'Passed') newStatusId = (currentStage === 3) ? 5 : 7;
                else if (outcome === 'Reschedule') newStatusId = currentStage;

                // UI Feedback (Spinner)
                const originalBtnContent = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                try {
                    const response = await fetch(`${API_URL}?action=updateApplicant`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            application_id: id, 
                            recruitment_status: newStatusId, 
                            feedback_comments: feedback, 
                            status_date: new Date().toISOString().slice(0, 10) 
                        })
                    });
                    
                    const result = await response.json();
                    if (result.status !== 'success') throw new Error(result.message || "Update failed");

                    Swal.fire({ icon: 'success', title: 'Saved', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                    
                    // Refresh Lists
                    await checkNotifications(); 
                    if (!window.location.pathname.includes('interview_dashboard.php')) {
                        refreshAllData();
                    }

                } catch (err) { 
                    Swal.fire('Error', err.message, 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            }
        });
    }

    if (btnNotification) {
        btnNotification.addEventListener('click', () => {
            checkNotifications();
            notifModal.classList.remove('hidden');
        });
    }

    document.getElementById('closeNotifModal')?.addEventListener('click', () => notifModal.classList.add('hidden'));
    document.getElementById('dismissNotifBtn')?.addEventListener('click', () => notifModal.classList.add('hidden'));

    // Init
    // checkNotifications();

    // --- COLUMN RESIZING LOGIC ---
    function enableColumnResizing() {
        const table = document.querySelector('table');
        const ths = table.querySelectorAll('th');

        ths.forEach(th => {
            // 1. Create the resizer element
            const resizer = document.createElement('div');
            resizer.classList.add('resizer');
            th.appendChild(resizer);

            // 2. Track State
            let x = 0;
            let w = 0;

            const mouseDownHandler = function (e) {
                // Stop the sort/drag logic from firing
                e.stopPropagation(); 
                e.preventDefault();

                x = e.clientX;
                
                // Get current width (computed style is safer)
                const styles = window.getComputedStyle(th);
                w = parseInt(styles.width, 10);

                resizer.classList.add('resizing');

                // Attach listeners to document (so you can drag outside the header)
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            };

            const mouseMoveHandler = function (e) {
                const dx = e.clientX - x;
                th.style.width = `${w + dx}px`;
                th.style.minWidth = `${w + dx}px`; // Force min-width to override previous styles
                th.style.maxWidth = 'none'; // Remove the hard restriction we had before
            };

            const mouseUpHandler = function () {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    }
    
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
        // 1. Check for empty/null values immediately
        if (!dateString || dateString === '0000-00-00') return 'N/A'; 
        
        const date = new Date(dateString); 
        
        // 2. Check if the date is actually valid
        if (isNaN(date.getTime())) {
            return 'N/A'; // Returns "N/A" instead of "Invalid Date"
        }

        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); 
    }
    
    // Advance Export HR dashboard function

    if (exportDataBtn) {
        const newExportBtn = exportDataBtn.cloneNode(true);
        exportDataBtn.parentNode.replaceChild(newExportBtn, exportDataBtn);
        
        newExportBtn.addEventListener('click', () => {
            exportModal.classList.remove('hidden');
            // Reset Custom Export State on open
            if(templateFileInput) templateFileInput.value = '';
            if(mappingContainer) mappingContainer.classList.add('hidden');
            if(mappingList) mappingList.innerHTML = '';
        });
    }

    if(closeExportModal) closeExportModal.addEventListener('click', () => exportModal.classList.add('hidden'));

    // 2. Handle "Quick Export" (Uses your existing function)
    if(btnQuickExport) {
        btnQuickExport.addEventListener('click', () => {
            exportVisibleData(); 
            exportModal.classList.add('hidden');
        });
    }

    // 3. Handle Template Upload & Parse Headers
    if(templateFileInput) {
        templateFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;

            // Use PapaParse (ensure it's loaded)
            if (typeof Papa === 'undefined') {
                alert('Error: CSV Parser (PapaParse) is missing.');
                return;
            }

            Papa.parse(file, {
                header: false, // We only want the raw first row
                preview: 1,    // Stop after the first row
                skipEmptyLines: true,
                complete: function(results) {
                    if(results.data && results.data.length > 0) {
                        const headers = results.data[0]; // Array ['Name', 'Date', etc.]
                        renderMappingUI(headers);
                    } else {
                        Swal.fire('Error', 'CSV file appears empty or invalid.', 'error');
                    }
                }
            });
        });
    }

    // 4. Render Mapping UI
    function renderMappingUI(headers) {
        mappingList.innerHTML = '';
        mappingContainer.classList.remove('hidden');

        // Create System Field Options from ALL_COLUMNS
        let optionsHTML = '<option value="">- Ignore / Blank -</option>';
        
        // Useful calculated fields
        optionsHTML += `<option value="CALC_FULLNAME" class="font-bold text-blue-600">Calculated: Full Name</option>`;

        ALL_COLUMNS.forEach(col => {
            if(col.key !== 'select' && col.key !== 'actions') {
                optionsHTML += `<option value="${col.key}">${col.label} (${col.key})</option>`;
            }
        });

        // Generate Rows
        headers.forEach((header, index) => {
            const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            const div = document.createElement('div');
            div.className = 'flex items-center gap-4 border-b border-gray-100 pb-2 last:border-0';
            div.innerHTML = `
                <div class="w-1/2 text-sm font-medium text-gray-700 truncate" title="${header}">
                    ${header}
                </div>
                <div class="w-1/2">
                    <select class="map-select w-full text-xs border-gray-300 rounded focus:ring-blue-500" data-header="${header}">
                        ${optionsHTML}
                    </select>
                </div>
            `;
            mappingList.appendChild(div);

            // Auto-Match Logic (Smart Selection)
            const select = div.querySelector('select');
            Array.from(select.options).forEach(opt => {
                const cleanOpt = opt.text.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Check if headers align (e.g. "Employee Name" matches "Full Name")
                if (cleanOpt.includes(cleanHeader) || cleanHeader.includes(cleanOpt)) {
                    select.value = opt.value;
                }
            });
        });

        loadTemplateDropdown();
    }

    // 5. Generate Custom CSV
    if(btnExecuteCustomExport) {
        btnExecuteCustomExport.addEventListener('click', () => {
            // A. Get Mapping Configuration
            const mapping = [];
            const selects = mappingList.querySelectorAll('.map-select');
            
            selects.forEach(sel => {
                mapping.push({ 
                    header: sel.dataset.header, // The User's Header
                    field: sel.value            // The System DB Field
                });
            });

            // B. Get Data (Using current table filters)
            const dataToExport = getFilteredAndSortedData(); 

            if (dataToExport.length === 0) {
                Swal.fire('Warning', 'No data to export based on current filters.', 'warning');
                return;
            }

            // C. Build CSV Content
            // Row 1: The User's Headers
            let csvContent = mapping.map(m => `"${m.header}"`).join(",") + "\n";

            // Row 2+: The Data
            dataToExport.forEach(row => {
                const csvRow = mapping.map(m => {
                    let val = '';

                    // 1. Handle Calculated Fields
                    if (m.field === 'CALC_FULLNAME') {
                        val = `${row.surname || ''}, ${row.firstname || ''} ${row.middlename || ''}`.trim();
                    } 
                    // 2. Handle Standard Fields
                    else if (m.field) {
                        val = row[m.field];
                        
                        // 3. Handle JSON Fields (Format neatly)
                        if (['character_references', 'employment_history', 'children_info'].includes(m.field) && val) {
                            try {
                                const parsed = JSON.parse(val);
                                if (Array.isArray(parsed)) {
                                    if (m.field === 'character_references') val = parsed.map(i => `${i.name} (${i.contact})`).join(' | ');
                                    else if (m.field === 'employment_history') val = parsed.map(i => `${i.company} (${i.position})`).join(' | ');
                                    else if (m.field === 'children_info') val = parsed.map(i => i.name).join(' | ');
                                }
                            } catch(e) { val = ''; }
                        }
                    }

                    // 4. Escape CSV characters
                    if (val === null || val === undefined) val = '';
                    let stringVal = String(val).replace(/"/g, '""'); // Double quotes
                    if (stringVal.search(/("|,|\n)/g) >= 0) stringVal = `"${stringVal}"`;
                    
                    return stringVal;
                });
                csvContent += csvRow.join(",") + "\n";
            });

            // D. Download File
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute("href", url);
            link.setAttribute("download", `Custom_Export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            exportModal.classList.add('hidden');
            
            // Log Action
            logUserAction(`Generated Custom Export with ${mapping.length} columns.`);
        });
    }

    // 6. Load Templates on Startup
    function loadTemplateDropdown() {
        if(!savedTemplatesSelect) return;
        
        savedTemplatesSelect.innerHTML = '<option value="">- Select a template to apply -</option>';
        const stored = localStorage.getItem(STORAGE_KEY);
        
        if (stored) {
            const templates = JSON.parse(stored); // Object: { "Payroll": { "EmpName": "surname" }, ... }
            Object.keys(templates).forEach(name => {
                savedTemplatesSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });
        }
    }

    if(btnSaveTemplate) {
        btnSaveTemplate.addEventListener('click', () => {
            const selects = document.querySelectorAll('.map-select');
            if (selects.length === 0) return;

            // Ask for name
            const name = prompt("Enter a name for this mapping template (e.g., 'Payroll Format'):");
            if (!name) return;

            // Build Mapping Object: { "CSV Header": "System Field" }
            const newMapping = {};
            let hasSelection = false;
            selects.forEach(sel => {
                if (sel.value) {
                    newMapping[sel.dataset.header] = sel.value;
                    hasSelection = true;
                }
            });

            if (!hasSelection) {
                alert("Please map at least one field before saving.");
                return;
            }

            // Save to LocalStorage
            const stored = localStorage.getItem(STORAGE_KEY);
            const templates = stored ? JSON.parse(stored) : {};
            templates[name] = newMapping;
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
            
            // Refresh UI
            loadTemplateDropdown();
            savedTemplatesSelect.value = name; // Auto-select the new one
            Swal.fire({ icon: 'success', title: 'Template Saved', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }

    if(savedTemplatesSelect) {
        savedTemplatesSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (!name) return;

            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;

            const templates = JSON.parse(stored);
            const mapping = templates[name]; // The saved mapping object

            if (mapping) {
                // Loop through currently visible selects and apply values
                const selects = document.querySelectorAll('.map-select');
                let matchCount = 0;

                selects.forEach(sel => {
                    const headerName = sel.dataset.header;
                    // Check if we have a saved map for this specific header
                    if (mapping[headerName]) {
                        sel.value = mapping[headerName];
                        matchCount++;
                    }
                });

                if (matchCount > 0) {
                    Swal.fire({ icon: 'success', title: `Mapped ${matchCount} columns`, toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
                } else {
                    Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'This template does not match any columns in the current file.', toast: true });
                }
            }
        });
    }

    if(btnDeleteTemplate) {
        btnDeleteTemplate.addEventListener('click', () => {
            const name = savedTemplatesSelect.value;
            if (!name) return;

            if (confirm(`Delete template "${name}"?`)) {
                const stored = localStorage.getItem(STORAGE_KEY);
                const templates = stored ? JSON.parse(stored) : {};
                
                delete templates[name];
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
                loadTemplateDropdown();
                Swal.fire({ icon: 'success', title: 'Deleted', toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            }
        });
    }
    
    // --- INITIALIZATION ---
    async function initializeDashboard() {
        try {
            // 1. SETUP GLOBALS & PLUGINS
            initializePlugins(); 

            // 2. CHECK: ARE WE ON THE INTERVIEWER PAGE? (Improved Logic)
            // We convert to LowerCase to ensure 'Interview_Dashboard.php' matches 'interview_dashboard.php'
            const path = window.location.pathname.toLowerCase();
            const isInterviewerPage = path.includes('interview_dashboard.php') || path.includes('interviewer');

            console.log("Current Path:", path); // Debugging
            console.log("Is Interviewer Page detected?", isInterviewerPage); // Debugging

            // 3. GET USER INFO
            const userRes = await fetch(`${API_URL}?action=getUserInfo&_t=${new Date().getTime()}`);
            if (!userRes.ok) throw new Error(`Auth Error: ${userRes.status}`);
            const userInfo = await userRes.json();
            
            USER_ROLE = userInfo.role || 'hr_staff';
            CURRENT_USER_ID = userInfo.employee_id; // Store ID for filtering

            // --- BRANCH A: INTERVIEWER DASHBOARD ---
            if (isInterviewerPage) {
                console.log("Initializing Interviewer Mode...");
                sessionStorage.removeItem('notifSeen'); 
                
                // Force load the notifications (This removes the spinner)
                await checkNotifications(); 
                
                return; // STOP HERE! Do not run HR logic below.
            }

            // --- BRANCH B: HR DASHBOARD (Only runs if NOT interviewer page) ---
            
            // 1. Manager Buttons logic...
            const allowedManagerRoles = ['hr_manager', 'super_user', 'manager', 'admin', 'lhi_manager', 'bps_manager', 'administrator'];
            if (viewRecruiterBtn) {
                if (allowedManagerRoles.includes(USER_ROLE)) {
                    viewRecruiterBtn.classList.remove('hidden');
                    viewRecruiterBtn.style.display = 'inline-block'; 
                } else {
                    viewRecruiterBtn.classList.add('hidden');
                    viewRecruiterBtn.style.display = 'none';
                    if (currentView === 'recruiters') { currentView = 'active'; if(viewActiveBtn) viewActiveBtn.click(); }
                }
            }
            
            // 2. Load Preferences
            if (userInfo.preferences && userInfo.preferences.visibleColumns) {
                const savedCols = userInfo.preferences.visibleColumns;
                const validCols = savedCols.filter(key => ALL_COLUMNS.some(c => c.key === key));
                if (!validCols.includes('select')) validCols.unshift('select');
                if (!validCols.includes('actions')) validCols.push('actions');
                visibleColumns = validCols;
            }

            // 3. Load Data
            await refreshAllData();
            
            // 4. Final Setup (Wrapped in checks to prevent crashes)
            if (typeof setupColumnSelector === 'function' && document.getElementById('columnCheckboxes')) {
                setupColumnSelector();
            }
            addEventListeners();
            
            // 5. Initial Notification Check (HR Side)
            if(btnNotification) checkNotifications();

        } catch (error) {
            console.error("Critical Init Error:", error);
            
            // EMERGENCY FIX: If error on Interviewer Page, manually remove spinner and show error
            const notifList = document.getElementById('notificationList');
            if (notifList) {
                notifList.innerHTML = `<div class="text-center p-10 text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Failed to load data. ${error.message}</p>
                </div>`;
            }
            
            if (document.body && !window.location.pathname.toLowerCase().includes('interview')) {
               Swal.fire({ icon: 'error', title: 'Dashboard Error', text: 'Failed to load data.' });
            }
        }
    }


    async function logUserAction(description) {
        try {
            const formData = new FormData();
            formData.append('description', description);
            await fetch(`${API_URL}?action=log_manual_action`, {
                method: 'POST',
                body: formData
            });
        } catch (e) {
            console.error("Failed to log action:", e);
        }
    }


    function initializePlugins() {
        // --- 1. MAIN DASHBOARD DATE PICKER ---
        const dateEl = document.getElementById('dateRangePicker');
        if (dateEl && typeof Litepicker !== 'undefined') {
             try {
                const today = new Date();
                const last7 = new Date(); last7.setDate(today.getDate() - 6);
                const last30 = new Date(); last30.setDate(today.getDate() - 29);
            
                dateRangePicker = new Litepicker({
                    element: dateEl,
                    singleMode: false,
                    allowRepick: true,
                    autoApply: false,
                    resetButton: true,
                    startDate: last7,
                    endDate: today,
                    plugins: ['ranges'],
                    ranges: { 'Last 7 Days': [last7, today], 'Last 30 Days': [last30, today] },
                    setup: (picker) => {
                        picker.on('selected', () => refreshAllData());
                        picker.on('clear:selection', () => refreshAllData());
                    }
                });
            } catch (err) {
                console.error("Litepicker Init Error:", err);
            }
        }

        // --- 2. ANALYTICS DATE PICKER (Now Independent) ---
        const anDateEl = document.getElementById('an_dateRange');
        if (anDateEl && typeof Litepicker !== 'undefined') {
            window.analyticsPicker = new Litepicker({
                element: anDateEl,
                singleMode: false,
                allowRepick: true,
                autoApply: true, 
                numberOfMonths: 1,
                numberOfColumns: 1, 
                plugins: ['ranges'],
                ranges: {
                    'This Month': [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()],
                    'Last Month': [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
                    'This Year': [new Date(new Date().getFullYear(), 0, 1), new Date()]
                },
                setup: (picker) => {
                    picker.on('selected', () => {
                         // Auto-generate logic if needed
                    });
                }
            });
        }
    }

    // --- DATA FETCHING ---
    async function refreshAllData() { 
        if (window.location.pathname.includes('interview_dashboard.php')) return;
        
        // SAFETY 2: If plugins failed to load, STOP.
        if (!dateRangePicker) return; 

        try {
            updateHeaderDates();
            await fetchDropdownAndStatusData();
            
            await Promise.all([
                fetchData(), 
                fetchChartData(), 
                fetchRecruiterPerformance()
            ]);
        } catch (e) {
            console.error("Refresh Error:", e);
            if(tableBody) tableBody.innerHTML = '<tr><td colspan="99" class="text-center p-8 text-red-500">Error refreshing data. <button onclick="location.reload()" class="text-blue-500 underline">Reload</button></td></tr>';
        }
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
            window.allApplicants = await response.json();
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
        enableColumnResizing();
        
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
                bodyHTML += `<tr class="bg-white border-b hover:bg-gray-50 transition duration-150 ease-in-out h-8 overflow-hidden">`;
                
                visibleColumns.forEach(colKey => { 
                    const colConfig = ALL_COLUMNS.find(c => c.key === colKey);
                    if (!colConfig) return;
                
                    let content = applicant[colKey] === null || applicant[colKey] === undefined ? '' : applicant[colKey];
                    let customTooltip = null; // Store formatted tooltip text here

                    // Format Names to Title Case
                    if (['surname', 'firstname', 'middlename', 'email','street_address','city','province'].includes(colKey) && typeof content === 'string') {
                        content = content.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
                    }

                    // --- NEW: COMPACT JSON COLUMNS (Hover to View) ---
                    if (colKey === 'character_references' || colKey === 'employment_history') {
                        if (content && content !== 'null') {
                            try {
                                const data = JSON.parse(content);
                                if (Array.isArray(data) && data.length > 0) {
                                    // A. Create Compact Badge for the Table Cell
                                    const count = data.length;
                                    const icon = colKey === 'character_references' ? 'fa-users' : 'fa-briefcase';
                                    const label = colKey === 'character_references' ? 'Refs' : 'Jobs';
                                    
                                    content = `<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100 cursor-help">
                                        <i class="fas ${icon}"></i> ${count} ${label}
                                    </span>`;

                                    // B. Build Detailed Text for Hover Tooltip
                                    let details = "";
                                    data.forEach(item => {
                                        if (colKey === 'character_references') {
                                            details += `• ${item.name || 'N/A'}`;
                                            if(item.company) details += ` (${item.company})`;
                                            if(item.contact) details += `\n   📞 ${item.contact}`;
                                        } else {
                                            details += `• ${item.company || 'N/A'} - ${item.position || ''}`;
                                            if(item.from || item.to) details += `\n   (${item.from||'?'} to ${item.to||'?'})`;
                                        }
                                        details += "\n\n"; // Add spacing between items
                                    });
                                    customTooltip = details.trim();

                                } else {
                                    content = '<span class="text-gray-300">-</span>';
                                }
                            } catch (e) {
                                content = '<span class="text-red-400 text-xs">Error</span>';
                            }
                        } else {
                            content = '';
                        }
                    }

                    else if (colKey === 'surname') {
                        // 1. Get Count of Completed Items
                        let completedItems = [];
                        try { completedItems = JSON.parse(applicant.requirements_checklist || '[]'); } catch(e) { completedItems = []; }
                        const count = completedItems.length;
                        const total = 14; 

                        // 2. Determine State
                        let colorClass = 'text-blue-600 font-semibold'; 
                        let icon = '';
                        let tooltip = 'Click to view requirements';

                        if (count >= total) {
                            colorClass = 'text-green-600 font-bold';
                            icon = '<i class="fas fa-check-circle ml-1 text-xs" title="Complete"></i>';
                            tooltip = 'Requirements Complete';
                        } 
                        else if (count > 0) {
                            colorClass = 'text-orange-600 font-semibold';
                            icon = `<i class="fas fa-hourglass-half ml-1 text-xs" title="${count}/${total} Completed"></i>`;
                            tooltip = `In Progress: ${count}/${total} items submitted`;
                        }

                        content = `<button class="req-btn hover:underline text-left truncate w-full ${colorClass}" data-id="${applicant.application_id}" title="${tooltip}">
                            ${content} ${icon}
                        </button>`;
                    }
                    
                    else if (colKey === 'select') {
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

                    else if ((colKey === 'initial_interviewer_id' || colKey === 'final_interviewer_id') && currentView === 'active') {
                        let options = `<option value="">- Assign -</option>`;
                        if (dropdownData.interviewers) {
                            options += dropdownData.interviewers.map(emp => 
                                `<option value="${emp.id}" ${emp.id == content ? 'selected' : ''}>${emp.label}</option>`
                            ).join('');
                        }
                        content = `<select class="table-select text-xs p-1 border border-gray-200 rounded w-full cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                                    style="min-width: 160px;"
                                    data-id="${applicant.application_id}" 
                                    data-field="${colKey}">
                                    ${options}
                                   </select>`;
                    }
                    
                    else if (colKey === 'interview_dates') {
                        if (content) {
                            const dateObj = new Date(content);
                            content = `<span class="whitespace-nowrap font-medium text-blue-700">
                                ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                                <span class="text-gray-500 text-[10px] ml-1">${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>`;
                        } else {
                            content = '-';
                        }
                    }
                    else if (colKey.includes('date')) { 
                        content = `<span class="whitespace-nowrap">${formatDate(content)}</span>`; 
                    }
                    else if (colKey === 'recruiter_name' && currentView === 'active') {
                        // CHANGE: r.split(',')[1] gets the Firstname. trim() removes the leading space.
                        let options = `<option value="">-</option>` + dropdownData.recruiters.map(r => {
                            const displayName = r.includes(',') ? r.split(',')[1].trim() : r; 
                            return `<option value="${r}" ${r === content ? 'selected' : ''}>${displayName}</option>`;
                        }).join(''); 
                        
                        content = `<select class="table-select text-xs p-1 border border-gray-200 rounded w-full" data-id="${applicant.application_id}" data-field="recruiter_name">${options}</select>`; 
                   }

                    // --- STYLES & LAYOUT ---
                    let cellClass = "px-2 py-2 text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis align-middle";
                    let style = "max-width: 150px;"; 

                    if (colKey === 'select') { 
                        cellClass = "px-2 py-2 w-8 sticky left-0 bg-white z-0 align-middle"; 
                        style = "";
                    } else if (colKey === 'email') {
                         style = "max-width: 180px;"; 
                    }

                    // --- FINAL TOOLTIP LOGIC ---
                    let tooltipText = "";
                    if (customTooltip) {
                        // Use our custom line-broken text for References/Jobs
                        tooltipText = customTooltip; 
                    } else {
                        // Default behavior: Strip HTML tags
                        tooltipText = String(content).replace(/<[^>]*>?/gm, '');
                    }

                    // Disable tooltip for specific interactive columns
                    if (colKey === 'initial_interviewer_id' || colKey === 'final_interviewer_id' || colKey === 'recruitment_status_text') {
                        tooltipText = ''; 
                    }

                    bodyHTML += `<td class="${cellClass}" style="${style}" title="${tooltipText}">${content}</td>`;
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
            const applicant = window.allApplicants.find(a => a.application_id == id);
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
        chartContainer.style.height = '250px'; 
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
            const applicantToUpdate = window.allApplicants.find(a => a.application_id == applicantId);
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

        // --- REQUISITION MODAL LOGIC ---
        let allRequisitions = []; // Stores the full raw data from API
        let reqState = {
            currentPage: 1,
            rowsPerPage: 5,         // Requirement: Limit into 5
            filterStatus: 'All',    // Requirement: Separate Open/Closed/Hold
            searchTerm: '',         // Requirement: Search Menu
            sortKey: 'created_at',  // Requirement: Sortable Headers
            sortDirection: 'desc'
        };
    
        const reqModal = document.getElementById('requisitionModal');
        const reqForm = document.getElementById('requisitionForm');
        const reqTableBody = document.getElementById('requisitionTableBody');
    
        // DOM Elements for Controls
        const reqSearchInput = document.getElementById('reqSearchInput');
        const reqStatusTabs = document.getElementById('reqStatusTabs');
        const reqPrevBtn = document.getElementById('reqPrevBtn');
        const reqNextBtn = document.getElementById('reqNextBtn');
        const reqPageInfo = document.getElementById('reqPageInfo');
        const btnSaveReq = document.getElementById('btnSaveReq');
        const btnCancelReqEdit = document.getElementById('btnCancelReqEdit');
        const btnSaveReqText = document.getElementById('btnSaveReqText');
        const reqFormTitle = document.getElementById('reqFormTitle');
    
        // --- 1. OPEN & LOAD ---
        document.getElementById('btnOpenRequisition')?.addEventListener('click', () => {
            reqModal.classList.remove('hidden');
            loadRequisitions(); // Fetch fresh data
            resetReqForm();     // Clear form
        });
    
        document.getElementById('closeRequisitionModal')?.addEventListener('click', () => {
            reqModal.classList.add('hidden');
        });
    
        // --- 2. FETCH DATA FROM API ---
        async function loadRequisitions() {
            reqTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-500"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading data...</td></tr>';
            
            try {
                const response = await fetch(`${API_URL}?action=getRequisitions`);
                const text = await response.text();
                
                // Error Handling for Empty/Invalid JSON
                try {
                    const data = JSON.parse(text);
                    if (data.error) throw new Error(data.error);
                    if (!Array.isArray(data)) throw new Error("Invalid data format.");
                    
                    allRequisitions = data; // Store globally
                    renderRequisitionTable(); // Render based on current state
    
                } catch (e) {
                    console.error("Parse Error:", text);
                    throw new Error("Server Error: " + text.substring(0, 50));
                }
            } catch (error) {
                reqTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4 font-bold">Error: ${error.message}</td></tr>`;
            }
        }
    
        // --- 3. RENDER TABLE (Filter -> Search -> Sort -> Paginate) ---
        function renderRequisitionTable() {
            // A. FILTER & SEARCH
            let filtered = allRequisitions.filter(req => {
                // Status Filter
                if (reqState.filterStatus !== 'All' && req.status !== reqState.filterStatus) return false;
                
                // Search Filter
                const search = reqState.searchTerm.toLowerCase();
                if (search && !req.requisition_id.toLowerCase().includes(search) && !req.project_name.toLowerCase().includes(search)) return false;
                
                return true;
            });
    
            // B. SORT
            filtered.sort((a, b) => {
                let valA = a[reqState.sortKey];
                let valB = b[reqState.sortKey];
                
                // Handle numeric sorting
                if (!isNaN(valA) && !isNaN(valB)) { valA = Number(valA); valB = Number(valB); }
                else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
    
                if (valA < valB) return reqState.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return reqState.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
    
            // C. PAGINATE
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / reqState.rowsPerPage) || 1;
            
            // Ensure page is valid
            if (reqState.currentPage > totalPages) reqState.currentPage = totalPages;
            if (reqState.currentPage < 1) reqState.currentPage = 1;
    
            const start = (reqState.currentPage - 1) * reqState.rowsPerPage;
            const pageData = filtered.slice(start, start + reqState.rowsPerPage);
    
            // D. GENERATE HTML
            reqTableBody.innerHTML = '';
            if (pageData.length === 0) {
                reqTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-400">No records found.</td></tr>`;
            } else {
                pageData.forEach(req => {
                    const balColor = req.balance > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold';
                    
                    // Status Badge Color
                    let statusBadge = '';
                    if(req.status === 'Open') statusBadge = '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">Open</span>';
                    if(req.status === 'Closed') statusBadge = '<span class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold">Closed</span>';
                    if(req.status === 'Hold') statusBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">Hold</span>';
    
                    reqTableBody.innerHTML += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td class="px-4 py-3 font-medium text-gray-800">${req.requisition_id}</td>
                        <td class="px-4 py-3 text-gray-600">${req.project_name}</td>
                        <td class="px-4 py-3 text-center">${statusBadge}</td>
                        <td class="px-4 py-3 text-center font-semibold text-gray-700">${req.headcount_approved}</td>
                        <td class="px-4 py-3 text-center text-blue-600 font-bold">${req.joined_count}</td>
                        
                        <td class="px-4 py-3 text-center text-orange-600 font-bold">${req.accepted_offer_count}</td>
                        
                        <td class="px-4 py-3 text-center ${balColor}">${req.balance}</td>
                        
                        <td class="px-4 py-3 text-center text-xs text-gray-500">
                            <span class="font-bold text-gray-700">${req.aging_days} Days</span><br>
                            <span class="text-[10px]">${req.date_approved}</span>
                        </td>

                        <td class="px-4 py-3 text-right">
                            <button class="text-blue-500 hover:text-blue-700 mx-1 btn-edit-req" data-id="${req.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                    `;
                });
            }
    
            // E. UPDATE CONTROLS
            reqPageInfo.textContent = `Showing ${pageData.length > 0 ? start + 1 : 0} to ${Math.min(start + reqState.rowsPerPage, totalItems)} of ${totalItems} entries`;
            reqPrevBtn.disabled = reqState.currentPage === 1;
            reqNextBtn.disabled = reqState.currentPage === totalPages;
        }
    
        // --- 4. EVENT LISTENERS (Search, Tabs, Sort, Page) ---
        
        // Status Tabs
        if (reqStatusTabs) {
            reqStatusTabs.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    // Update UI
                    reqStatusTabs.querySelectorAll('button').forEach(b => {
                        b.classList.remove('bg-white', 'shadow', 'text-purple-700');
                        b.classList.add('text-gray-500');
                    });
                    e.target.classList.add('bg-white', 'shadow', 'text-purple-700');
                    e.target.classList.remove('text-gray-500');
        
                    // Update State
                    reqState.filterStatus = e.target.dataset.status;
                    reqState.currentPage = 1; // Reset to page 1
                    renderRequisitionTable();
                }
            });
        }

        // Search (SAFE CHECK ADDED)
        if (reqSearchInput) {
            reqSearchInput.addEventListener('input', (e) => {
                reqState.searchTerm = e.target.value;
                reqState.currentPage = 1;
                renderRequisitionTable();
            });
        }

        // Sorting (SAFE CHECK ADDED)
        // We check if any sort headers exist before adding listeners
        const reqSortHeaders = document.querySelectorAll('.req-sort');
        if (reqSortHeaders.length > 0) {
            reqSortHeaders.forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.key;
                    if (reqState.sortKey === key) {
                        reqState.sortDirection = reqState.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        reqState.sortKey = key;
                        reqState.sortDirection = 'asc';
                    }
                    renderRequisitionTable();
                });
            });
        }

        // Pagination (SAFE CHECK ADDED)
        if (reqPrevBtn) {
            reqPrevBtn.addEventListener('click', () => {
                if (reqState.currentPage > 1) { reqState.currentPage--; renderRequisitionTable(); }
            });
        }
        if (reqNextBtn) {
            reqNextBtn.addEventListener('click', () => {
                reqState.currentPage++; renderRequisitionTable();
            });
        }
    
        // --- 5. EDIT LOGIC (Requirement: Allow user to Edit) ---
        if (reqTableBody) {
                reqTableBody.addEventListener('click', (e) => {
                    const btn = e.target.closest('.btn-edit-req');
                    if (btn) {
                        const id = btn.dataset.id;
                        const req = allRequisitions.find(r => r.id == id);
                        
                        if (req) {
                            // Populate Form
                            document.getElementById('req_db_id').value = req.id;
                            document.getElementById('req_id_input').value = req.requisition_id;
                            document.getElementById('req_project_input').value = req.project_name;
                            document.getElementById('req_headcount_input').value = req.headcount_approved;
                            document.getElementById('req_date_input').value = req.date_approved;
                            document.getElementById('req_status_input').value = req.status;
            
                            // Change Mode to Edit
                            reqFormTitle.textContent = "Edit Requisition";
                            reqFormTitle.classList.add("text-blue-600");
                            btnSaveReq.classList.remove("bg-purple-600", "hover:bg-purple-700");
                            btnSaveReq.classList.add("bg-blue-600", "hover:bg-blue-700");
                            btnSaveReqText.textContent = "Update";
                            btnSaveReq.innerHTML = '<i class="fas fa-save mr-1"></i> Update';
                            btnCancelReqEdit.classList.remove("hidden");
                        }
                    }
                });
            }

            function resetReqForm() {
                // Safe check inside the function just in case
                if (!reqForm) return; 

                reqForm.reset();
                document.getElementById('req_db_id').value = '';
                
                // Reset Visuals
                if(reqFormTitle) {
                    reqFormTitle.textContent = "Create New Requisition";
                    reqFormTitle.classList.remove("text-blue-600");
                }
                if(btnSaveReq) {
                    btnSaveReq.classList.add("bg-purple-600", "hover:bg-purple-700");
                    btnSaveReq.classList.remove("bg-blue-600", "hover:bg-blue-700");
                    btnSaveReqText.textContent = "Add";
                    btnSaveReq.innerHTML = '<i class="fas fa-plus-circle mr-1"></i> Add';
                }
                if(btnCancelReqEdit) btnCancelReqEdit.classList.add("hidden");
            }

            // SAFE CHECK ADDED
            if (btnCancelReqEdit) {
                btnCancelReqEdit.addEventListener('click', resetReqForm);
            }

            // --- 6. SAVE / UPDATE SUBMIT ---
            // SAFE CHECK ADDED
            if (reqForm) {
                reqForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    // Check if Add or Update
                    const dbId = document.getElementById('req_db_id').value;
                    const action = dbId ? 'updateRequisition' : 'addRequisition';
                    
                    // Get Data
                    const formData = new FormData(reqForm);
                    const data = Object.fromEntries(formData.entries());
            
                    // UI Feedback
                    const originalBtnHTML = btnSaveReq.innerHTML;
                    btnSaveReq.disabled = true;
                    btnSaveReq.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
                    try {
                        const response = await fetch(`${API_URL}?action=${action}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        const result = await response.json();
            
                        if (result.status === 'success') {
                            Swal.fire({ icon: 'success', title: 'Saved!', text: result.message, timer: 1500, showConfirmButton: false });
                            loadRequisitions(); // Reload table
                            resetReqForm();     // Reset form
                        } else {
                            throw new Error(result.message);
                        }
                    } catch (error) {
                        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
                    } finally {
                        btnSaveReq.disabled = false;
                        btnSaveReq.innerHTML = originalBtnHTML;
                    }
                });
            }
    
        // --- FORM & MODAL LOGIC ---
        function buildFormFields(container, applicantData = {}, formType) {
        container.innerHTML = '';
        ALL_COLUMNS.forEach(col => {
            if (!col.editable) return;
            let value = applicantData[col.key] || '';
            if (col.type === 'date' && value && value.length > 10) {
                value = value.substring(0, 10);
            }
            // 2. If it's a 'datetime-local' field (Application Date), format for HTML input
            // Database sends: "2026-01-27 14:30:00"
            // Input needs:    "2026-01-27T14:30"
            else if (col.type === 'datetime-local' && value) {
                // Replace the space with a 'T' and remove seconds if present
                value = value.replace(' ', 'T').substring(0, 16);
            }
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

                    // 1. Statuses Logic (Existing)
                    if (col.options_key === 'statuses') {
                        optionsHTML = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicantData.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                    } 
                    
                    // 2. NEW: Interviewer Dropdown Logic (FULLNAME - EDS)
                    else if (col.options_key === 'interviewers') {
                        const list = dropdownData.interviewers || [];
                        optionsHTML += list.map(emp => 
                            `<option value="${emp.id}" ${emp.id == value ? 'selected' : ''}>${emp.label}</option>`
                        ).join('');
                    }

                    // 3. Specific Skill Logic (Existing)
                    else if (col.key === 'specific_skill' && applicantData.position_applied) {
                        options = positionLogic[applicantData.position_applied]?.options || [];
                        optionsHTML += options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                    }

                    else if (col.key === 'Project') {
                        // Load projects from API
                        options = dropdownData.projects || [];
                        optionsHTML += options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                        // Add the special option
                        optionsHTML += `<option disabled>──────────</option>`;
                        optionsHTML += `<option value="Add New" class="font-bold text-blue-600">+ Add New Project</option>`;
                    }
                    
                    // 4. Default Logic (Recruiters, etc.)
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

            if (col.key === 'Project') {
                let newProjWrapper = document.createElement('div');
                newProjWrapper.id = `${formType}_newProjectContainer`;
                // Improved styling: added padding, border, and background color
                newProjWrapper.className = 'hidden mt-2 p-3 bg-blue-50 rounded border border-blue-200';
                
                newProjWrapper.innerHTML = `
                    <label class="block text-xs text-blue-800 font-bold mb-1"><i class="fas fa-plus-circle"></i> New Project Name:</label>
                    <input type="text" id="${formType}_project_new" name="project_new" class="block w-full rounded-md border-blue-300 shadow-sm focus:ring-blue-500 text-sm" placeholder="e.g. ACCOUNTING WAVE 5">
                `;
                container.appendChild(newProjWrapper);
            }

            // --- B. NEW: Employee ID Validation Logic ---
            if (col.key === 'employee_id') {
                const inputId = `${formType}_${keyForEdit}`;
                
                setTimeout(() => {
                    const el = document.getElementById(inputId);
                    if (el) {
                        // Create error message span
                        const msgSpan = document.createElement('span');
                        msgSpan.id = `${inputId}_error`;
                        msgSpan.className = 'text-xs text-red-600 font-bold hidden block mt-1'; // Ensure block display
                        el.parentNode.appendChild(msgSpan);

                        el.addEventListener('blur', async function() {
                            const val = this.value;
                            
                            // Get the submit button for the current form
                            const formId = formType === 'add' ? 'addApplicantForm' : 'editForm';
                            const submitBtn = document.querySelector(`#${formId} button[type="submit"]`);

                            if(!val) {
                                // If empty, clear errors and re-enable button
                                this.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
                                this.classList.remove('border-green-500');
                                msgSpan.classList.add('hidden');
                                if(submitBtn) { 
                                    submitBtn.disabled = false; 
                                    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                                }
                                return;
                            }

                            // Show checking state
                            msgSpan.textContent = "Checking ID...";
                            msgSpan.classList.remove('hidden', 'text-red-600');
                            msgSpan.classList.add('text-gray-500');

                            try {
                                const res = await fetch(`${API_URL}?action=checkEmployeeId&id=${val}`);
                                const data = await res.json();
                                
                                if (data.exists) {
                                    // ERROR: Disable Submit
                                    this.classList.add('border-red-500', 'ring-1', 'ring-red-500');
                                    this.classList.remove('border-green-500');
                                    
                                    msgSpan.textContent = `⛔ ID Taken: ${data.name}`;
                                    msgSpan.classList.remove('hidden', 'text-gray-500');
                                    msgSpan.classList.add('text-red-600');
                                    
                                    if(submitBtn) { 
                                        submitBtn.disabled = true; 
                                        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
                                        submitBtn.title = "Please fix the Duplicate Employee ID first";
                                    }
                                } else {
                                    // SUCCESS: Enable Submit
                                    this.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
                                    this.classList.add('border-green-500'); // Green border for valid
                                    
                                    msgSpan.textContent = "✅ ID Available";
                                    msgSpan.classList.remove('hidden', 'text-red-600', 'text-gray-500');
                                    msgSpan.classList.add('text-green-600');
                                    
                                    // Hide success message after 2 seconds to keep UI clean
                                    setTimeout(() => msgSpan.classList.add('hidden'), 2000);

                                    if(submitBtn) { 
                                        submitBtn.disabled = false; 
                                        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                                        submitBtn.removeAttribute('title');
                                    }
                                }
                            } catch (e) {
                                console.error("ID Check failed", e);
                            }
                        });
                    }
                }, 100);
            }

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
        const relSelect = document.getElementById('edit_relatives_at_xbp');
        if(relSelect) relSelect.dispatchEvent(new Event('change', { bubbles: true }));

        const workSelect = document.getElementById('edit_worked_at_xbp');
        if(workSelect) workSelect.dispatchEvent(new Event('change', { bubbles: true }));

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
        // 1. Get Data (respecting current filters/sort)
        const dataToExport = getFilteredAndSortedData();
        
        if (dataToExport.length === 0) {
            Swal.fire({ icon: 'info', title: 'No Data', text: 'There is no data to export based on your current filters.' });
            return;
        }

        // 2. Define Columns to Ignore
        const ignoredColumns = ['select', 'actions'];
        
        // 3. Filter Visible Columns
        const exportCols = visibleColumns.filter(key => !ignoredColumns.includes(key));

        // 4. Build CSV Headers (Strip HTML tags like <input>)
        const headers = exportCols.map(key => {
            const colDef = ALL_COLUMNS.find(c => c.key === key);
            let label = colDef ? colDef.label : key;
            // Remove HTML tags to get clean text (e.g., "ID", "Surname")
            return label.replace(/<[^>]*>?/gm, '').trim(); 
        });

        // 5. Build CSV Rows
        // Add BOM for Excel UTF-8 compatibility
        let csvContent = headers.map(h => `"${h}"`).join(",") + "\n"; 

        dataToExport.forEach(row => {
            const rowData = exportCols.map(key => {
                let val = row[key];

                // --- DATA TRANSFORMATION LOGIC ---

                // A. Interviewers
                if ((key === 'initial_interviewer_id' || key === 'final_interviewer_id') && val) {
                    if (dropdownData && dropdownData.interviewers) {
                        const match = dropdownData.interviewers.find(i => i.id == val);
                        if (match) val = match.label; 
                    }
                }

                // B. Status
                if (key === 'recruitment_status_id' && val) {
                    if (dropdownData && dropdownData.statuses) {
                        val = dropdownData.statuses[val] || val;
                    }
                }

                // C. Recruitment Status Text
                if (key === 'recruitment_status_text' && row['recruitment_status_text']) {
                    val = row['recruitment_status_text'];
                }

                // D. NEW: FORMAT JSON FIELDS FOR CSV (References, Employment, Children)
                // Convert JSON Array -> Readable String separated by pipes " | "
                if (['character_references', 'employment_history', 'children_info'].includes(key) && val) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                            if (key === 'character_references') {
                                // Format: Name (Contact) | Name (Contact)
                                val = parsed.map(i => `${i.name || ''} (${i.contact || ''})`).join(' | ');
                            } else if (key === 'employment_history') {
                                // Format: Company (Position) | Company (Position)
                                val = parsed.map(i => `${i.company || ''} (${i.position || ''})`).join(' | ');
                            } else if (key === 'children_info') {
                                // Format: Name | Name
                                val = parsed.map(i => i.name || '').join(' | ');
                            }
                        }
                    } catch (e) {
                        val = ''; // Leave blank if invalid JSON
                    }
                }

                // Handle Nulls
                if (val === null || val === undefined) val = '';
                
                // Convert to String & Escape Quotes
                let stringVal = String(val);
                stringVal = stringVal.replace(/"/g, '""'); // Double up quotes

                // Wrap in quotes if it contains comma, newline, or quotes
                if (stringVal.search(/("|,|\n)/g) >= 0) {
                    stringVal = `"${stringVal}"`;
                }
                
                return stringVal;
            });
            csvContent += rowData.join(",") + "\n";
        });

        // 6. Download File (Using Blob for better compatibility)
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        // Generate Filename: "Applicants_Active_2025-01-30.csv"
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `Applicants_${currentView}_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // --- NEW: LOG THE EXPORT ---
        logUserAction(`Exported ${dataToExport.length} records to CSV (${currentView} view).`);

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




    // Close Modal Listener
    document.getElementById('closeResumeModal')?.addEventListener('click', () => {
        resumeModal.classList.add('hidden');
        resumeFrame.src = ''; 
    });

    // File Change Listener
    if (resumeFile) {
        resumeFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. DEFINE THE ELEMENT FIRST
            const resumeAppId = document.getElementById('resume_app_id'); 

            document.getElementById('fileNameDisplay').textContent = file.name;

            const formData = new FormData();
            formData.append('resume', file);
            formData.append('application_id', resumeAppId.value); // Now it works
            formData.append('action', 'uploadResume'); 

            Swal.fire({ title: 'Uploading...', didOpen: () => Swal.showLoading() });

            try {
                const response = await fetch(`${API_URL}?action=uploadResume`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    Swal.fire('Success', 'Resume uploaded successfully', 'success');
                    
                    // Update Local Data
                    const appMain = window.allApplicants.find(a => a.application_id == resumeAppId.value);
                    if (appMain) appMain.resume_path = result.path;

                    const appNotif = allNotifications.find(a => a.application_id == resumeAppId.value);
                    if (appNotif) appNotif.resume_path = result.path;
                    
                    // Re-open/Refresh modal using the global function
                    if (typeof window.openResumeModal === 'function') {
                        window.openResumeModal(appMain || appNotif);
                    }
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        });
    }

    
    // --- EVENT LISTENERS ---
function addEventListeners() {
        // 1. Search & Pagination (Safe Checks Added)
        if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderAll(); });
        if (rowsPerPageSelect) rowsPerPageSelect.addEventListener('change', (e) => { currentPage = 1; rowsPerPage = parseInt(e.target.value, 10); renderAll(); });
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage--; renderAll(); } });
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(getFilteredAndSortedData().length / rowsPerPage); if(currentPage < totalPages) { currentPage++; renderAll(); } });
        
        // 2. View Toggles (Safe Checks Added)
        const viewButtons = { active: viewActiveBtn, archived: viewArchivedBtn, recruiters: viewRecruiterBtn };
        Object.entries(viewButtons).forEach(([view, btn]) => {
            if (btn) { // <--- SAFETY CHECK
                btn.addEventListener('click', () => {
                    Object.values(viewButtons).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentView = view;
                    refreshAllData();
                });
            }
        });
        
        // 3. Modals & Actions (Safe Checks Added)
        if (viewLogsBtn) viewLogsBtn.addEventListener('click', openLogsModal);
        if (closeLogsModal) closeLogsModal.addEventListener('click', () => logsModal.classList.add('hidden'));
        if (columnToggleBtn) columnToggleBtn.addEventListener('click', () => columnSelector.classList.remove('hidden'));
        if (closeColumnSelector) closeColumnSelector.addEventListener('click', () => columnSelector.classList.add('hidden'));
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
        if (newApplicantBtn) {
            newApplicantBtn.addEventListener('click', () => {
                // REPLACE 'recruitment_form.php' WITH YOUR ACTUAL FILE PATH
                // '_blank' opens it in a new tab so you don't lose your dashboard view
                window.open('../views/recruitment_userform.html', '_blank'); 
            });
        }
        if (cancelAddBtn) cancelAddBtn.addEventListener('click', () => addApplicantModal.classList.add('hidden'));
        
        if (columnCheckboxes) {
            columnCheckboxes.addEventListener('change', e => { 
                if(e.target.type === 'checkbox') { 
                    const key = e.target.dataset.key; 
                    if (e.target.checked) { if (!visibleColumns.includes(key)) visibleColumns.push(key); } 
                    else { visibleColumns = visibleColumns.filter(col => col !== key); } 
                    renderAll(); 
                } 
            });
        }
        
        if (statusFiltersContainer) {
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
        }

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

        // 4. Logout (Safe Check Added)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            
            newBtn.addEventListener('click', () => {
                Swal.fire({
                    title: 'Are you sure?',
                    text: "You will be logged out.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, log out'
                }).then((result) => {
                    if (result.isConfirmed) {
                        sessionStorage.removeItem('notifSeen');
                        Swal.fire({ title: 'Logging out...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
                        setTimeout(() => { window.location.href = '../logout.php'; }, 800);
                    }
                });
            });
        }
        
        // 5. Table Interactions (Safe Checks Added)
        if (tableHead) {
            tableHead.addEventListener('click', e => { 
                const target = e.target.closest('.sortable'); 
                if (target) { 
                    const key = target.dataset.key; 
                    if (sortConfig.key === key) { sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'; } 
                    else { sortConfig.key = key; sortConfig.direction = 'asc'; } 
                    renderAll(); 
                } 
            });
        }

        if (tableBody) {
            tableBody.addEventListener('change', e => { 
                if (e.target.classList.contains('table-select')) { 
                    const applicantId = e.target.dataset.id, field = e.target.dataset.field, value = e.target.value; 
                    handleQuickUpdate(applicantId, field, value); 
                } 
            });
        
            tableBody.addEventListener('click', e => { 
                const target = e.target; 
                if(target.classList.contains('edit-btn')) { 
                    const applicant = window.allApplicants.find(a => a.application_id == target.dataset.id);
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
                
                if (targetId.endsWith('_Project')) {
                    const newProjContainer = document.getElementById(`${formType}_newProjectContainer`);
                    if (newProjContainer) {
                        if (e.target.value === 'Add New') {
                            newProjContainer.classList.remove('hidden');
                            document.getElementById(`${formType}_project_new`).required = true;
                            document.getElementById(`${formType}_project_new`).focus();
                        } else {
                            newProjContainer.classList.add('hidden');
                            document.getElementById(`${formType}_project_new`).required = false;
                            document.getElementById(`${formType}_project_new`).value = '';
                        }
                    }
                }

                // --- 5. NEW: RELATIVES @ XBP TOGGLE ---
                if (targetId.endsWith('_relatives_at_xbp')) {
                    const detailsInput = document.getElementById(`${formType}_relatives_at_xbp_details`);
                    if (detailsInput) {
                        // Find the parent div to hide the whole label+input
                        const container = detailsInput.closest('div'); 
                        if (e.target.value === 'Yes') {
                            container.classList.remove('hidden');
                            detailsInput.required = true;
                        } else {
                            container.classList.add('hidden');
                            detailsInput.required = false;
                            detailsInput.value = ''; // Clear value
                        }
                    }
                }

                // --- 6. NEW: WORKED @ XBP TOGGLE ---
                if (targetId.endsWith('_worked_at_xbp')) {
                    const workInput = document.getElementById(`${formType}_worked_at_xbp_details`);
                    if (workInput) {
                        const container = workInput.closest('div');
                        if (e.target.value === 'Yes') {
                            container.classList.remove('hidden');
                            workInput.required = true;
                        } else {
                            container.classList.add('hidden');
                            workInput.required = false;
                            workInput.value = '';
                        }
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
                checkNotifications();
            } catch (error) { 
                alert('Save failed: ' + error.message); 
                // Re-disable inputs if save failed (optional, usually better to leave open for retry)
            }
        });

        if (addApplicantForm) { 
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
        }    

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

            // LISTENER: Save Resume Link
        const btnSaveLink = document.getElementById('btnSaveLink');
        if (btnSaveLink) {
            btnSaveLink.addEventListener('click', async () => {
                const link = document.getElementById('resumeLinkInput').value.trim();
                const id = document.getElementById('resume_app_id').value;

                if (!link) { Swal.fire('Error', 'Please enter a link.', 'warning'); return; }

                // UI Loading
                btnSaveLink.disabled = true;
                btnSaveLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                try {
                    const response = await fetch(`${API_URL}?action=saveResumeLink`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ application_id: id, resume_link: link })
                    });
                    const result = await response.json();

                    if (result.status === 'success') {
                        Swal.fire({ icon: 'success', title: 'Saved', text: 'Link saved successfully', timer: 1000, showConfirmButton: false });

                        // Update Local Data
                        const appMain = window.allApplicants.find(a => a.application_id == id);
                        if (appMain) appMain.resume_path = result.path;

                        const appNotif = allNotifications.find(a => a.application_id == id);
                        if (appNotif) appNotif.resume_path = result.path;

                        // Refresh Modal
                        openResumeModal(appMain || appNotif);
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                } finally {
                    btnSaveLink.disabled = false;
                    btnSaveLink.innerHTML = '<i class="fas fa-link mr-1"></i> Save Link';
                }
            });
        }

        if (toggleChartBtn) {
                    toggleChartBtn.addEventListener('click', () => {
                        chartContainer.classList.toggle('hidden');
                        toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-up');
                        toggleChartBtn.querySelector('i').classList.toggle('fa-chevron-down');
                    });
                }
                if (chartMetricSelect) chartMetricSelect.addEventListener('change', fetchChartData);
                if (exportDataBtn) exportDataBtn.addEventListener('click', exportVisibleData);
            }
        chartMetricSelect.addEventListener('change', fetchChartData);
        exportDataBtn.addEventListener('click', exportVisibleData);

        // --- REQUIREMENTS MODAL LISTENERS ---
        
        // 1. Click on Surname (Delegated from Table Body)
        tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.req-btn'); 
            
            if (btn) {
                const id = btn.dataset.id;
                const applicant = window.allApplicants.find(a => a.application_id == id);
                
                if (!applicant) return;

                // Debug: Check if resume path exists in data
                // console.log("Applicant Resume Path:", applicant.resume_path); 

                Swal.fire({
                    title: `${applicant.surname}, ${applicant.firstname}`,
                    text: 'Select an action:',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: '<i class="fas fa-tasks"></i> Requirements',
                    denyButtonText: '<i class="fas fa-file-alt"></i> Resume',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#3b82f6', 
                    denyButtonColor: '#10b981',    
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Option 1: Requirements
                        if (typeof openRequirementsModal === 'function') {
                            openRequirementsModal(applicant);
                        }
                    } else if (result.isDenied) {
                        // Option 2: Resume (Using Global Function)
                        if (typeof window.openResumeModal === 'function') {
                            window.openResumeModal(applicant);
                        } else {
                            console.error("openResumeModal is missing! Check if code is pasted at top of file.");
                        }
                    }
                });
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

        // ==========================================
    // --- FLEXIBLE ANALYTICS REPORT LOGIC ---
    // ==========================================
    
    let analyticsChartInstance = null;
    let analyticsDataCache = []; // Stores the calculated data for export

    // 1. Event Listeners
    const openAnalyticsBtn = document.getElementById('openAnalyticsBtn');
    const analyticsModal = document.getElementById('analyticsModal');
    const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
    const anGenerateBtn = document.getElementById('an_generateBtn');
    const anExportBtn = document.getElementById('an_exportBtn');
    const anDateField = document.getElementById('an_dateField');
    const anDateRange = document.getElementById('an_dateRange');
    
    if (anDateField && anDateRange) {
        anDateField.addEventListener('change', (e) => {
            if (e.target.value === "") {
                anDateRange.disabled = true;
                anDateRange.value = "";
                if(window.analyticsPicker) window.analyticsPicker.clearSelection();
            } else {
                anDateRange.disabled = false;
                // If empty, default to "This Month" to nudge the user
                if (!anDateRange.value && window.analyticsPicker) {
                    const start = new Date(); start.setDate(1);
                    window.analyticsPicker.setDateRange(start, new Date());
                }
            }
        });
    }
    
    // View Switchers (Bar / Pie / Table)
    const anViewBtns = document.querySelectorAll('.an-view-btn');
    anViewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // UI Toggle
            anViewBtns.forEach(b => {
                b.classList.remove('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
                b.classList.add('bg-white', 'text-gray-600', 'border-gray-300');
            });
            const target = e.currentTarget;
            target.classList.add('active', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
            target.classList.remove('bg-white', 'text-gray-600', 'border-gray-300');
            
            // Trigger Render
            generateAnalyticsReport();
        });
    });

    if(openAnalyticsBtn) {
        openAnalyticsBtn.addEventListener('click', () => {
            analyticsModal.classList.remove('hidden');
            populateAnalyticsFilters();
            generateAnalyticsReport(); 
        });
    }

    if(closeAnalyticsBtn) {
        closeAnalyticsBtn.addEventListener('click', () => {
            analyticsModal.classList.add('hidden');
        });
    }

    if(anGenerateBtn) {
        anGenerateBtn.addEventListener('click', generateAnalyticsReport);
    }

    if(anExportBtn) {
        anExportBtn.addEventListener('click', exportAnalyticsData);
    }

    function populateAnalyticsFilters() {
        const intSelect = document.getElementById('an_interviewer_name');
        if (intSelect && window.dashboardGlobals && window.dashboardGlobals.getDropdownData) {
            const data = window.dashboardGlobals.getDropdownData();
            
            // Save current selection if re-populating
            const currentVal = intSelect.value;
            
            intSelect.innerHTML = '<option value="All">All Interviewers</option>';
            
            if (data.interviewers) {
                data.interviewers.forEach(emp => {
                    intSelect.innerHTML += `<option value="${emp.id}">${emp.label}</option>`;
                });
            }
            
            // Restore selection if valid
            if(currentVal) intSelect.value = currentVal;
        }
    }

    // 2. Core Logic: Generate Data
    function generateAnalyticsReport() {
        console.log("Generating Report..."); 

        // 1. Get Elements Safely
        const groupByEl = document.getElementById('an_groupBy');
        const metricEl = document.getElementById('an_metric');
        
        if (!groupByEl || !metricEl) return;

        const groupBy = groupByEl.value;
        const metric = metricEl.value;
        const excludeArchived = document.getElementById('an_exclude_archived')?.checked || false;

        // --- NEW FILTER ELEMENTS ---
        const locEl = document.getElementById('an_location');
        const intRoleEl = document.getElementById('an_interviewer_role');
        const intNameEl = document.getElementById('an_interviewer_name');
        
        // Get New Filter Values
        const filterLoc = locEl ? locEl.value : 'All';
        const filterRole = intRoleEl ? intRoleEl.value : 'All';
        const filterIntId = intNameEl ? intNameEl.value : 'All';

        const activeViewBtn = document.querySelector('.an-view-btn.active');
        const viewType = activeViewBtn ? activeViewBtn.dataset.view : 'bar';

        // 2. Date Filter Setup
        let filterStartDate = null, filterEndDate = null;
        const dateFieldEl = document.getElementById('an_dateField');
        let dateField = dateFieldEl ? dateFieldEl.value : null;

        if (dateField && window.analyticsPicker) {
            filterStartDate = window.analyticsPicker.getStartDate()?.toJSDate();
            filterEndDate = window.analyticsPicker.getEndDate()?.toJSDate();
            if(filterStartDate) filterStartDate.setHours(0,0,0,0);
            if(filterEndDate) filterEndDate.setHours(23,59,59,999);
        }

        // 3. Filter Data
        let data = window.allApplicants.filter(app => {
            // A. Archive Filter
            if (excludeArchived && app.is_archived == 1) return false;
            
            // B. Date Filter
            if (dateField && filterStartDate && filterEndDate) {
                const rawDate = app[dateField];
                if (!rawDate || rawDate === '0000-00-00') return false; 
                const targetDate = new Date(rawDate);
                if (targetDate < filterStartDate || targetDate > filterEndDate) return false;
            }

            // C. Location Filter
            if (filterLoc !== 'All') {
                const appLoc = (app.location || '').toLowerCase();
                if (appLoc !== filterLoc.toLowerCase()) return false;
            }

            // D. Interviewer Filter (Specific Person)
            if (filterIntId !== 'All') {
                const initId = String(app.initial_interviewer_id || '');
                const finalId = String(app.final_interviewer_id || '');
                const searchId = String(filterIntId);

                if (filterRole === 'Initial') {
                    if (initId !== searchId) return false;
                } else if (filterRole === 'Final') {
                    if (finalId !== searchId) return false;
                } else { 
                    if (initId !== searchId && finalId !== searchId) return false;
                }
            }

            // --- E. HIDE UNASSIGNED LOGIC (NEW) ---
            // If we are grouping by Initial Interviewer, remove those with no initial interviewer
            if (groupBy === 'initial_interviewer_id') {
                const id = app.initial_interviewer_id;
                if (!id || id === '0' || id === '') return false;
            }
            // If we are grouping by Final Interviewer, remove those with no final interviewer
            if (groupBy === 'final_interviewer_id') {
                const id = app.final_interviewer_id;
                if (!id || id === '0' || id === '') return false;
            }

            return true;
        });

        // Update UI Count
        const totalEl = document.getElementById('an_totalRecords');
        if(totalEl) totalEl.textContent = data.length;

        // 4. Group & Aggregate
        const grouped = {};
        
        data.forEach(app => {
            let key = app[groupBy] || 'Unknown';
            
            // --- A. DATE LOGIC ---
            if (groupBy === 'interview_year_month') {
                if (app.interview_dates) {
                    const d = new Date(app.interview_dates);
                    key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                } else {
                    key = 'No Interview';
                }
            }

            // --- B. INTERVIEWER ID -> NAME LOGIC ---
            else if (groupBy === 'initial_interviewer_id' || groupBy === 'final_interviewer_id') {
                if (typeof dropdownData !== 'undefined' && Array.isArray(dropdownData.interviewers)) {
                    const match = dropdownData.interviewers.find(i => i.id == key);
                    if (match) {
                        key = match.label;
                    } else {
                        // Double check: if it somehow slipped through filter, ignore it or label it
                        key = 'Unassigned'; 
                    }
                }
            }

            // --- C. STATUS ID -> NAME LOGIC ---
            else if (groupBy === 'recruitment_status_id') {
                if (typeof dropdownData !== 'undefined' && dropdownData.statuses) {
                    key = dropdownData.statuses[key] || 'Unknown';
                }
            }

            if (!grouped[key]) {
                grouped[key] = { count: 0, sum: 0 };
            }

            grouped[key].count++;
            
            let val = 0;
            if (metric === 'avg_score') val = parseFloat(app.screening_score) || 0;
            if (metric === 'avg_age') val = parseFloat(app.age) || 0;
            if (metric === 'avg_numeric') val = parseFloat(app.numeric_score) || 0;
            if (metric === 'avg_written') val = parseFloat(app.written_exam_score) || 0;

            grouped[key].sum += val;
        });

        // 5. Format for Chart
        const labels = Object.keys(grouped);
        const chartData = labels.map(label => {
            if (metric === 'count') return grouped[label].count;
            return grouped[label].count > 0 ? (grouped[label].sum / grouped[label].count).toFixed(1) : 0;
        });

        const combined = labels.map((l, i) => ({ label: l, value: parseFloat(chartData[i]) }));
        combined.sort((a, b) => b.value - a.value);
        
        const sortedLabels = combined.map(i => i.label);
        const sortedValues = combined.map(i => i.value);
        
        analyticsDataCache = combined;
        
        // Update Titles
        const topCatEl = document.getElementById('an_topCategory');
        const reportTitleEl = document.getElementById('an_reportTitle');
        if(topCatEl) topCatEl.textContent = combined.length > 0 ? `${combined[0].label} (${combined[0].value})` : '-';
        if(reportTitleEl) reportTitleEl.textContent = `Report: ${groupByEl.selectedOptions[0].text}`;

        // 6. Render
        const chartContainer = document.getElementById('an_chartContainer');
        const tableContainer = document.getElementById('an_tableContainer');

        if (viewType === 'table') {
            if(chartContainer) chartContainer.classList.add('hidden');
            if(tableContainer) tableContainer.classList.remove('hidden');
            renderAnalyticsTable(sortedLabels, sortedValues, metric, data.length);
        } else {
            if(chartContainer) chartContainer.classList.remove('hidden');
            if(tableContainer) tableContainer.classList.add('hidden');
            renderAnalyticsChart(sortedLabels, sortedValues, viewType, metric);
        }
    }
    // 3. Render Chart
    function renderAnalyticsChart(labels, data, type, metric) {
        const ctx = document.getElementById('an_chartCanvas').getContext('2d');
        
        if (analyticsChartInstance) {
            analyticsChartInstance.destroy();
        }

        // Color Palette
        const colors = [
            '#625f9c', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
            '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
        ];

        analyticsChartInstance = new Chart(ctx, {
            type: type, // 'bar' or 'pie'
            data: {
                labels: labels,
                datasets: [{
                    label: metric === 'count' ? 'Applicants' : 'Value',
                    data: data,
                    backgroundColor: type === 'pie' ? colors : '#42b1a2',
                    borderRadius: type === 'bar' ? 4 : 0,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: type === 'pie', position: 'right' },
                    datalabels: { // Requires datalabels plugin we added earlier
                        color: type === 'pie' ? '#fff' : '#000',
                        anchor: type === 'pie' ? 'center' : 'end',
                        align: type === 'pie' ? 'center' : 'top',
                        formatter: Math.round,
                        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0 // Hide 0s
                    }
                },
                scales: type === 'bar' ? {
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                    x: { grid: { display: false } }
                } : {} // No scales for pie
            }
        });
    }

    // 4. Render Table
    function renderAnalyticsTable(labels, values, metric, totalCount) {
        const tbody = document.getElementById('an_tableBody');
        tbody.innerHTML = '';
        
        labels.forEach((label, index) => {
            const val = values[index];
            // Calc Percentage (only valid for Counts)
            let pct = metric === 'count' ? ((val / totalCount) * 100).toFixed(1) + '%' : '-';
            
            const tr = `
                <tr class="hover:bg-gray-50 border-b border-gray-100">
                    <td class="px-5 py-3 text-sm text-gray-800 font-medium">${label}</td>
                    <td class="px-5 py-3 text-sm text-right text-indigo-600 font-bold">${val}</td>
                    <td class="px-5 py-3 text-sm text-right text-gray-500">${pct}</td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });
    }

    // 5. Export
    function exportAnalyticsData() {
        if (analyticsDataCache.length === 0) { Swal.fire('Error', 'No data to export', 'warning'); return; }
        
        let csv = "Category,Value\n";
        analyticsDataCache.forEach(row => {
            csv += `"${row.label}",${row.value}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "analytics_report.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logUserAction(`Exported Analytics Report (${analyticsDataCache.length} rows).`);
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









