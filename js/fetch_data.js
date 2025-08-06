// --- Global State for Modals ---
let inactiveEmployeeList = [];
let newHireEmployeeList = [];
const rowsPerPage = 10; // Used for modal pagination

document.addEventListener("DOMContentLoaded", function () {
    // Initial data fetch
    fetchData(null, null, "ALL");

    // --- Main Click Handler for the Document ---
    document.addEventListener("click", (event) => {
        if (event.target.id === "attritionlist") {
            const modal = document.getElementById("inactive-employee-form");
            const overlay = event.target.closest('.attritionlist').querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                showInactiveEmployeeForm(inactiveEmployeeList, 1);
            }
        }
        if (event.target.id === "newlyhiredlist") {
            const modal = document.getElementById("newlyhired-employee-form");
            const overlay = event.target.closest('.newlyhiredlist').querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                showNewHireForm(newHireEmployeeList, 1);
            }
        }
        if (event.target.classList.contains('close-button') || event.target.classList.contains('modal-overlay')) {
            document.querySelectorAll('#inactive-employee-form, #newlyhired-employee-form').forEach(m => m.classList.add("hidden"));
            document.querySelectorAll('.modal-overlay').forEach(o => o.classList.add("hidden"));
        }
        if (event.target.matches('.modal-page-btn') && !event.target.disabled) {
            const newPage = parseInt(event.target.dataset.page, 10);
            if (isNaN(newPage)) return;
            if (event.target.closest('#inactive-employee-form')) {
                showInactiveEmployeeForm(inactiveEmployeeList, newPage);
            } else if (event.target.closest('#newlyhired-employee-form')) {
                showNewHireForm(newHireEmployeeList, newPage);
            }
        }
    });

    // Other DOM initialization
    const applyBtn = document.getElementById("apply-btn");
    const startInput = document.getElementById("start-date");
    const endInput = document.getElementById("end-date");
    const entitySelect = document.getElementById("entity-select");

    if (applyBtn && startInput && endInput && entitySelect) {
        applyBtn.addEventListener("click", () => {
            const startDate = startInput.value;
            const endDate = endInput.value;
            const entity = entitySelect.value;
            if (startDate && endDate) {
                fetchData(startDate, endDate, entity);
                showNotification("Data loaded successfully!", true);
            } else {
                showNotification("Please select dates!", false);
            }
        });

    }
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
        inactiveEmployeeList = data.INACTIVE_EMPLOYEES ?? [];
        newHireEmployeeList = data.NEWHIRE_EMPLOYEES ?? [];
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

// --- Modal Rendering Functions ---
function showInactiveEmployeeForm(employees, page) {
    const container = document.getElementById("inactive-employee-form");
    container.innerHTML = "";
    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<h2>Inactive Employees</h2><button class="close-button">&times;</button>`;
    container.appendChild(header);
    const tableWrapper = createTableWrapper(employees, page);
    container.appendChild(tableWrapper);
    const footer = createModalFooter(employees.length, page);
    if (footer) container.appendChild(footer);
}

function showNewHireForm(employees, page) {
    const container = document.getElementById("newlyhired-employee-form");
    container.innerHTML = "";
    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<h2>Newly Hired Employees</h2><button class="close-button">&times;</button>`;
    container.appendChild(header);
    const tableWrapper = createTableWrapper(employees, page);
    container.appendChild(tableWrapper);
    const footer = createModalFooter(employees.length, page);
    if (footer) container.appendChild(footer);
}

// --- Reusable Helper Functions ---
function createTableWrapper(employees, page) {
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper";
    if (!employees || employees.length === 0) {
        tableWrapper.innerHTML = "<p>No records found.</p>";
    } else {
        const table = document.createElement("table");
        table.className = "inactive-table";
        thead = document.createElement("thead");
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

// --- NEW: The showNotification function ---
/**
 * Shows a notification popup message.
 * @param {string} message The text to display.
 * @param {boolean} isSuccess True for a success style (green), false for an error style (red).
 */
function showNotification(message, isSuccess) {
    const popup = document.getElementById('success-popup');
    if (!popup) {
        console.error("Notification popup element with id 'success-popup' not found!");
        return;
    }
    const messageSpan = popup.querySelector('.message');

    // Set the message text
    if(messageSpan) {
        messageSpan.textContent = message;
    }

    // Set the style based on success or error
    if (isSuccess) {
        popup.classList.remove('error');
    } else {
        popup.classList.add('error');
    }

    // Show the popup
    popup.classList.remove('hidden');

    // Automatically hide the popup after 3 seconds (3000 milliseconds)
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 3000);
}