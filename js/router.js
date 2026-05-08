// Global references for elements
const loadingScreen = document.getElementById('loading-screen');
const mainContent = document.getElementById("main-content");

const rolePages = {
    'Manager': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_bfp.html",
        "bps_dashboard.html",
        "lhi_absenteeism.html",
        "project_efficiency.html",
        "team_member.html",
        "lhi_financial.html",
        "bps_financial.html",
        "lhi_bfp.html",
        "lhi_dashboard.html",
        "bu_bps.html",
        "bu_lhi.html",
        "quality_scores.html",
        "lhi_scorecard.html",
        "lhi_weekly_efficiency.html",
        "fedex_manifest_conso_data.html",
        "lhi_inventory.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html",
        "web_training.php"
        

    ],
    'Admin': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_bfp.html",
        "bps_dashboard.html",
        "lhi_absenteeism.html",
        "project_efficiency.html",
        "team_member.html",
        "quality_scores.html",
        "lhi_scorecard.html",
        "lhi_weekly_efficiency.html",
        "fedex_manifest_conso_data.html",
        "lhi_inventory.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html"

    ],
    'User': [
        "active_attrition.html",
        "team_member.html"

    ],

    'hr_staff': [
        "active_attrition.html",
        "team_member.html",
        "hr_dashboard.php"

    ],

    'hr_manager': [
        "active_attrition.html",
        "team_member.html",
        "hr_dashboard.php"

    ],

    'lhi_admin': [
        "active_attrition.html",
        "team_member.html",
        "lhi_absenteeism.html",
        "lhi_scorecard.html",
        "lhi_dashboard.html",
        "lhi_weekly_efficiency.html",
        "lhi_bfp.html",
        "lhi_inventory.html"
    ],
    'lhi_manager': [
        "active_attrition.html",
        "team_member.html",
        "lhi_absenteeism.html",
        "lhi_scorecard.html",
        "lhi_dashboard.html",
        "lhi_weekly_efficiency.html",
        "lhi_bfp.html",
        "lhi_financial.html",
        "bu_lhi.html",
        "lhi_inventory.html"
    ], 
    'lhi_user': [
        "active_attrition.html",
        "team_member.html",
        "lhi_absenteeism.html",
        "lhi_scorecard.html",
        "lhi_dashboard.html",
        "lhi_weekly_efficiency.html",
        "lhi_inventory.html"
        
    ],
    'bps_admin': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_bfp.html",
        "bps_dashboard.html",
        "project_efficiency.html",
        "team_member.html",
        "quality_scores.html",
        "fedex_manifest_conso_data.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html"

    ],
    'bps_manager': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_bfp.html",
        "bps_dashboard.html",
        "project_efficiency.html",
        "team_member.html",
        "bps_financial.html",
        "bu_bps.html",
        "quality_scores.html",
        "fedex_manifest_conso_data.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html"

    ],
    'bps_user': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_dashboard.html",
        "project_efficiency.html",
        "team_member.html",
        "quality_scores.html",
        "fedex_manifest_conso_data.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html"
    ],

    'bps_quality_user': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_dashboard.html",
        "project_efficiency.html",
        "team_member.html",
        "quality_scores.html",
        "fedex_manifest_conso_data.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html",
        "web_training.php"
    ],

    'interviewer': [
        "interview_dashboard.php",
    ],

    
    'super_user': [
        "active_attrition.html",
        "bps_absenteeism.html",
        "bps_attendance_db.html",
        "bps_bfp.html",
        "bps_dashboard.html",
        "lhi_absenteeism.html",
        "project_efficiency.html",
        "team_member.html",
        "lhi_financial.html",
        "bps_financial.html",
        "lhi_bfp.html",
        "lhi_dashboard.html",
        "bu_bps.html",
        "bu_lhi.html",
        "quality_scores.html",
        "lhi_scorecard.html",
        "lhi_weekly_efficiency.html",
        "fedex_manifest_conso_data.html",
        "lhi_inventory.html",
        "daily_attendance_status.html",
        "bps_overall_dashboard.php",
        "fedex_aus_hourly_count.html",
        "web_training.php",
        "database_update.php",
        "financial_dashboard.html",
        "hr_dashboard.php"
    ]   

};

