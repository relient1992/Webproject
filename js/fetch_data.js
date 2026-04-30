// --- Global State for Modals (Changed to 'var' to prevent SPA crash errors) ---
var activeEmployeeList = []; 
var inactiveEmployeeList = [];
var newHireEmployeeList = [];
var currentlyDisplayedActiveEmployees = []; 
var currentlyDisplayedInactiveEmployees = [];
var currentlyDisplayedNewHireEmployees = [];
var rowsPerPage = 10;

document.addEventListener("DOMContentLoaded", function () {
    // Initial data fetch
    fetchData(null, null, "ALL");

    // --- Main Click Handler for the Document ---
    document.addEventListener("click", (event) => {
        
        // Use .closest() so clicking anywhere on the premium cards triggers the modal
        if (event.target.closest('.activelist')) {
            const modal = document.getElementById("active-employee-form");
            const overlay = document.querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none";
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedActiveEmployees = activeEmployeeList;
                showActiveEmployeeForm(currentlyDisplayedActiveEmployees, 1);
            }
        }

        if (event.target.closest('.attritionlist')) {
            const modal = document.getElementById("inactive-employee-form");
            const overlay = document.querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none";
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedInactiveEmployees = inactiveEmployeeList;
                showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, 1);
            }
        }
        
        if (event.target.closest('.newlyhiredlist')) {
            const modal = document.getElementById("newlyhired-employee-form");
            const overlay = document.querySelector('.modal-overlay');
            if (modal && overlay) {
                modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none";
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
                currentlyDisplayedNewHireEmployees = newHireEmployeeList;
                showNewHireForm(currentlyDisplayedNewHireEmployees, 1);
            }
        }

        // Handle clicks on any "Export CSV" button
        if (event.target.closest('.export-csv-btn')) {
            const btn = event.target.closest('.export-csv-btn');
            const modalType = btn.dataset.modalType;

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
                    const modal = btn.closest('#project-employee-modal');
                    const title = modal.querySelector('h2').textContent.replace(/\s-\s/g, '_').replace(/\s/g, ''); 
                    exportToCSV(currentlyDisplayedProjectGroupEmployees, `Project_${title}_Employees`);
                    break;
            }
        }
    });

    // Live search handler
    document.addEventListener('input', (event) => {
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
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            // Update Dashboard Cards
            document.getElementById("activelist").textContent = data.ACTIVE ?? 'N/A';
            document.getElementById("attritionlist").textContent = data.INACTIVE_CURRENT_YEAR ?? 'N/A';
            document.getElementById("newlyhiredlist").textContent = data.NEWHIRES_CURRENT_YEAR ?? 'N/A';
            
            // Populate Global Lists
            activeEmployeeList = data.ACTIVE_EMPLOYEES || [];
            inactiveEmployeeList = data.INACTIVE_EMPLOYEES || [];
            newHireEmployeeList = data.NEWHIRE_EMPLOYEES || [];
            if(typeof fullProjectSummaryList !== 'undefined') fullProjectSummaryList = data.PROJECT_EMPLOYEE_SUMMARY || [];
        })
        .catch(error => console.error("Error in fetchData:", error));
}

// --- PREMIUM MODAL RENDERERS ---
function showActiveEmployeeForm(employees, page) {
    const container = document.getElementById("active-employee-form");
    if (!container) return;
    renderPremiumModal(container, employees, page, "Active Employees", "groups", "text-blue-600", "bg-blue-50", "active-search-input", "active");
}

function showInactiveEmployeeForm(employees, page) {
    const container = document.getElementById("inactive-employee-form");
    if (!container) return;
    renderPremiumModal(container, employees, page, "Resigned Employees", "person_remove", "text-rose-600", "bg-rose-50", "inactive-search-input", "inactive");
}

function showNewHireForm(employees, page) {
    const container = document.getElementById("newlyhired-employee-form");
    if (!container) return;
    renderPremiumModal(container, employees, page, "Newly Hired Employees", "person_add", "text-emerald-600", "bg-emerald-50", "newhire-search-input", "newhire");
}

