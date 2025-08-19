// --- Global State for Modals ---
let activeEmployeeList = []; // NEW
let inactiveEmployeeList = [];
let newHireEmployeeList = [];
let currentlyDisplayedActiveEmployees = []; // NEW
let currentlyDisplayedInactiveEmployees = [];
let currentlyDisplayedNewHireEmployees = [];
const rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", function () {
    // Initial data fetch
    fetchData(null, null, "ALL");

    // --- Main Click Handler for the Document ---
    document.addEventListener("click", (event) => {
        // NEW: Logic for opening the active employee modal
        if (event.target.id === "activelist") {
            const modal = document.getElementById("active-employee-form");
            // This assumes a similar structure to your other dashboard cards
            const overlay = event.target.closest('div').querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedActiveEmployees = activeEmployeeList;
                showActiveEmployeeForm(currentlyDisplayedActiveEmployees, 1);
            }
        }

        if (event.target.id === "attritionlist") {
            const modal = document.getElementById("inactive-employee-form");
            const overlay = event.target.closest('.attritionlist').querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedInactiveEmployees = inactiveEmployeeList;
                showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, 1);
            }
        }
        
        if (event.target.id === "newlyhiredlist") {
            const modal = document.getElementById("newlyhired-employee-form");
            const overlay = event.target.closest('.newlyhiredlist').querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedNewHireEmployees = newHireEmployeeList;
                showNewHireForm(currentlyDisplayedNewHireEmployees, 1);
            }
        }

        // MODIFIED: Close handler now includes the new active-employee-form
        if (event.target.classList.contains('close-button') || event.target.classList.contains('modal-overlay')) {
            document.querySelectorAll('#active-employee-form, #inactive-employee-form, #newlyhired-employee-form').forEach(m => m.classList.add("hidden"));
            document.querySelectorAll('.modal-overlay').forEach(o => o.classList.add("hidden"));
        }
        
        // MODIFIED: Pagination handler now supports all three modals
        if (event.target.matches('.modal-page-btn') && !event.target.disabled) {
            const newPage = parseInt(event.target.dataset.page, 10);
            if (isNaN(newPage)) return;

            if (event.target.closest('#active-employee-form')) {
                showActiveEmployeeForm(currentlyDisplayedActiveEmployees, newPage);
            } else if (event.target.closest('#inactive-employee-form')) {
                showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, newPage);
            } else if (event.target.closest('#newlyhired-employee-form')) {
                showNewHireForm(currentlyDisplayedNewHireEmployees, newPage);
            }
        }

            // NEW: Handle clicks on any "Export CSV" button
        if (event.target.classList.contains('export-csv-btn')) {
            const modalType = event.target.dataset.modalType;

            switch (modalType) {
                case 'active':
                    exportToCSV(currentlyDisplayedActiveEmployees, 'Active_Employees');
                    break;
                case 'inactive':
                    exportToCSV(currentlyDisplayedInactiveEmployees, 'Inactive_Employees');
                    break;
                case 'newhire':
                    exportToCSV(currentlyDisplayedNewHireEmployees, 'New_Hire_Employees');
                    break;
                case 'project':
                    const modal = event.target.closest('#project-employee-modal');
                    const title = modal.querySelector('h2').textContent.replace(/\s-\s/g, '_').replace(/\s/g, ''); // Creates a clean filename like "ProjectName_SiteName"
                    exportToCSV(currentlyDisplayedProjectGroupEmployees, `Project_${title}_Employees`);
                    break;
            }
        }

    });

    // MODIFIED: Live search handler now includes the active employee search
    document.addEventListener('input', (event) => {
        // NEW: Live search for Active Employees modal
        if (event.target.id === 'active-search-input') {
            const searchTerm = event.target.value.toLowerCase();
            currentlyDisplayedActiveEmployees = activeEmployeeList.filter(emp => {
                const eds = (emp.EDS || '').toString().toLowerCase();
                const fullname = (emp.FULLNAME || '').toLowerCase();
                const supervisor = (emp.SUPERVISOR || '').toLowerCase();
                return eds.includes(searchTerm) || fullname.includes(searchTerm) || supervisor.includes(searchTerm);
            });
            showActiveEmployeeForm(currentlyDisplayedActiveEmployees, 1);
        }
        
        if (event.target.id === 'inactive-search-input') {
            const searchTerm = event.target.value.toLowerCase();
            currentlyDisplayedInactiveEmployees = inactiveEmployeeList.filter(emp => {
                const eds = (emp.EDS || '').toString().toLowerCase();
                const fullname = (emp.FULLNAME || '').toLowerCase();
                return eds.includes(searchTerm) || fullname.includes(searchTerm);
            });
            showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, 1);
        }

        if (event.target.id === 'newhire-search-input') {
            const searchTerm = event.target.value.toLowerCase();
            currentlyDisplayedNewHireEmployees = newHireEmployeeList.filter(emp => {
                const eds = (emp.EDS || '').toString().toLowerCase();
                const fullname = (emp.FULLNAME || '').toLowerCase();
                return eds.includes(searchTerm) || fullname.includes(searchTerm);
            });
            showNewHireForm(currentlyDisplayedNewHireEmployees, 1);
        }
    });

});

