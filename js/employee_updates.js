// This variable will hold the full list of employees after one fetch.
let employeeUpdateList = [];

const limit = 10; // How many employees to show per page.

/**
 * Fetches data from the server. Called on page load or when filters change.
 */
function fetchEmployeeUpdate(entity = 'ALL', startDate = null, endDate = null) {
  const params = new URLSearchParams();
  params.append('entity', entity);

  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  }

  fetch(`fetch_data.php?${params.toString()}`)
    .then(response => response.json())
    .then(data => {
      // Store the full list of employees in our variable.
      employeeUpdateList = data.LATEST_EMPLOYEES || [];
      // Now, render the first page of this stored data.
      renderEmployeeUpdatesPage(1, entity, startDate, endDate);
    })
    .catch(error => console.error("Error fetching employee updates:", error));
}

/**
 * Renders a specific page of the employee table from the stored data.
 */
function renderEmployeeUpdatesPage(page, entity, startDate, endDate) {
  // UPDATED: Looks for the table with the ID you just added.
  const tbody = document.querySelector('#employee-updates-table tbody');
  if (!tbody) {
    console.error("Could not find the employee updates table body.");
    return;
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = employeeUpdateList.slice(start, end);

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
  renderPaginationControls(page, Math.ceil(employeeUpdateList.length / limit), entity, startDate, endDate);
}

/**
 * Renders the pagination buttons.
 */
function renderPaginationControls(currentPage, totalPages, entity, startDate, endDate) {
  // UPDATED: Looks for #pagination inside your .recent-updates container.
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
      // This is your working event listener pattern
      btn.addEventListener('click', () => renderEmployeeUpdatesPage(page, entity, startDate, endDate));
      paginationContainer.appendChild(btn);
  };

  // --- PREV BUTTON ---
  createAndAppendButton(currentPage - 1, '« Prev', currentPage === 1);

  // --- PAGE NUMBER BUTTONS WITH ELLIPSIS LOGIC ---
  const siblingCount = 1;
  const totalSlots = 7; // Total number of buttons/ellipses to show

  if (totalPages <= totalSlots) {
      // If there are 7 or fewer pages, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
          createAndAppendButton(i, i, false, i === currentPage);
      }
  } else {
      // If there are more than 7 pages, use ellipsis logic
      const showLeftEllipsis = currentPage > siblingCount + 2;
      const showRightEllipsis = currentPage < totalPages - (siblingCount + 1);

      // Always show first page
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
          endPage = 4; // Show 1, 2, 3, 4, ..., last
      } else if (showLeftEllipsis && !showRightEllipsis) {
          startPage = totalPages - 3;
          endPage = totalPages - 1; // Show 1, ..., n-3, n-2, n-1, n
      } else {
          startPage = currentPage - siblingCount;
          endPage = currentPage + siblingCount; // Show 1, ..., n-1, n, n+1, ..., last
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

      // Always show last page
      createAndAppendButton(totalPages, totalPages, false, totalPages === currentPage);
  }
  
  // --- NEXT BUTTON ---
  createAndAppendButton(currentPage + 1, 'Next »', currentPage === totalPages);
}