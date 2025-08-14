// --- Add these with your other global state variables ---
let fullProjectSummaryList = []; // Holds the summary data with nested employee lists
let currentProjectGroupEmployees = []; // Holds the original employee list for the currently open modal
let currentlyDisplayedProjectGroupEmployees = []; // Holds the searched/filtered list for the modal

// This function will now handle fetching, rendering the table, and setting up the click listeners.
function initProjectSummaryView() {
    console.log("Attempting to initialize Project Summary view...");
    const tbody = document.querySelector('.employee-count table tbody');

    // Safety check: If the table doesn't exist yet, we can't proceed.
    if (!tbody) {
        console.error("Project summary table body not found! Aborting init.");
        return;
    }

    // 1. Fetch the data
    fetch("fetch_data.php")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Project summary data fetched successfully.");
            fullProjectSummaryList = data.PROJECT_EMPLOYEE_SUMMARY || [];
            
            // 2. Render the summary table
            tbody.innerHTML = ''; // Clear previous content

            fullProjectSummaryList.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = 'project-group-row';
                tr.dataset.index = index; 
                tr.innerHTML = `
                    <td>${item.PROJECT}</td>
                    <td><a href="#" class="view-employees-link">${item.EMPLOYEECOUNT}</a></td>
                    <td>${item.SITE}</td>
                `;
                tbody.appendChild(tr);
            });
            console.log("Table rendered with clickable links.");

            // 3. Add the click listener AFTER the content is on the page.
            // We check if a listener has already been added to prevent duplicates.
            if (!tbody.dataset.listenerAttached) {
                tbody.addEventListener('click', (event) => {
                    if (event.target.classList.contains('view-employees-link')) {
                        console.log("Clickable employee count link was clicked!");
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
                        } else {
                            console.log("No employees found for this group or data is missing.", selectedGroup);
                        }
                    }
                });
                tbody.dataset.listenerAttached = 'true'; // Mark that we've added the listener.
                console.log("Click listener attached to table body.");
            }
        })
        .catch(error => console.error("Error in fetchProjectEmployeeSummary:", error));
}

// NEW: Function to render the Project Employee modal
function showProjectEmployeeModal(employees, page, project, site) {
    const container = document.getElementById("project-employee-modal");
    if (!container) return;
    
    // --- First time render: build the entire static structure of the modal ---
    if (!container.querySelector('.modal-header')) {
        container.innerHTML = `
            <div class="modal-header">
                <div class="modal-title-container">
                    <h2 class="modal-title"></h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-search-container">
                    <input type="text" id="project-employee-search-input" placeholder="Search EDS,Name,or Sup">
                </div>
            </div>
            <div class="table-wrapper"></div>
            <div class="modal-footer"></div>
        `;
    }

    // --- Dynamic Updates (for every render: initial, search, or pagination) ---
    
    // 1. Always update the title
    const titleElement = container.querySelector('.modal-title');
    if (titleElement) {
        titleElement.textContent = `${project} - ${site}`;
    }

    // 2. Always replace the table content
    const tableWrapper = container.querySelector('.table-wrapper');
    if (tableWrapper) {
        // Your global createTableWrapper function returns a new div with the right class,
        // so we can just replace the old one's content entirely.
        const newTableContent = createTableWrapper(employees, page);
        tableWrapper.innerHTML = ''; // Clear the wrapper
        tableWrapper.appendChild(newTableContent); // Append the new content
    }
    
    // 3. Always replace the footer content
    const footer = container.querySelector('.modal-footer');
    if (footer) {
        const newFooterContent = createModalFooter(employees.length, page);
        footer.innerHTML = ''; // Clear the wrapper
        if (newFooterContent) {
            footer.appendChild(newFooterContent); // Append new content if it exists
        }
    }
}