function loadPage(pageName) {
    const mainContent = document.getElementById('main-content');

    // Allow all pages if Super User
    if (USER_ROLE === 'Super User') {
        // Allow loading of any existing page under views
        fetch(`views/${pageName}`)
            .then(res => {
                if (!res.ok) throw new Error("Page not found");
                return res.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
            }).catch(() => {
                mainContent.innerHTML = '<h2>Page not found</h2>';
            });
        return;
    }

    // Check access for other roles
    const allowedPages = USER_ROLE === 'Super User' ? null : rolePages[USER_ROLE] || [];
    if (allowedPages.includes(pageName)) {
        fetch(`views/${pageName}`)
            .then(res => res.text())
            .then(html => {
                mainContent.innerHTML = html;
            }).catch(() => {
                mainContent.innerHTML = '<h2>Page not found</h2>';
            });
    } else {
        mainContent.innerHTML = '<h2>Access Denied</h2>';
    }
}

function updateMenuVisibility() {
    const links = document.querySelectorAll('.nav-link');
    const allowedPages = USER_ROLE === 'Super User' ? null : rolePages[USER_ROLE] || [];

    links.forEach(link => {
        const page = link.getAttribute('data-page');
        if (USER_ROLE === 'Super User' || (allowedPages && allowedPages.includes(page))) {
            link.style.display = 'block';
        } else {
            link.style.display = 'none';
        }
    });
}



// Global chart instances for ApexCharts updates
let chart1Instance, chart2Instance, chart3Instance, chart4Instance;

document.addEventListener("DOMContentLoaded", () => {
    
    if (loadingScreen) {
        loadingScreen.style.opacity = '1';
        loadingScreen.style.display = 'flex';

        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                initializeRouter();
                updateMenuVisibility(); 
            }, 500);
        }, 2000);
    } else {
        initializeRouter();
        updateMenuVisibility(); 
    }
});

document.addEventListener("click", (event) => {
        
    // --- Logic for opening modals from the dashboard cards ---
    if (event.target.closest('.activelist')) {
        const modal = document.getElementById("active-employee-form");
        const overlay = document.querySelector('.modal-overlay');
        if (modal && overlay) {
            modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none";
            modal.classList.remove("hidden");
            overlay.classList.remove("hidden");
            currentlyDisplayedActiveEmployees = activeEmployeeList;
            if (typeof showActiveEmployeeForm === 'function') showActiveEmployeeForm(currentlyDisplayedActiveEmployees, 1);
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
            if (typeof showInactiveEmployeeForm === 'function') showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, 1);
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
            if (typeof showNewHireForm === 'function') showNewHireForm(currentlyDisplayedNewHireEmployees, 1);
        }
    }
    // --- Logic for closing ANY modal ---
    if (event.target.classList.contains('close-button') || event.target.classList.contains('modal-overlay')) {
        document.querySelectorAll('#project-employee-modal, #active-employee-form, #inactive-employee-form, #newlyhired-employee-form').forEach(m => m.classList.add("hidden"));
        document.querySelector('.modal-overlay')?.classList.add("hidden");
    }
    
    // --- Logic for paginating ANY modal ---
    if (event.target.matches('.modal-page-btn') && !event.target.disabled) {
        const newPage = parseInt(event.target.dataset.page, 10);
        if (isNaN(newPage)) return;

        if (event.target.closest('#project-employee-modal')) {
            const modal = event.target.closest('#project-employee-modal');
            const title = modal.querySelector('h2').textContent;
            const [project, site] = title.split(' - ');
            showProjectEmployeeModal(currentlyDisplayedProjectGroupEmployees, newPage, project, site);
        } else if (event.target.closest('#active-employee-form')) {
            showActiveEmployeeForm(currentlyDisplayedActiveEmployees, newPage);
        } else if (event.target.closest('#inactive-employee-form')) {
            showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, newPage);
        } else if (event.target.closest('#newlyhired-employee-form')) {
            showNewHireForm(currentlyDisplayedNewHireEmployees, newPage);
        }
    }
});

