// --- Global Variables (Using var to prevent SPA redeclaration errors) ---
var employeeUpdateList = [];
var displayedEmployeeUpdateList = [];
var currentEntityFilter = 'ALL';
var currentStartDateFilter = null;
var currentEndDateFilter = null;
var limit = 20; // How many employees to show per page.

function initEmployeeUpdateSearch() {
  const searchInput = document.getElementById('employee-update-search');
  if (searchInput) {
      searchInput.addEventListener('input', (event) => {
          const searchTerm = event.target.value.toLowerCase();
          
          // Filter the original master list
          displayedEmployeeUpdateList = employeeUpdateList.filter(employee => {
              const eds = (employee.EDS || '').toString().toLowerCase();
              const fullname = (employee.FULLNAME || '').toLowerCase();
              const supervisor = (employee.SUPERVISOR || '').toLowerCase();
              
              return eds.includes(searchTerm) || 
                     fullname.includes(searchTerm) || 
                     supervisor.includes(searchTerm);
          });
          
          // Re-render the table with the filtered data, starting from page 1
          renderEmployeeUpdatesPage(1);
      });
  }
}

/**
 * Fetches data from the server. Called on page load or when filters change.
 */
function fetchEmployeeUpdate(entity = 'ALL', startDate = null, endDate = null) {
    currentEntityFilter = entity;
    currentStartDateFilter = startDate;
    currentEndDateFilter = endDate;

    const params = new URLSearchParams();
    params.append('entity', entity);

    if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
    }

    fetch(`fetch_data.php?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            employeeUpdateList = data.LATEST_EMPLOYEES || [];
            displayedEmployeeUpdateList = employeeUpdateList;
            
            // Render the first page of this stored data.
            renderEmployeeUpdatesPage(1);
        })
        .catch(error => console.error("Error fetching employee updates:", error));
}

/**
 * Renders a specific page of the employee table from the stored data.
 */
function renderEmployeeUpdatesPage(page) {
    const tbody = document.querySelector('#employee-updates-table tbody');
    if (!tbody) return;

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = displayedEmployeeUpdateList.slice(start, end);

    tbody.innerHTML = ''; // Clear old rows

    if (paginatedData.length > 0) {
        paginatedData.forEach(employee => {
            const tr = document.createElement('tr');
            
            // Explicitly set row hover and border styles here
            tr.className = "border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200";
            
            // Standardize text color and padding for all cells
            const tdClass = "px-5 py-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap";

            // Premium Tailwind Status Badges
            const statusClass = employee.STATUS === 'INACTIVE' 
                ? 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' 
                : 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';

            tr.innerHTML = `
                <td class="${tdClass}">${employee.EDS}</td>
                <td class="${tdClass}">${employee.FULLNAME}</td>
                <td class="${tdClass}">${employee.PROJECT}</td>
                <td class="${tdClass}">${employee.POSITION}</td>
                <td class="${tdClass}">${employee.SITE}</td>
                <td class="${tdClass}">${employee.SUPERVISOR}</td>
                <td class="px-5 py-4 whitespace-nowrap"><span class="${statusClass}">${employee.STATUS}</span></td>
                <td class="${tdClass}">${employee.HIREDDATE}</td>
                <td class="${tdClass}">${employee.RESIGNEDDATE ?? '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        // Styled empty state
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-slate-400 dark:text-slate-500 font-bold italic tracking-wide">No records found matching your criteria.</td></tr>`;
    }

    // Render pagination controls
    renderPaginationControls(page, Math.ceil(displayedEmployeeUpdateList.length / limit));
}

/**
 * Renders the pagination buttons.
 */
function renderPaginationControls(currentPage, totalPages) {
    const paginationContainer = document.querySelector('.recent-updates #pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    // Helper function to create a beautifully styled button
    const createAndAppendButton = (page, text, isDisabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        
        // Base Tailwind classes
        btn.className = 'px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 ';
        
        if (isActive) {
            btn.className += 'bg-blue-600 text-white shadow-md shadow-blue-500/30';
        } else if (isDisabled) {
            btn.className += 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50';
        } else {
            btn.className += 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';
        }

        if (isDisabled) btn.disabled = true;
        
        btn.addEventListener('click', () => renderEmployeeUpdatesPage(page));
        paginationContainer.appendChild(btn);
    };

    createAndAppendButton(currentPage - 1, '« Prev', currentPage === 1);

    const siblingCount = 1;
    const totalSlots = 7;

    if (totalPages <= totalSlots) {
        for (let i = 1; i <= totalPages; i++) {
            createAndAppendButton(i, i, false, i === currentPage);
        }
    } else {
        const showLeftEllipsis = currentPage > siblingCount + 2;
        const showRightEllipsis = currentPage < totalPages - (siblingCount + 1);

        createAndAppendButton(1, 1, false, 1 === currentPage);

        if (showLeftEllipsis) {
            const span = document.createElement('span');
            span.className = 'px-2 text-slate-400 dark:text-slate-600 font-bold tracking-widest';
            span.textContent = '...';
            paginationContainer.appendChild(span);
        }
        
        let startPage, endPage;
        if (!showLeftEllipsis && showRightEllipsis) {
            startPage = 2;
            endPage = 4;
        } else if (showLeftEllipsis && !showRightEllipsis) {
            startPage = totalPages - 3;
            endPage = totalPages - 1;
        } else {
            startPage = currentPage - siblingCount;
            endPage = currentPage + siblingCount;
        }

        for (let i = startPage; i <= endPage; i++) {
            createAndAppendButton(i, i, false, i === currentPage);
        }
        
        if (showRightEllipsis) {
            const span = document.createElement('span');
            span.className = 'px-2 text-slate-400 dark:text-slate-600 font-bold tracking-widest';
            span.textContent = '...';
            paginationContainer.appendChild(span);
        }

        createAndAppendButton(totalPages, totalPages, false, totalPages === currentPage);
    }
    
    createAndAppendButton(currentPage + 1, 'Next »', currentPage === totalPages);
}