function renderPremiumModal(container, employees, page, title, iconName, iconTextColor, iconBgColor, searchInputId, modalType) {
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-900 w-full max-w-[95%] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col pointer-events-auto transform transition-all max-h-[90vh]">
                
                <div class="modal-header px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-5">
                    <div class="modal-title-container flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl ${iconBgColor} dark:bg-slate-800 ${iconTextColor} dark:text-slate-300 flex items-center justify-center shadow-inner">
                                <span class="material-icons-sharp text-2xl">${iconName}</span>
                            </div>
                            <div>
                                <h2 class="modal-title text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">${title}</h2>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Roster Details</p>
                            </div>
                        </div>
                        <div class="modal-header-buttons flex items-center gap-3">
                            <button class="export-csv-btn flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-[11px] uppercase tracking-wider font-bold rounded-xl shadow-md transition-all active:scale-95" data-modal-type="${modalType}">
                                <span class="material-icons-sharp text-sm">download</span>
                                Export CSV
                            </button>
                            <button class="close-button w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors pointer-events-auto">
                                <span class="material-icons-sharp text-sm pointer-events-none">close</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-search-container relative group w-full sm:w-[400px]">
                        <span class="material-icons-sharp absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-blue-600 transition-colors pointer-events-none">search</span>
                        <input type="text" id="${searchInputId}" placeholder="Search by EDS, Name, or Supervisor..." class="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm dark:text-white transition-all placeholder:text-slate-400">
                    </div>
                </div>

                <div class="table-wrapper flex-1 overflow-auto p-0"></div>
                <div class="modal-footer px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end"></div>
            </div>
        `;
    }

    const tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.innerHTML = ''; 
        tableWrapper.appendChild(createTableWrapper(employees, page)); 
    }
    
    const footer = container.querySelector('.modal-footer');
    if (footer) {
        footer.innerHTML = ''; 
        const newFooterContent = createModalFooter(employees.length, page);
        if (newFooterContent) footer.appendChild(newFooterContent); 
    }
}

// --- PREMIUM TAILWIND HTML GENERATORS ---
function createTableWrapper(employees, page) {
    const wrapper = document.createElement("div");
    wrapper.className = "w-full";
    
    if (!employees || employees.length === 0) {
        wrapper.innerHTML = "<p class='p-10 text-center text-slate-400 dark:text-slate-500 font-bold italic tracking-wide'>No records found.</p>";
    } else {
        const table = document.createElement("table");
        table.className = "w-full min-w-max text-left border-collapse whitespace-nowrap";
        
        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr class="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700/50">
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">EDS</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Full Name</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Project</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Position</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Site</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Supervisor</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Status</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Hire Date</th>
                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">Resigned Date</th>
            </tr>
        `;
        
        const tbody = document.createElement("tbody");
        const paginatedItems = employees.slice((page - 1) * rowsPerPage, page * rowsPerPage);
        
        paginatedItems.forEach(emp => {
            const row = document.createElement('tr');
            row.className = "border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200";
            
            const tdClass = "px-6 py-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap";
            const statusClass = emp.STATUS === 'INACTIVE' 
                ? 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' 
                : 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';

            row.innerHTML = `
                <td class="${tdClass}">${emp.EDS||''}</td>
                <td class="${tdClass}">${emp.FULLNAME||''}</td>
                <td class="${tdClass}">${emp.PROJECT||''}</td>
                <td class="${tdClass}">${emp.POSITION||''}</td>
                <td class="${tdClass}">${emp.SITE||''}</td>
                <td class="${tdClass}">${emp.SUPERVISOR||''}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="${statusClass}">${emp.STATUS||''}</span></td>
                <td class="${tdClass}">${emp.HIREDDATE||''}</td>
                <td class="${tdClass}">${emp.RESIGNEDDATE||'-'}</td>
            `;
            tbody.appendChild(row);
        });
        
        table.append(thead, tbody);
        wrapper.appendChild(table);
    }
    return wrapper;
}

function createModalFooter(totalItems, page) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (totalPages > 1) {
        return buildPagination(totalPages, page);
    }
    return null;
}