// --- Main Live Search Handler for Modals ---
document.addEventListener('input', (event) => {

    // Search for Project Group Employees modal
    if (event.target.id === 'project-employee-search-input') {
        const searchTerm = event.target.value.toLowerCase();
        const modal = event.target.closest('#project-employee-modal');
        const title = modal.querySelector('h2').textContent;
        const [project, site] = title.split(' - ');
        currentlyDisplayedProjectGroupEmployees = currentProjectGroupEmployees.filter(emp => {
            return (emp.EDS || '').toString().toLowerCase().includes(searchTerm) ||
                   (emp.FULLNAME || '').toLowerCase().includes(searchTerm) ||
                   (emp.SUPERVISOR || '').toLowerCase().includes(searchTerm);
        });
        showProjectEmployeeModal(currentlyDisplayedProjectGroupEmployees, 1, project, site);
    }

    if (event.target.closest('.export-csv-btn')) {
        const btn = event.target.closest('.export-csv-btn');
        const modalType = btn.dataset.modalType;
    
        if (typeof exportToCSV === 'function') {
            if (modalType === 'project') {
                const modal = btn.closest('#project-employee-modal');
                let title = modal.querySelector('h2').textContent;
                
                // Clean up the title so it makes a nice filename (e.g., FEDEX_-_CLARK)
                title = title.replace(/\s+/g, '_'); 
    
                // Pass the FULL array to your fetch_data export function
                exportToCSV(currentlyDisplayedProjectGroupEmployees, `Project_Roster_${title}`);
            }
            else if (modalType === 'active') {
                exportToCSV(currentlyDisplayedActiveEmployees, 'Active_Employees');
            }
            else if (modalType === 'inactive') {
                exportToCSV(currentlyDisplayedInactiveEmployees, 'Resigned_Employees');
            }
            else if (modalType === 'newhire') {
                exportToCSV(currentlyDisplayedNewHireEmployees, 'New_Hires');
            }
        }
    }

    // Search for Active Employees modal
    if (event.target.id === 'active-search-input') {
        const searchTerm = event.target.value.toLowerCase();
        currentlyDisplayedActiveEmployees = activeEmployeeList.filter(emp => {
            return (emp.EDS || '').toString().toLowerCase().includes(searchTerm) ||
                   (emp.FULLNAME || '').toLowerCase().includes(searchTerm) ||
                   (emp.SUPERVISOR || '').toLowerCase().includes(searchTerm);
        });
        showActiveEmployeeForm(currentlyDisplayedActiveEmployees, 1);
    }
    
    // Search for Inactive Employees modal
    if (event.target.id === 'inactive-search-input') {
        const searchTerm = event.target.value.toLowerCase();
        currentlyDisplayedInactiveEmployees = inactiveEmployeeList.filter(emp => {
            return (emp.EDS || '').toString().toLowerCase().includes(searchTerm) ||
                   (emp.FULLNAME || '').toLowerCase().includes(searchTerm);
        });
        showInactiveEmployeeForm(currentlyDisplayedInactiveEmployees, 1);
    }

    // Search for Newly Hired Employees modal
    if (event.target.id === 'newhire-search-input') {
        const searchTerm = event.target.value.toLowerCase();
        currentlyDisplayedNewHireEmployees = newHireEmployeeList.filter(emp => {
            return (emp.EDS || '').toString().toLowerCase().includes(searchTerm) ||
                   (emp.FULLNAME || '').toLowerCase().includes(searchTerm);
        });
        showNewHireForm(currentlyDisplayedNewHireEmployees, 1);
    }
});    

