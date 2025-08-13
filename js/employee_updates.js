// This variable will hold the full list of employees after one fetch.
let employeeUpdateList = [];
// NEW: This variable will hold the list that is currently being displayed (full or filtered).
let displayedEmployeeUpdateList = [];

// NEW: We'll store the current filter state globally so search and pagination can access it.
let currentEntityFilter = 'ALL';
let currentStartDateFilter = null;
let currentEndDateFilter = null;

const limit = 10; // How many employees to show per page.


// NEW: Add the live search event listener when the page loads.
// document.addEventListener('DOMContentLoaded', () => {
//   const searchInput = document.getElementById('employee-update-search');
//   if (searchInput) {
//       console.log("Search input found! Attaching listener.");
//       searchInput.addEventListener('input', (event) => {
//           const searchTerm = event.target.value.toLowerCase();

//           displayedEmployeeUpdateList = employeeUpdateList.filter(employee => {
//               const eds = (employee.EDS || '').toString().toLowerCase();
//               const fullname = (employee.FULLNAME || '').toLowerCase();
//               const supervisor = (employee.SUPERVISOR || '').toLowerCase();

//               return eds.includes(searchTerm) || 
//                      fullname.includes(searchTerm) || 
//                      supervisor.includes(searchTerm);
//           });

//           renderEmployeeUpdatesPage(1);
//       });
//   } else {
//       console.error("Search input #employee-update-search NOT found!");
//   }

//   fetchEmployeeUpdate();
// });

function initEmployeeUpdateSearch() {
  const searchInput = document.getElementById('employee-update-search');
  if (searchInput) {
      // This will now succeed because the HTML has been loaded by the router.
      console.log("Search input found! Attaching listener."); 
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
  } else {
      // This will show if there's a typo in your active_attrition.html file
      console.error("Search input #employee-update-search NOT found during view initialization!");
  }
}


/**
 * Fetches data from the server. Called on page load or when filters change.
 */
// MODIFIED: Now sets the global filter state.
function fetchEmployeeUpdate(entity = 'ALL', startDate = null, endDate = null) {
    // Store current filters so they can be used by pagination and search
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
            // Store the full list of employees in our master variable.
            employeeUpdateList = data.LATEST_EMPLOYEES || [];
            // NEW: Initialize the display list with the full list.
            displayedEmployeeUpdateList = employeeUpdateList;
            
            // Now, render the first page of this stored data.
            renderEmployeeUpdatesPage(1);
        })
        .catch(error => console.error("Error fetching employee updates:", error));
}

/**
 * Renders a specific page of the employee table from the stored data.
 */
// MODIFIED: Simplified to not pass filter parameters around.
function renderEmployeeUpdatesPage(page) {
    const tbody = document.querySelector('#employee-updates-table tbody');
    if (!tbody) {
        console.error("Could not find the employee updates table body.");
        return;
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    // MODIFIED: Slices the display list, not the master list.
    const paginatedData = displayedEmployeeUpdateList.slice(start, end);

    tbody.innerHTML = ''; // Clear old rows

    if (paginatedData.length > 0) {
        paginatedData.forEach(employee => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${employee.EDS}</td>
                <td>${employee.FULLNAME}</td>
                <td>${employee.PROJECT}</td>
                <td>${employee.POSITION}</td>
                <td>${employee.SITE}</td>
                <td>${employee.SUPERVISOR}</td>
                <td class="${employee.STATUS === 'INACTIVE' ? 'danger' : 'success'}">${employee.STATUS}</td>
                <td>${employee.HIREDDATE}</td>
                <td>${employee.RESIGNEDDATE ?? ''}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="9">No records found.</td></tr>`;
    }

    // After rendering the table, render the pagination controls for it.
    // MODIFIED: Calculate total pages from the display list.
    renderPaginationControls(page, Math.ceil(displayedEmployeeUpdateList.length / limit));
}

/**
 * Renders the pagination buttons.
 */
// MODIFIED: Simplified to not pass filter parameters around.
function renderPaginationControls(currentPage, totalPages) {
    const paginationContainer = document.querySelector('.recent-updates #pagination');
    if (!paginationContainer) {
        console.error("Could not find the pagination container for employee updates.");
        return;
    }
    
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    // Helper function to create a button and add the event listener
    const createAndAppendButton = (page, text, isDisabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        if (isActive) btn.className = 'active';
        if (isDisabled) btn.disabled = true;
        // MODIFIED: The click handler is simpler now.
        btn.addEventListener('click', () => renderEmployeeUpdatesPage(page));
        paginationContainer.appendChild(btn);
    };

    // --- PREV BUTTON ---
    createAndAppendButton(currentPage - 1, '« Prev', currentPage === 1);

    // --- PAGE NUMBER BUTTONS WITH ELLIPSIS LOGIC ---
    // (This logic remains the same)
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
            span.className = 'ellipsis';
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
            span.className = 'ellipsis';
            span.textContent = '...';
            paginationContainer.appendChild(span);
        }

        createAndAppendButton(totalPages, totalPages, false, totalPages === currentPage);
    }
    
    // --- NEXT BUTTON ---
    createAndAppendButton(currentPage + 1, 'Next »', currentPage === totalPages);
}