// --- Data Fetching & Rendering ---
function fetchData(startDate = null, endDate = null, entity = "ALL") {
    let url = `fetch_data.php?entity=${encodeURIComponent(entity)}`;
    if (startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // --- 1. Update Dashboard Cards ---
            document.getElementById("activelist").textContent = data.ACTIVE ?? 'N/A';
            document.getElementById("attritionlist").textContent = data.INACTIVE_CURRENT_YEAR ?? 'N/A';
            document.getElementById("newlyhiredlist").textContent = data.NEWHIRES_CURRENT_YEAR ?? 'N/A';
            
            // --- 2. Populate Global Lists for Modals ---
            activeEmployeeList = data.ACTIVE_EMPLOYEES || [];
            inactiveEmployeeList = data.INACTIVE_EMPLOYEES || [];
            newHireEmployeeList = data.NEWHIRE_EMPLOYEES || [];
            fullProjectSummaryList = data.PROJECT_EMPLOYEE_SUMMARY || []; // Use the global variable
            
            // --- 3. Render the Project Employees Table and Attach Listener ---
            const tableBody = document.querySelector('.employee-count table tbody');
            if (tableBody) {
                tableBody.innerHTML = ''; // Clear previous content

                if (fullProjectSummaryList.length > 0) {
                    // Render the table rows with clickable links
                    fullProjectSummaryList.forEach((item, index) => {
                        const row = document.createElement('tr');
                        row.className = 'project-group-row';
                        row.dataset.index = index; 
                        row.innerHTML = `
                            <td>${item.PROJECT}</td>
                            <td><a href="#" class="view-employees-link">${item.EMPLOYEECOUNT}</a></td>
                            <td>${item.SITE}</td>
                        `;
                        tableBody.appendChild(row);
                    });

                    // Attach the click listener now that the table is rendered
                    if (!tableBody.dataset.listenerAttached) {
                        tableBody.addEventListener('click', (event) => {
                            if (event.target.classList.contains('view-employees-link')) {
                                event.preventDefault();
                                const row = event.target.closest('.project-group-row');
                                if (!row) return;

                                const index = parseInt(row.dataset.index, 10);
                                const selectedGroup = fullProjectSummaryList[index];

                                if (selectedGroup && selectedGroup.EMPLOYEES) {
                                    currentProjectGroupEmployees = selectedGroup.EMPLOYEES;
                                    currentlyDisplayedProjectGroupEmployees = currentProjectGroupEmployees;
                                    
                                    const modal = document.getElementById("project-employee-modal");
                                    const overlay = document.querySelector('.modal-overlay');
                                    
                                    if (modal && overlay) {
                                        modal.classList.remove("hidden");
                                        overlay.classList.remove("hidden");
                                        showProjectEmployeeModal(currentlyDisplayedProjectGroupEmployees, 1, selectedGroup.PROJECT, selectedGroup.SITE);
                                    }
                                }
                            }
                        });
                        tableBody.dataset.listenerAttached = 'true';
                    }
                } else {
                    tableBody.innerHTML = `<tr><td colspan="3">No project data available.</td></tr>`;
                }
            }
        })
        .catch(error => console.error("Error in fetchData:", error));
}