function initializeRouter() {
    const links = document.querySelectorAll(".sidebar a");
    const logoutLink = document.getElementById("logout-link");

    if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Are you sure you want to log out?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, logout',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "logout.php";
                }
            });
        });
    }


    // Load default view after initial loading screen
    loadView("active_attrition");

    links.forEach(link => {
        link.addEventListener("click", e => {
            // PRIORITIZE data-view attribute, fallback to h3 text only if missing
            const dataView = link.getAttribute('data-view');
            const titleText = link.querySelector("h3") ? link.querySelector("h3").textContent : link.textContent;
            
            const target = link.getAttribute('target');
    
            // Special handling for external links
            if (link.dataset.external === "true" || target === '_blank') {
                return; 
            }
    
            e.preventDefault();
    
            // Handle Logout
            if (titleText.trim().toLowerCase() === "log out") {
                window.location.href = "logout.php";
                return;
            }
    
            links.forEach(l => l.classList.remove("Active"));
            link.classList.add("Active");
    
            // Use the data-view attribute directly for the filename
            const viewKey = dataView || titleText.trim().toLowerCase().replace(/ & | /g, "_");
            
            loadView(viewKey);
            history.pushState(null, "", `#${viewKey}`);
        });
    });
}

function initializeDatePicker() {
    const dateRangeElement = document.getElementById("dateRange");
    if (dateRangeElement) {
        flatpickr("#dateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, '0') + "-01", new Date()], // Default to current month
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) {
                    const startDate = selectedDates[0].toISOString().split('T')[0]; // Format as YYYY-MM-DD
                    const endDate = selectedDates[1].toISOString().split('T')[0];
                    
                    // Fetch new data and update chart
                    fetchChartData(startDate, endDate);
                }
            }
        });
    }
}

async function fetchChartData(startDate, endDate) {
    try {
        const response = await fetch(`fetch_data.php?action=chart_data&start_date=${startDate}&end_date=${endDate}`);
        const result = await response.json();
        
        if (result.success && chart1Instance) {
            // Update chart with new data
            chart1Instance.updateOptions({
                series: result.data.series,
                xaxis: {
                    categories: result.data.categories
                }
            });
        } else {
            console.error('Failed to fetch chart data:', result.error);
        }
    } catch (error) {
        console.error('Error fetching chart data:', error);
    }
}

function loadView(viewName) {
    if (viewName === 'log_out') {
        return;
    }

    if (!mainContent) {
        console.error("Main content container (#main-content) not found! Cannot load view.");
        return;
    }

    const pageFile = viewName.includes(".") ? viewName : `${viewName}.html`;

    // Enforce access control based on USER_ROLE and allowed pages
    if (USER_ROLE !== 'Super User') {
        const allowedPages = rolePages[USER_ROLE] || [];
        if (!allowedPages.includes(pageFile)) {
            mainContent.innerHTML = '<h2>Access Denied</h2>';
            return;
        }
    }

    let showLoadingScreen = false; 
    let loadingPromise = Promise.resolve(); 

    fetch(`views/${pageFile}`)
        .then(res => {
            if (!res.ok) {
                throw new Error("View not found");
            }
            return res.text();
        })
        .then(html => {
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const iframe = tempDiv.querySelector('iframe');

            if (iframe && loadingScreen) {
                showLoadingScreen = true; 
                loadingScreen.style.opacity = '1'; // Make loading screen visible
                loadingScreen.style.display = 'flex';

                loadingPromise = new Promise(resolve => {
                    
                    const iframeLoadTimeout = setTimeout(() => {
                        resolve();
                    }, 5000);  

                    iframe.onload = () => {
                        clearTimeout(iframeLoadTimeout);
                        resolve();
                    };
                    iframe.onerror = () => {
                        clearTimeout(iframeLoadTimeout);
                        resolve();
                    };
                });
            }

            // Insert the new HTML into the main content area
            mainContent.innerHTML = html;

            
            return loadingPromise.then(() => {
                if (showLoadingScreen && loadingScreen) {
                    const viewLoadStartTime = Date.now();
                    const minLoadDisplayTime = 2000; 

                    const timeElapsed = Date.now() - viewLoadStartTime;
                    const remainingTime = Math.max(0, minLoadDisplayTime - timeElapsed);

                    return new Promise(resolve => {
                        setTimeout(() => {
                            loadingScreen.style.opacity = '0';
                            setTimeout(() => {
                                loadingScreen.style.display = 'none';
                                resolve();
                            }, 500); 
                        }, remainingTime); 
                    });
                } else {
                    
                    return Promise.resolve();
                }
            });
        })
        .catch(err => {
            // Display error message if view loading fails
            mainContent.innerHTML = `<h2>Error loading view</h2><p>${err.message}</p>`;
            // Ensure loading screen is hidden even if there's an error
            if (showLoadingScreen && loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
            }
        })
        .finally(() => {

            initializeViewScripts(viewName);
        });


}