function buildPagination(totalPages, currentPage) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-2 text-sm font-bold';
    
    let content = '';
    const siblingCount = 1;
    const totalSlots = 2 * siblingCount + 5;
    
    // Helper closure for Tailwind button HTML
    const getBtn = (p, text, active = false, disabled = false) => {
        let baseClass = "modal-page-btn px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 ";
        if (active) baseClass += "bg-blue-600 text-white shadow-md shadow-blue-500/30 pointer-events-none";
        else if (disabled) baseClass += "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50";
        else baseClass += "text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white";
        
        return `<button class="${baseClass}" data-page="${p}" ${disabled ? 'disabled' : ''}>${text}</button>`;
    };

    content += getBtn(currentPage - 1, '&laquo; Prev', false, currentPage === 1);

    if (totalPages <= totalSlots) {
        for (let i = 1; i <= totalPages; i++) {
            content += getBtn(i, i, i === currentPage);
        }
    } else {
        const showLeftEllipsis = currentPage > siblingCount + 2;
        const showRightEllipsis = currentPage < totalPages - (siblingCount + 1);

        content += getBtn(1, 1, 1 === currentPage);
        if (showLeftEllipsis) content += `<span class="px-2 text-slate-400 dark:text-slate-600 font-bold tracking-widest">...</span>`;
        
        let startPage, endPage;
        if (!showLeftEllipsis && showRightEllipsis) {
            startPage = 2; endPage = 2 * siblingCount + 3;
        } else if (showLeftEllipsis && !showRightEllipsis) {
            startPage = totalPages - (2 * siblingCount + 2); endPage = totalPages - 1;
        } else {
            startPage = currentPage - siblingCount; endPage = currentPage + siblingCount;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            content += getBtn(i, i, i === currentPage);
        }
        
        if (showRightEllipsis) content += `<span class="px-2 text-slate-400 dark:text-slate-600 font-bold tracking-widest">...</span>`;
        content += getBtn(totalPages, totalPages, totalPages === currentPage);
    }
    
    content += getBtn(currentPage + 1, 'Next &raquo;', false, currentPage === totalPages);
    
    wrapper.innerHTML = content;
    return wrapper;
}

function showNotification(message, isSuccess) {
    const popup = document.getElementById('success-popup');
    if (!popup) return;
    
    const messageSpan = popup.querySelector('.message');
    if(messageSpan) messageSpan.textContent = message;
    
    // Add Tailwind styles for Success vs Error
    if (isSuccess) {
        popup.className = "popup fixed bottom-8 right-8 bg-white dark:bg-slate-800 border-l-4 border-emerald-500 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-4 transform transition-all duration-300 translate-y-0";
        popup.innerHTML = `<div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0"><span class="material-icons-sharp text-emerald-600 dark:text-emerald-400 text-sm">check</span></div><span class="message text-sm font-bold text-slate-800 dark:text-white tracking-wide">${message}</span>`;
    } else {
        popup.className = "popup fixed bottom-8 right-8 bg-white dark:bg-slate-800 border-l-4 border-rose-500 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-4 transform transition-all duration-300 translate-y-0";
        popup.innerHTML = `<div class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center flex-shrink-0"><span class="material-icons-sharp text-rose-600 dark:text-rose-400 text-sm">error</span></div><span class="message text-sm font-bold text-slate-800 dark:text-white tracking-wide">${message}</span>`;
    }
    
    popup.classList.remove('hidden');
    setTimeout(() => { popup.classList.add('hidden'); }, 3000);
}

function exportToCSV(employeeData, baseFilename) {
    if (!employeeData || employeeData.length === 0) {
        showNotification("There is no data to export.", false);
        return;
    }

    const headers = ["EDS", "Full Name", "Project", "Position", "Site", "Supervisor", "Status", "Hire Date", "Resigned Date"];
    
    const escapeCSV = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvRows = [headers.join(',')];

    employeeData.forEach(emp => {
        const row = [
            escapeCSV(emp.EDS), escapeCSV(emp.FULLNAME), escapeCSV(emp.PROJECT),
            escapeCSV(emp.POSITION), escapeCSV(emp.SITE), escapeCSV(emp.SUPERVISOR),
            escapeCSV(emp.STATUS), escapeCSV(emp.HIREDDATE), escapeCSV(emp.RESIGNEDDATE)
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split('T')[0]; 
        link.setAttribute("href", url);
        link.setAttribute("download", `${baseFilename}_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}