function showActiveEmployeeForm(employees, page) {
    const container = document.getElementById("active-employee-form");
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = '';
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `
            <div class="modal-title-container">
                <h2>Active Employees</h2>
                <div class="modal-header-buttons">
                    <button class="export-csv-btn" data-modal-type="active">Export CSV</button>
                    <button class="close-button">&times;</button>
                </div>
            </div>
            <div class="modal-search-container">
                <input type="text" id="active-search-input" placeholder="Search by EDS, Name, or Supervisor...">
            </div>`;
        container.appendChild(header);
    }
    // ... rest of function is unchanged
    let tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.remove();
    container.appendChild(createTableWrapper(employees, page));
    let footer = container.querySelector('.modal-footer');
    if (footer) footer.remove();
    const newFooter = createModalFooter(employees.length, page);
    if (newFooter) container.appendChild(newFooter);
}


// REFACTORED: This function now updates only the necessary parts of the modal, preserving the search input focus.
function showInactiveEmployeeForm(employees, page) {
    const container = document.getElementById("inactive-employee-form");
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = '';
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `
            <div class="modal-title-container">
                <h2>Inactive Employees</h2>
                <div class="modal-header-buttons">
                    <button class="export-csv-btn" data-modal-type="inactive">Export CSV</button>
                    <button class="close-button">&times;</button>
                </div>
            </div>
            <div class="modal-search-container">
                <input type="text" id="inactive-search-input" placeholder="Search by EDS or Name...">
            </div>`;
        container.appendChild(header);
    }
    // ... rest of function is unchanged
    let tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.remove();
    container.appendChild(createTableWrapper(employees, page));
    let footer = container.querySelector('.modal-footer');
    if (footer) footer.remove();
    const newFooter = createModalFooter(employees.length, page);
    if (newFooter) container.appendChild(newFooter);
}


// REFACTORED: Applying the same improved rendering logic to the New Hire form.
function showNewHireForm(employees, page) {
    const container = document.getElementById("newlyhired-employee-form");
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = '';
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `
            <div class="modal-title-container">
                <h2>Newly Hired Employees</h2>
                <div class="modal-header-buttons">
                    <button class="export-csv-btn" data-modal-type="newhire">Export CSV</button>
                    <button class="close-button">&times;</button>
                </div>
            </div>
            <div class="modal-search-container">
                <input type="text" id="newhire-search-input" placeholder="Search by EDS or Name...">
            </div>`;
        container.appendChild(header);
    }
    // ... rest of function is unchanged
    let tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.remove();
    container.appendChild(createTableWrapper(employees, page));
    let footer = container.querySelector('.modal-footer');
    if (footer) footer.remove();
    const newFooter = createModalFooter(employees.length, page);
    if (newFooter) container.appendChild(newFooter);
}