function initializeViewScripts(viewName) {
    if (viewName === 'bps_dashboard') {
        initBpsDashboardCharts();
    } else if (viewName === "active_attrition") {
        initActiveAttritionView();
    } else if (viewName === "team_member") {
        initTeamMemberView();
    } else if (viewName === "financial_dashboard") {
        if (typeof initFinancialDashboard === 'function') initFinancialDashboard();
    }
    
    setTimeout(() => {
        initializeDatePicker();
    }, 100);
}

function initActiveAttritionView() {
    const applyBtn = document.getElementById("apply-btn");
    const startInput = document.getElementById("start-date");
    const endInput = document.getElementById("end-date");
    const entitySelect = document.getElementById("entity-select");

    // 1. Fetch Top Insight Cards Data
    if (typeof fetchData === 'function') {
        fetchData(null, null, "ALL");
    }
    
    // 2. Fetch Recent Updates Table Data
    if (typeof fetchEmployeeUpdate === 'function') {
        fetchEmployeeUpdate("ALL");
    }

    // 3. Initialize Search for Recent Updates
    if (typeof initEmployeeUpdateSearch === 'function') {
        initEmployeeUpdateSearch();
    }

    // 4. Fetch Project Roster Data (Right Panel) - THIS WAS MISSING!
    if (typeof initProjectSummaryView === 'function') {
        initProjectSummaryView();
    }

    // Filter Apply Button Logic
    if (applyBtn && startInput && endInput && entitySelect) {
        applyBtn.addEventListener("click", () => {
            const startDate = startInput.value;
            const endDate = endInput.value;
            const entity = entitySelect.value;

            if (startDate && endDate) {
                if (typeof fetchData === 'function') fetchData(startDate, endDate, entity);
                if (typeof fetchEmployeeUpdate === 'function') fetchEmployeeUpdate(entity, startDate, endDate);
                if (typeof showNotification === 'function') showNotification("Data loaded successfully!", true);
            } else {
                if (typeof showNotification === 'function') showNotification("Please select dates!", false);
            }
        });

        if (typeof validateDates === 'function') {
            startInput.addEventListener("input", validateDates);
            endInput.addEventListener("input", validateDates);
            validateDates();
        }
    }
}
function initTeamMemberView() {
    console.log("Initializing team member view...");
    
    const select = document.getElementById("teamSelect");
    const tbody = document.querySelector("#team-table tbody");
    
    if (!select || !tbody) {
        console.error("Team member elements not found");
        return;
    }

    createCSVExportButton();
    select.innerHTML = '';

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select Supervisor --";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    fetch("fetch_data.php?action=list_names")
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Expected array but got: " + typeof data);
            data.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Error loading team names:", error);
            const errorOption = document.createElement("option");
            errorOption.value = "";
            errorOption.textContent = "Error loading supervisors";
            errorOption.disabled = true;
            select.appendChild(errorOption);
        });

    // UPDATED: Using async/await for more reliable loading state management
    select.addEventListener("change", async function () {
        const selectedName = select.value;
        tbody.innerHTML = ""; // Clear previous content
        updateCSVButton(selectedName);
        
        if (!selectedName) return;

        // Show loading row
        const loadingRow = document.createElement("tr");
        const loadingCell = document.createElement("td");
        loadingCell.colSpan = 8;
        loadingCell.textContent = "Loading...";
        loadingCell.style.textAlign = "center";
        loadingRow.appendChild(loadingCell);
        tbody.appendChild(loadingRow);

        try {
            const response = await fetch(`fetch_data.php?action=filter&name=${encodeURIComponent(selectedName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            tbody.innerHTML = ""; // Clear loading row

            if (!Array.isArray(data)) {
                throw new Error("Expected array but got: " + typeof data);
            }

            if (data.length === 0) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 8;
                td.textContent = "No team members found for the selected supervisor.";
                td.style.textAlign = "center";
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }

            data.forEach(row => {
                const tr = document.createElement("tr");
                const cellValues = [
                    row.EDS || '', row.FULLNAME || '', row.PROJECT || '',
                    row.POSITION || '', row.SITE || '', row.SUPERVISOR || '',
                    row.emp_status || '', row.DATEHIRED || ''
                ];
                cellValues.forEach(cellValue => {
                    const td = document.createElement("td");
                    td.textContent = cellValue;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error("Error fetching employee data:", error);
            tbody.innerHTML = ""; // Ensure loading row is cleared on error
            const errorRow = document.createElement("tr");
            const errorCell = document.createElement("td");
            errorCell.colSpan = 8;
            errorCell.textContent = "Error loading data. Please try again.";
            errorCell.style.textAlign = "center";
            errorCell.style.color = "red";
            errorRow.appendChild(errorCell);
            tbody.appendChild(errorRow);
        }
    });
    
    // Create CSV export button
    function createCSVExportButton() {
    
    if (document.getElementById('csvExportBtn')) {
        return;
    }
    
    // Find the table or create container
    const table = document.getElementById('team-table');
    if (!table) return;
    
    // Create enhanced button container with better styling
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'export-button-container mb-4';
    buttonContainer.innerHTML = `
        <div class="d-flex justify-content-end align-items-center gap-3">
            <div class="export-info d-none" id="exportInfo">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    Ready to export data
                </small>
            </div>
            <button type="button" id="csvExportBtn" class="btn-export-csv" disabled>
                <div class="btn-content">
                    <div class="btn-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <div class="btn-text">
                        <span class="btn-main-text">Export CSV</span>
                        <span class="btn-sub-text">Download team data</span>
                    </div>
                </div>
                <div class="btn-loading d-none">
                    
                </div>
            </button>
        </div>
    `;
    
    // Add enhanced CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .export-button-container {
            padding: 1.5rem 2rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .btn-export-csv {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            border-radius: 12px;
            padding: 0;
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            min-width: 200px;
        }
        
        .btn-export-csv:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .btn-export-csv:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .btn-export-csv:disabled {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            box-shadow: none;
            cursor: not-allowed;
            opacity: 0.7;
        }
        
        .btn-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1.5rem;
        }
        
        .btn-icon {
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        .btn-export-csv:hover:not(:disabled) .btn-icon {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .btn-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1.2;
        }
        
        .btn-main-text {
            font-size: 0.95rem;
            font-weight: 600;
        }
        
        .btn-sub-text {
            font-size: 0.75rem;
            opacity: 0.9;
            font-weight: 400;
        }
        
        .btn-loading {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            //padding: 0.875rem 1.5rem;
            font-size: 0.875rem;
        }
        
        .export-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 8px;
            color: #059669;
            font-size: 0.875rem;
        }
        
        .export-info i {
            font-size: 0.75rem;
        }
        
        /* Pulse animation for active state */
        .btn-export-csv:not(:disabled) .btn-icon {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .export-button-container {
                padding: 1rem;
            }
            
            .btn-export-csv {
                min-width: 160px;
            }
            
            .btn-content {
                padding: 0.75rem 1.25rem;
                gap: 0.5rem;
            }
            
            .btn-main-text {
                font-size: 0.875rem;
            }
            
            .btn-sub-text {
                font-size: 0.7rem;
            }
        }
    `;
    
   
    document.head.appendChild(style);
    
    
    table.parentNode.insertBefore(buttonContainer, table);
    
    
    const csvBtn = document.getElementById('csvExportBtn');
    csvBtn.addEventListener('click', async () => {
        const btnContent = csvBtn.querySelector('.btn-content');
        const btnLoading = csvBtn.querySelector('.btn-loading');
        
        
        btnContent.classList.add('d-none');
        btnLoading.classList.remove('d-none');
        csvBtn.disabled = true;
        
        try {
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            
            exportToCSV();
            
            
            showExportSuccess();
            
        } catch (error) {
            console.error('Export failed:', error);
            showExportError();
        } finally {
            // Reset button state
            setTimeout(() => {
                btnContent.classList.remove('d-none');
                btnLoading.classList.add('d-none');
                csvBtn.disabled = false;
            }, 1000);
        }
    });
}


function updateCSVButton(selectedName) {
    const csvBtn = document.getElementById('csvExportBtn');
    const exportInfo = document.getElementById('exportInfo');
    
    if (!csvBtn) return;
    
    if (selectedName) {
        csvBtn.disabled = false;
        
        // Update button text
        const mainText = csvBtn.querySelector('.btn-main-text');
        const subText = csvBtn.querySelector('.btn-sub-text');
        
        if (mainText) mainText.textContent = `Export CSV`;
        if (subText) subText.textContent = `${selectedName}'s team data`;
        
        // Show export info
        if (exportInfo) {
            exportInfo.classList.remove('d-none');
            exportInfo.innerHTML = `
                <i class="fas fa-check-circle"></i>
                Ready to export data for <strong>${selectedName}</strong>
            `;
        }
        
        // Add success pulse animation
        csvBtn.style.animation = 'pulse-green 1s ease-in-out';
        setTimeout(() => {
            csvBtn.style.animation = '';
        }, 1000);
        
    } else {
        csvBtn.disabled = true;
        
        // Reset button text
        const mainText = csvBtn.querySelector('.btn-main-text');
        const subText = csvBtn.querySelector('.btn-sub-text');
        
        if (mainText) mainText.textContent = 'Export CSV';
        if (subText) subText.textContent = 'Select supervisor first';
        
        // Hide export info
        if (exportInfo) {
            exportInfo.classList.add('d-none');
        }
    }
}

// Show export success feedback
function showExportSuccess() {
    const exportInfo = document.getElementById('exportInfo');
    if (exportInfo) {
        exportInfo.innerHTML = `
            <i class="fas fa-check-circle text-success"></i>
            <span class="text-success">Export completed successfully!</span>
        `;
        exportInfo.style.background = 'rgba(16, 185, 129, 0.1)';
        exportInfo.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        
        // Reset after 3 seconds
        setTimeout(() => {
            const selectedName = document.getElementById("teamSelect").value;
            if (selectedName) {
                exportInfo.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    Ready to export data for <strong>${selectedName}</strong>
                `;
                exportInfo.style.background = 'rgba(16, 185, 129, 0.1)';
                exportInfo.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            }
        }, 3000);
    }
}

// Show export error feedback
function showExportError() {
    const exportInfo = document.getElementById('exportInfo');
    if (exportInfo) {
        exportInfo.innerHTML = `
            <i class="fas fa-exclamation-triangle text-danger"></i>
            <span class="text-danger">Export failed. Please try again.</span>
        `;
        exportInfo.style.background = 'rgba(239, 68, 68, 0.1)';
        exportInfo.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        
        // Reset after 3 seconds
        setTimeout(() => {
            const selectedName = document.getElementById("teamSelect").value;
            if (selectedName) {
                exportInfo.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    Ready to export data for <strong>${selectedName}</strong>
                `;
                exportInfo.style.background = 'rgba(16, 185, 129, 0.1)';
                exportInfo.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            }
        }, 3000);
    }
}


function exportToCSV() {
    const selectedName = document.getElementById("teamSelect").value;
    if (!selectedName) return;
    
    const table = document.getElementById('team-table');
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    // Add headers
    const headers = table.querySelectorAll('thead th');
    if (headers.length > 0) {
        const headerRow = [];
        headers.forEach(header => {
            let text = header.textContent.trim().replace(/"/g, '""');
            headerRow.push('"' + text + '"');
        });
        csv.push(headerRow.join(','));
    }
    
    // Add data rows (only tbody rows)
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length > 0) {
            const rowData = [];
            cols.forEach(col => {
                let text = col.textContent.trim().replace(/"/g, '""');
                rowData.push('"' + text + '"');
            });
            csv.push(rowData.join(','));
        }
    });
    
    // Create and download CSV file
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `team_members_${selectedName}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
    console.log("Team member view initialization complete");
}

// Make sure to call this function when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initTeamMemberView();
});


// Popstate listener for browser back/forward buttons
window.addEventListener("popstate", () => {
    const hash = location.hash.slice(1);
    if (hash) {
        loadView(hash);
    } else {
        loadView("active_attrition"); // default
    }
});

