// --- Add these with your other global state variables ---
var fullProjectSummaryList = []; 
var currentProjectGroupEmployees = []; 
var currentlyDisplayedProjectGroupEmployees = [];

// Inject styles for the modal's externally generated table
if (!document.getElementById('modal-table-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-table-styles';
    style.innerHTML = `
        .styled-modal-table table { w-full text-left border-collapse whitespace-nowrap; width: 100%; text-align: left; border-collapse: collapse; }
        .styled-modal-table th { padding: 16px 24px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
        .styled-modal-table td { padding: 14px 24px; font-size: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #f8fafc; white-space: nowrap; }
        .dark-theme-variables .styled-modal-table th { background: rgba(30, 41, 59, 0.4); color: #94a3b8; border-bottom-color: rgba(30, 41, 59, 0.8); }
        .dark-theme-variables .styled-modal-table td { color: #cbd5e1; border-bottom-color: rgba(30, 41, 59, 0.5); }
        .styled-modal-table tr:hover td { background-color: #f8fafc; transition: background-color 0.2s; }
        .dark-theme-variables .styled-modal-table tr:hover td { background-color: rgba(30, 41, 59, 0.4); }
    `;
    document.head.appendChild(style);
}

function initProjectSummaryView() {
    console.log("Attempting to initialize Project Summary view...");
    const tbody = document.querySelector('.employee-count table tbody');

    if (!tbody) {
        console.error("Project summary table body not found! Aborting init.");
        return;
    }

    fetch("fetch_data.php")
        .then(response => {
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            console.log("Project summary data fetched successfully.");
            fullProjectSummaryList = data.PROJECT_EMPLOYEE_SUMMARY || [];
            
            tbody.innerHTML = ''; 

            fullProjectSummaryList.forEach((item, index) => {
                const tr = document.createElement('tr');
                // Added Tailwind hover effects and cursor pointer to the row
                tr.className = 'project-group-row group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50';
                tr.dataset.index = index; 
                
            tr.innerHTML = `
                <td class="py-4 px-3 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">${item.PROJECT}</td>
                <td class="py-4 px-3 text-center">
                    <a href="#" class="view-employees-link inline-flex items-center justify-center px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-500 dark:hover:text-white rounded-lg font-black transition-all text-[11px] min-w-[3rem] shadow-sm">
                        ${item.EMPLOYEECOUNT}
                    </a>
                </td>
                <td class="py-4 px-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">${item.SITE}</td>
            `;
                tbody.appendChild(tr);
            });

            if (!tbody.dataset.listenerAttached) {
                tbody.addEventListener('click', (event) => {
                    // FIX: Use closest() so clicking ANYWHERE on the row or button triggers the modal
                    const clickedElement = event.target.closest('.view-employees-link') || event.target.closest('.project-group-row');
                    
                    if (clickedElement) {
                        event.preventDefault(); 
                        
                        const row = clickedElement.closest('.project-group-row');
                        if (!row) return;

                        const index = parseInt(row.dataset.index, 10);
                        const selectedGroup = fullProjectSummaryList[index];

                        if (selectedGroup && selectedGroup.EMPLOYEES) {
                            currentProjectGroupEmployees = selectedGroup.EMPLOYEES;
                            currentlyDisplayedProjectGroupEmployees = currentProjectGroupEmployees;
                            
                            const modal = document.getElementById("project-employee-modal");
                            const overlay = document.querySelector('.modal-overlay');
                            
                            if (modal && overlay) {
                                // Add positioning classes to the modal container
                                modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none";
                                modal.classList.remove("hidden");
                                overlay.classList.remove("hidden");
                                showProjectEmployeeModal(currentlyDisplayedProjectGroupEmployees, 1, selectedGroup.PROJECT, selectedGroup.SITE);
                            }
                        }
                    }
                });
                tbody.dataset.listenerAttached = 'true'; 
            }
        })
        .catch(error => console.error("Error in fetchProjectEmployeeSummary:", error));
}

function showProjectEmployeeModal(employees, page, project, site) {
    const container = document.getElementById("project-employee-modal");
    if (!container) return;

    // 1. Store project/site safely in the DOM so they survive pagination
    if (project) container.dataset.currentProject = project;
    if (site) container.dataset.currentSite = site;

    const displayProject = project || container.dataset.currentProject || "";
    const displaySite = site || container.dataset.currentSite || "";
    
    // Inject the upgraded Tailwind Modal layout
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = `
            <div class="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col pointer-events-auto transform transition-all max-h-[90vh]">
                
                <div class="modal-header px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-5">
                    <div class="modal-title-container flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                                <span class="material-icons-sharp text-2xl">assignment_ind</span>
                            </div>
                            <div>
                                <h2 class="modal-title text-xl font-extrabold text-slate-800 dark:text-white tracking-tight"></h2>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Project Roster</p>
                            </div>
                        </div>
                        <div class="modal-header-buttons flex items-center gap-3">
                            <button class="export-csv-btn flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-[11px] uppercase tracking-wider font-bold rounded-xl shadow-md transition-all active:scale-95" data-modal-type="project">
                                <span class="material-icons-sharp text-sm">download</span>
                                Export
                            </button>
                            <button class="close-button w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors">
                                <span class="material-icons-sharp text-sm">close</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-search-container relative group w-full sm:w-[400px]">
                        <span class="material-icons-sharp absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-indigo-600 transition-colors pointer-events-none">search</span>
                        <input type="text" id="project-employee-search-input" placeholder="Search by EDS, Name, or Supervisor..." class="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm dark:text-white transition-all placeholder:text-slate-400">
                    </div>
                </div>

                <div class="table-wrapper flex-1 overflow-auto p-0 styled-modal-table"></div>
                
                <div class="modal-footer px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end"></div>
            </div>
        `;
    }

    const titleElement = container.querySelector('.modal-title');
    if (titleElement) {
        titleElement.textContent = `${displayProject} — ${displaySite}`;
    }
    
    const tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) {
        const newTableContent = createTableWrapper(employees, page);
        tableWrapper.innerHTML = ''; 
        
        // FIX: Safely check if createTableWrapper returned a string or a DOM Node
        if (typeof newTableContent === 'string') {
            tableWrapper.innerHTML = newTableContent;
        } else if (newTableContent instanceof Node) {
            tableWrapper.appendChild(newTableContent); 
        }
    }
    
    const footer = container.querySelector('.modal-footer');
    if (footer) {
        const newFooterContent = createModalFooter(employees.length, page);
        footer.innerHTML = ''; 
        
        if (typeof newFooterContent === 'string') {
            footer.innerHTML = newFooterContent;
        } else if (newFooterContent instanceof Node) {
            footer.appendChild(newFooterContent); 
        }
    }
}