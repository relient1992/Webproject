document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIG & ROLE SIMULATION ---
    const USER_ROLE = 'hr_manager'; // Change to 'hr_staff' to test role-based access
    const API_URL = '../hr_dashboard_api.php';
    const ALL_COLUMNS = [
        { key: 'application_id', label: 'ID', editable: false },
        { key: 'surname', label: 'Surname', editable: true, type: 'text' },
        { key: 'firstname', label: 'First Name', editable: true, type: 'text' },
        { key: 'middlename', label: 'Middle Name', editable: true, type: 'text' },
        { key: 'birthday', label: 'Birthday', editable: true, type: 'date' },
        { key: 'gender', label: 'Gender', editable: true, type: 'select', options: ['Male', 'Female'] },
        { key: 'mobile_number', label: 'Mobile', editable: true, type: 'text' },
        { key: 'email', label: 'Email', editable: true, type: 'email' },
        { key: 'street_address', label: 'Street', editable: true, type: 'text' },
        { key: 'city', label: 'City', editable: true, type: 'text' },
        { key: 'province', label: 'Province', editable: true, type: 'text' },
        { key: 'postcode', label: 'Postcode', editable: true, type: 'text' },
        { key: 'position_applied', label: 'Position', editable: true, type: 'select', options: ['Data Entry Operator', 'Call Center Agent', 'Medcoder'] },
        { key: 'recruiter_name', label: 'Recruiter', editable: true, type: 'select', options_key: 'recruiters' },
        { key: 'recruitment_status_text', label: 'Status', editable: false }, // The text version for display
        { key: 'recruitment_status_id', label: 'Status', editable: true, type: 'select', options_key: 'statuses'}, // The ID for editing
        { key: 'status_date', label: 'Status Date', editable: true, type: 'date' },
        { key: 'application_source', label: 'Source', editable: true, type: 'select', options: ['Job Portal', 'Employee Referral', 'Career Page', 'Recruitment Agency', 'Walk-in'] },
        { key: 'application_date', label: 'Applied On', editable: false },
        { key: 'interview_dates', label: 'Interview Dates', editable: true, type: 'textarea' },
        { key: 'interviewers', label: 'Interviewers', editable: true, type: 'textarea' },
        { key: 'feedback_comments', label: 'Feedback', editable: true, type: 'textarea' },
        { key: 'offer_status', label: 'Offer', editable: true, type: 'select', options: ['Pending', 'Accepted', 'Declined'] },
        { key: 'offer_date', label: 'Offer Date', editable: true, type: 'date' },
        { key: 'joining_date', label: 'Joining Date', editable: true, type: 'date' },
        { key: 'employee_id', label: 'Employee ID', editable: true, type: 'text' },
        { key: 'actions', label: 'Actions', editable: false },
        { key: 'Project', label: 'Project', editable: true, type: 'text' },
    ];
    const DEFAULT_VISIBLE_COLUMNS = ['surname', 'firstname', 'position_applied', 'recruiter_name', 'recruitment_status_text', 'application_date'];
    
    // --- STATE ---
    let allApplicants = [];
    let visibleColumns = [...DEFAULT_VISIBLE_COLUMNS, 'actions'];
    let sortConfig = { key: 'application_date', direction: 'desc' };
    let currentStatusFilter = 'all';
    let dropdownData = { recruiters: [], statuses: {} };

    // --- ELEMENT SELECTORS ---
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const columnToggleBtn = document.getElementById('columnToggleBtn');
    const columnSelector = document.getElementById('columnSelector');
    const columnCheckboxes = document.getElementById('columnCheckboxes');
    const closeColumnSelector = document.getElementById('closeColumnSelector');
    const statusFiltersContainer = document.getElementById('statusFilters');
    const editModal = document.getElementById('editModal');
    const editFormContent = document.getElementById('editFormContent');
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('deleteBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editApplicationIdInput = document.getElementById('edit_application_id');
    
    // --- MAIN FUNCTIONS ---
    async function initializeDashboard() {
        await fetchDropdownAndStatusData();
        await fetchData();
        setupColumnSelector();
    }

    async function fetchDropdownAndStatusData() {
        try {
            const [statusRes, dropdownRes] = await Promise.all([
                fetch(`${API_URL}?action=getStatusCounts`),
                fetch(`${API_URL}?action=getDropdownData`)
            ]);
            if (!statusRes.ok || !dropdownRes.ok) throw new Error('Failed to fetch initial data.');
            const statusCounts = await statusRes.json();
            dropdownData = await dropdownRes.json();
            renderSidebar(statusCounts);
        } catch (error) {
            statusFiltersContainer.innerHTML = `<p class="p-4 text-red-500">Could not load filters.</p>`;
        }
    }

    async function fetchData() {
        tableBody.innerHTML = ''; // Clear table while loading
        try {
            const response = await fetch(`${API_URL}?action=readAll&status=${currentStatusFilter}`);
            if (!response.ok) throw new Error('Network response was not ok.');
            allApplicants = await response.json();
            renderAll();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center p-8 text-red-500">Failed to load data: ${error.message}</td></tr>`;
        }
    }

    function renderAll() {
        const filteredAndSorted = getFilteredAndSortedData();
        renderTable(filteredAndSorted);
        updateAnalytics(allApplicants); // Analytics should be based on the total unfiltered data
    }

    function getFilteredAndSortedData() {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredData = allApplicants.filter(applicant => Object.values(applicant).some(value => String(value).toLowerCase().includes(searchTerm)));
        filteredData.sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filteredData;
    }

    function renderTable(applicants) {
        let headerHTML = '<tr>';
        ALL_COLUMNS.forEach(col => {
            if (visibleColumns.includes(col.key)) {
                let sortClass = sortConfig.key === col.key ? sortConfig.direction : '';
                headerHTML += `<th scope="col" class="px-6 py-3 sortable ${sortClass}" data-key="${col.key}">${col.label}</th>`;
            }
        });
        headerHTML += '</tr>';
        tableHead.innerHTML = headerHTML;

        let bodyHTML = '';
        if (applicants.length > 0) {
             applicants.forEach(applicant => {
                bodyHTML += `<tr class="bg-white border-b hover:bg-gray-50">`;
                ALL_COLUMNS.forEach(col => {
                    if (visibleColumns.includes(col.key)) {
                        // FIX #3: Handle null values properly, defaulting to an empty string.
                        let content = applicant[col.key] === null || applicant[col.key] === undefined ? '' : applicant[col.key];
                        if (col.key === 'recruiter_name') {
                            let options = `<option value="">- Assign -</option>` + dropdownData.recruiters.map(r => `<option value="${r}" ${r === content ? 'selected' : ''}>${r}</option>`).join('');
                            content = `<select class="table-select" data-id="${applicant.application_id}" data-field="recruiter_name">${options}</select>`;
                        } else if (col.key === 'recruitment_status_text') {
                            let options = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicant.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                            content = `<select class="table-select" data-id="${applicant.application_id}" data-field="recruitment_status">${options}</select>`;
                        } else if (col.key === 'actions') {
                            content = `<button class="text-blue-600 hover:underline" data-id="${applicant.application_id}">Edit</button>`;
                        }
                        bodyHTML += `<td class="px-6 py-4">${content || 'N/A'}</td>`;
                    }
                });
                bodyHTML += '</tr>';
            });
        } else {
            bodyHTML = `<tr><td colspan="${visibleColumns.length}" class="text-center p-8 text-gray-500">No applicants found for this filter.</td></tr>`;
        }
        tableBody.innerHTML = bodyHTML;
    }

    function renderSidebar(statusCounts) {
        let sidebarHTML = `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="all"><span>All Applicants</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${statusCounts.all}</span></a>`;
        Object.entries(statusCounts).forEach(([statusId, data]) => {
            if (statusId !== 'all') {
                sidebarHTML += `<a href="#" class="filter-link flex justify-between items-center px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100" data-status="${statusId}"><span>${data.name}</span><span class="bg-gray-200 text-xs font-semibold px-2 py-1 rounded-full">${data.count}</span></a>`;
            }
        });
        statusFiltersContainer.innerHTML = sidebarHTML;
        document.querySelector(`.filter-link[data-status="${currentStatusFilter}"]`).classList.add('active');
    }
    
    function updateAnalytics(applicants) {
        document.getElementById('totalApplicants').textContent = applicants.length;
        const interviewing = applicants.filter(a => ['3', '4'].includes(String(a.recruitment_status_id))).length;
        document.getElementById('interviewingCount').textContent = interviewing;
        const currentMonth = new Date().getMonth();
        const hiredThisMonth = applicants.filter(a => {
            const joiningDate = new Date(a.joining_date);
            return a.recruitment_status_id == '6' && joiningDate.getMonth() === currentMonth;
        }).length;
        document.getElementById('hiredThisMonth').textContent = hiredThisMonth;

        const hiredApplicants = applicants.filter(a => a.joining_date && a.application_date && a.recruitment_status_id == '6');
        if(hiredApplicants.length > 0) {
            const totalDays = hiredApplicants.reduce((sum, a) => sum + (new Date(a.joining_date) - new Date(a.application_date)), 0);
            const avgDays = Math.round((totalDays / hiredApplicants.length) / (1000 * 60 * 60 * 24));
            document.getElementById('avgTimeToHire').textContent = `${avgDays} days`;
        } else {
            document.getElementById('avgTimeToHire').textContent = 'N/A';
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
            const response = await fetch(`${API_URL}?action=updateApplicant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: applicantId, [field]: value })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            // Refresh data to show changes and update counts
            await fetchDropdownAndStatusData();
            const applicantToUpdate = allApplicants.find(a => a.application_id == applicantId);
            if(applicantToUpdate) applicantToUpdate[field] = value;
        } catch (error) {
            alert('Update failed: ' + error.message);
            fetchData(); // Revert changes on screen if update fails
        }
    }
    
    function openEditModal(applicant) {
        editApplicationIdInput.value = applicant.application_id;
        editFormContent.innerHTML = '';
        ALL_COLUMNS.forEach(col => {
            if (!col.editable) return;
            
            let inputHTML = '';
            const value = applicant[col.key] || '';
            const label = `<label for="edit_${col.key}" class="block text-sm font-medium text-gray-700">${col.label}</label>`;

            let keyForEdit = col.key;
            if(keyForEdit === 'recruitment_status_text') {
                keyForEdit = 'recruitment_status_id'; // Use the ID field for the edit form
            }

            switch(col.type) {
                case 'select':
                     let options = [];
                    if (col.options) {
                        options = col.options;
                    } else if (col.options_key === 'recruiters') {
                        options = dropdownData.recruiters;
                    } else if (col.options_key === 'statuses') {
                        // For statuses, we need to map the ID/Name object
                        let optionsHTML = Object.entries(dropdownData.statuses).map(([id, name]) => `<option value="${id}" ${id == applicant.recruitment_status_id ? 'selected' : ''}>${name}</option>`).join('');
                        inputHTML = `<select id="edit_recruitment_status_id" name="recruitment_status" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">${optionsHTML}</select>`;
                        // Skip the default select builder for this special case
                        editFormContent.innerHTML += `<div><label for="edit_recruitment_status_id" class="block text-sm font-medium text-gray-700">Status</label>${inputHTML}</div>`;
                        return;
                    }
                     let optionsHTML = options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('');
                     inputHTML = `<select id="edit_${keyForEdit}" name="${keyForEdit}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">${optionsHTML}</select>`;

                    break;
                case 'textarea':
                    inputHTML = `<textarea id="edit_${keyForEdit}" name="${keyForEdit}" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">${value}</textarea>`;
                    break;
                default:
                    inputHTML = `<input type="${col.type}" id="edit_${keyForEdit}" name="${keyForEdit}" value="${value}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">`;
            }
            editFormContent.innerHTML += `<div>${label}${inputHTML}</div>`;
        });
        deleteBtn.style.display = USER_ROLE === 'hr_manager' ? 'inline-block' : 'none';
        editModal.classList.remove('hidden');
    }
    
    // --- EVENT HANDLERS ---
    searchInput.addEventListener('input', renderAll);
    columnToggleBtn.addEventListener('click', () => columnSelector.classList.remove('hidden'));
    closeColumnSelector.addEventListener('click', () => columnSelector.classList.add('hidden'));
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    columnCheckboxes.addEventListener('change', (e) => {
        if(e.target.type === 'checkbox') {
            const key = e.target.dataset.key;
            if (e.target.checked) {
                if (!visibleColumns.includes(key)) visibleColumns.push(key);
            } else {
                visibleColumns = visibleColumns.filter(col => col !== key);
            }
            renderAll();
        }
    });

    statusFiltersContainer.addEventListener('click', (e) => {
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

    tableHead.addEventListener('click', (e) => {
        const target = e.target.closest('.sortable');
        if (target) {
            const key = target.dataset.key;
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.key = key;
                sortConfig.direction = 'asc';
            }
            renderAll();
        }
    });

    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('table-select')) {
            const applicantId = e.target.dataset.id;
            const field = e.target.dataset.field;
            const value = e.target.value;
            handleQuickUpdate(applicantId, field, value);
        }
    });
    
    tableBody.addEventListener('click', (e) => {
         const target = e.target;
         if(target.tagName === 'BUTTON' && target.dataset.id){
             const applicant = allApplicants.find(a => a.application_id == target.dataset.id);
             if(applicant) openEditModal(applicant);
         }
    });
    
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);
        const dataFromForm = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch(`${API_URL}?action=updateApplicant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataFromForm)
            });
            const result = await response.json();
            if(result.status !== 'success') throw new Error(result.message);
            
            // FIX #2: Immediately update local data for instant UI reflection
            const updatedApplicantIndex = allApplicants.findIndex(a => a.application_id == dataFromForm.application_id);
            if(updatedApplicantIndex !== -1) {
                // Merge the updated data into the local applicant object
                allApplicants[updatedApplicantIndex] = {...allApplicants[updatedApplicantIndex], ...dataFromForm};
                // Manually update the status text if the status ID was changed
                if (dataFromForm.recruitment_status) {
                     allApplicants[updatedApplicantIndex].recruitment_status_text = dropdownData.statuses[dataFromForm.recruitment_status];
                }
            }
            
            editModal.classList.add('hidden');
            renderAll(); // Re-render with the updated local data
            await fetchDropdownAndStatusData(); // Refresh sidebar counts in the background

        } catch (error) {
            alert('Save failed: ' + error.message);
        }
    });

    deleteBtn.addEventListener('click', async () => {
        const id = editApplicationIdInput.value;
        // FIX #1: Find the applicant in the local data to use their name
        const applicantToDelete = allApplicants.find(a => a.application_id == id);
        const applicantName = applicantToDelete ? `${applicantToDelete.surname}, ${applicantToDelete.firstname}` : `applicant #${id}`;

        if(confirm(`Are you sure you want to permanently delete ${applicantName}?`)) {
            try {
                const response = await fetch(`${API_URL}?action=deleteApplicant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ application_id: id })
                });
                const result = await response.json();
                if(result.status !== 'success') throw new Error(result.message);
                editModal.classList.add('hidden');
                // Refresh everything after a deletion
                await initializeDashboard();
            } catch (error) {
                 alert('Delete failed: ' + error.message);
            }
        }
    });
    
    initializeDashboard();
});