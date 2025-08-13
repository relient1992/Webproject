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
    fetch(url).then(response => response.json()).then(data => {
        document.getElementById("activelist").textContent = data.ACTIVE ?? 'N/A';
        document.getElementById("attritionlist").textContent = data.INACTIVE_CURRENT_YEAR ?? 'N/A';
        document.getElementById("newlyhiredlist").textContent = data.NEWHIRES_CURRENT_YEAR ?? 'N/A';
        
        // MODIFIED: Populate the new active employee list
        activeEmployeeList = data.ACTIVE_EMPLOYEES || [];
        inactiveEmployeeList = data.INACTIVE_EMPLOYEES || [];
        newHireEmployeeList = data.NEWHIRE_EMPLOYEES || [];
        
        const projectEmployeeData = data.PROJECT_EMPLOYEE_SUMMARY || [];
        const tableBody = document.querySelector('.employee-count table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            if (projectEmployeeData.length > 0) {
                projectEmployeeData.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${item.PROJECT}</td><td>${item.EMPLOYEECOUNT}</td><td>${item.SITE}</td>`;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">No project data available.</td></tr>`;
            }
        }
    }).catch(console.error);
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
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-search-container">
                <input type="text" id="active-search-input" placeholder="Search EDS,Name,or Sup">
            </div>`;
        container.appendChild(header);
    }

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
    
    // Create header with search bar only if it doesn't exist
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = ''; // Clear only on initial render
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `
            <div class="modal-title-container">
                <h2>Inactive Employees</h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-search-container">
                <input type="text" id="inactive-search-input" placeholder="Search EDS or Name...">
            </div>`;
        container.appendChild(header);
    }

    // Always remove and recreate the table and footer to reflect new data (filtered or paginated)
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

    // Create header with search bar only if it doesn't exist
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = ''; // Clear only on initial render
        const header = document.createElement("div");
        header.className = "modal-header";
        header.innerHTML = `
            <div class="modal-title-container">
                <h2>Newly Hired Employees</h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-search-container">
                <input type="text" id="newhire-search-input" placeholder="Search by EDS or Name...">
            </div>`;
        container.appendChild(header);
    }
    
    // Always remove and recreate the table and footer
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