// --- Reusable Helper Functions --- (The rest of the file is unchanged)
function createTableWrapper(employees, page) {
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper";
    if (!employees || employees.length === 0) {
        tableWrapper.innerHTML = "<p>No records found.</p>";
    } else {
        const table = document.createElement("table");
        table.className = "inactive-table"; // You might want a different class for the new hire table for styling
        const thead = document.createElement("thead");
        thead.innerHTML = `<tr><th>EDS</th><th>Full Name</th><th>Project</th><th>Position</th><th>Site</th><th>Supervisor</th><th>Status</th><th>Hire Date</th><th>Resigned Date</th></tr>`;
        const tbody = document.createElement("tbody");
        const paginatedItems = employees.slice((page - 1) * rowsPerPage, page * rowsPerPage);
        paginatedItems.forEach(emp => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${emp.EDS||''}</td><td>${emp.FULLNAME||''}</td><td>${emp.PROJECT||''}</td><td>${emp.POSITION||''}</td><td>${emp.SITE||''}</td><td>${emp.SUPERVISOR||''}</td><td>${emp.STATUS||''}</td><td>${emp.HIREDDATE||''}</td><td>${emp.RESIGNEDDATE||''}</td>`;
            tbody.appendChild(row);
        });
        table.append(thead, tbody);
        tableWrapper.appendChild(table);
    }
    return tableWrapper;
}

function createModalFooter(totalItems, page) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (totalPages > 1) {
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        footer.appendChild(buildPagination(totalPages, page));
        return footer;
    }
    return null;
}

function buildPagination(totalPages, currentPage) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-pagination';
    let content = '';
    const siblingCount = 1;
    const totalSlots = 2 * siblingCount + 5;
    content += `<button class="modal-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;
    if (totalPages <= totalSlots) {
        for (let i = 1; i <= totalPages; i++) {
            content += `<button class="modal-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
    } else {
        const showLeftEllipsis = currentPage > siblingCount + 2;
        const showRightEllipsis = currentPage < totalPages - (siblingCount + 1);
        content += `<button class="modal-page-btn ${1 === currentPage ? 'active' : ''}" data-page="1">1</button>`;
        if (showLeftEllipsis) content += `<span class="ellipsis">...</span>`;
        let startPage, endPage;
        if (!showLeftEllipsis && showRightEllipsis) {
            startPage = 2; endPage = 2 * siblingCount + 3;
        } else if (showLeftEllipsis && !showRightEllipsis) {
            startPage = totalPages - (2 * siblingCount + 2); endPage = totalPages - 1;
        } else {
            startPage = currentPage - siblingCount; endPage = currentPage + siblingCount;
        }
        for (let i = startPage; i <= endPage; i++) {
            content += `<button class="modal-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (showRightEllipsis) content += `<span class="ellipsis">...</span>`;
        content += `<button class="modal-page-btn ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
    }
    content += `<button class="modal-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;
    wrapper.innerHTML = content;
    return wrapper;
}

function showNotification(message, isSuccess) {
    const popup = document.getElementById('success-popup');
    if (!popup) {
        console.error("Notification popup element with id 'success-popup' not found!");
        return;
    }
    const messageSpan = popup.querySelector('.message');
    if(messageSpan) {
        messageSpan.textContent = message;
    }
    if (isSuccess) {
        popup.classList.remove('error');
    } else {
        popup.classList.add('error');
    }
    popup.classList.remove('hidden');
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 3000);
}

/**
 * Converts an array of employee objects to a CSV string and triggers a download.
 * @param {Array<Object>} employeeData The array of employees to export.
 * @param {string} baseFilename The base name for the downloaded file (e.g., "Active_Employees").
 */
function exportToCSV(employeeData, baseFilename) {
    if (!employeeData || employeeData.length === 0) {
        // You can replace this with your showNotification function for a nicer look
        alert("There is no data to export.");
        return;
    }

    const headers = ["EDS", "Full Name", "Project", "Position", "Site", "Supervisor", "Status", "Hire Date", "Resigned Date"];
    
    // Helper function to safely handle values that might contain commas or quotes
    const escapeCSV = (value) => {
        const str = String(value ?? ''); // Handle null/undefined by converting to empty string
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvRows = [headers.join(',')]; // Start the CSV with the header row

    // Convert each employee object to a CSV row
    employeeData.forEach(emp => {
        const row = [
            escapeCSV(emp.EDS),
            escapeCSV(emp.FULLNAME),
            escapeCSV(emp.PROJECT),
            escapeCSV(emp.POSITION),
            escapeCSV(emp.SITE),
            escapeCSV(emp.SUPERVISOR),
            escapeCSV(emp.STATUS),
            escapeCSV(emp.HIREDDATE),
            escapeCSV(emp.RESIGNEDDATE)
        ];
        csvRows.push(row.join(','));
    });

    // Create the downloadable file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        link.setAttribute("href", url);
        link.setAttribute("download", `${baseFilename}_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}