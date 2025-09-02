$(function() { // Use jQuery's ready function for initialization

    // --- STATE MANAGEMENT ---
    let masterData = [];     // Holds the original data from the server
    let filteredData = [];   // Holds data after filters are applied
    let sortState = { column: 'eds', direction: 'asc' };
    let paginationState = {
        currentPage: 1,
        rowsPerPage: 30,
        totalPages: 1
    };

    // --- ELEMENT REFERENCES (using jQuery) ---
    const tableBody = $('.data-table tbody');
    const loadingIndicator = $('#loading');
    const filterToggleBtn = $('#filter-toggle-btn');
    const filterPanel = $('#filter-panel');
    const applyFiltersBtn = $('.apply-filters-btn');
    const clearFiltersBtn = $('.clear-filters-btn');
    const pillboxContainer = $('.pillbox-container');
    const headers = $('th[data-sort-by]');
    const entryInfoSpan = $('.entry-info');
    const pageNumberSpan = $('#page-number');
    const prevPageBtn = $('#prev-page-btn');
    const nextPageBtn = $('#next-page-btn');
    const rowsPerPageSelect = $('#rows-per-page');
    const csvExportBtn = $('#csv-export-btn');
    const xlsxExportBtn = $('#xlsx-export-btn');

    // =========================================================================
    // == 1. DATE PICKER INITIALIZATION ==
    // =========================================================================
    
    function onDateChange(start, end) {
        $('#date-range-picker').val(start.format('YYYY-MM-DD') + ' - ' + end.format('YYYY-MM-DD'));
        fetchData(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    }

    $('#date-range-picker').daterangepicker({
        startDate: moment(),
        endDate: moment(),
        ranges: {
           'Today': [moment(), moment()],
           'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           'Last 7 Days': [moment().subtract(6, 'days'), moment()],
           'Last 30 Days': [moment().subtract(29, 'days'), moment()],
           'This Month': [moment().startOf('month'), moment().endOf('month')],
           'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, onDateChange);
    

    // =========================================================================
    // == 2. DATA HANDLING AND RENDERING FUNCTIONS ==
    // =========================================================================

    /**
     * Fetches data from the PHP backend using the modern fetch() API.
     * @param {string} startDate - The start date in YYYY-MM-DD format.
     * @param {string} endDate - The end date in YYYY-MM-DD format.
     */
    async function fetchData(startDate, endDate) {
        loadingIndicator.show(); // Use jQuery's show() method
        
        // Construct the URL with query parameters. The "../" navigates one directory up.
        // This is a likely fix if your HTML is in a 'views' folder and your PHP is in the parent folder.
        const urlWithParams = `../bps_dashboard.php?startDate=${startDate}&endDate=${endDate}`;

        try {
            const response = await fetch(urlWithParams);

            // If the response is not OK, read the response as text to see the server error message.
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned an error: ${response.status}. Response: ${errorText}`);
            }

            const data = await response.json();
            masterData = data;
            populateFilterDropdowns(masterData);
            resetAndRender(); 

        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Display the detailed error message in the table for easier debugging.
            tableBody.html(`<tr><td colspan="12" style="text-align:center; padding: 16px; color: red;">${error.message}</td></tr>`);
        } finally {
            loadingIndicator.hide(); // Use jQuery's hide() method
        }
    }

    /**
     * Main function to apply all client-side operations (filter, sort, paginate) and render the table.
     */
    function updateDashboardView() {
        // 1. Apply single-select filters
        const filters = {
            site: $('#filter-site').val(),
            tl_name: $('#filter-tl').val(),
            projects: $('#filter-projects').val()
        };

        filteredData = masterData.filter(row => {
            return Object.entries(filters).every(([key, value]) => !value || String(row[key]) === String(value));
        });

        // 2. Sort the filtered data
        const sortedData = [...filteredData].sort((a, b) => {
            const valA = a[sortState.column] ?? '';
            const valB = b[sortState.column] ?? '';
            const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return sortState.direction === 'asc' ? comparison : -comparison;
        });

        // 3. Paginate the sorted data
        updatePaginationState(sortedData.length);
        const paginatedData = sortedData.slice(
            (paginationState.currentPage - 1) * paginationState.rowsPerPage,
            paginationState.currentPage * paginationState.rowsPerPage
        );

        // 4. Render everything
        renderTable(paginatedData);
        renderPills();
        renderPaginationControls();
    }
    
    /**
     * Renders data into the HTML table body.
     * @param {Array} dataToRender - The array of objects for the current page.
     */
    function renderTable(dataToRender) {
        tableBody.empty();
        if (dataToRender.length === 0) {
            tableBody.append('<tr><td colspan="12" style="text-align:center; padding: 16px;">No data matches the current criteria.</td></tr>');
            return;
        }
        dataToRender.forEach(row => {
            const formattedRecords = row.records ? parseInt(row.records, 10).toLocaleString() : '';
            const tr = `
                <tr>
                    <td>${row.eds ?? ''}</td>
                    <td>${row.employee ?? ''}</td>
                    <td>${row.tl_name ?? ''}</td>
                    <td>${formattedRecords}</td
                    <td>${row.hours ?? ''}</td>
                    <td>${row.shipment ?? ''}</td>
                    <td>${row.alloc_eds ?? ''}</td>
                    <td>${row.tputs ?? ''}</td>
                    <td>${row.vph ?? ''}</td>
                    <td>${row.utilization ?? ''}</td>
                    <td>${row.prod_ks_tputs ?? ''}</td>
                    <td>${row.payroll_ks_tputs ?? ''}</td>
                </tr>`;
            tableBody.append(tr);
        });
    }

    // --- Helper functions for rendering UI components ---
    
    function populateFilterDropdowns(data) {
        const populate = (selector, key) => {
            const uniqueOptions = [...new Set(data.map(item => item[key]).filter(Boolean))].sort();
            const select = $(selector);
            select.html('<option value="">All</option>');
            uniqueOptions.forEach(option => select.append(`<option value="${option}">${option}</option>`));
        };
        populate('#filter-site', 'site');
        populate('#filter-tl', 'tl_name');
        populate('#filter-projects', 'projects');
    }
    
    function renderPills() {
        pillboxContainer.empty();
        const createPill = (name, value, key) => {
            if (value) {
                pillboxContainer.append(`<div class="pill">${name}: ${value} <span class="remove-pill" data-filter-key="${key}">&times;</span></div>`);
            }
        };
        createPill('Site', $('#filter-site').val(), 'site');
        createPill('Team Leader', $('#filter-tl').val(), 'tl_name');
        createPill('Project', $('#filter-projects').val(), 'projects');
    }

    function updatePaginationState(totalItems) {
        paginationState.rowsPerPage = parseInt(rowsPerPageSelect.val(), 10);
        paginationState.totalPages = Math.ceil(totalItems / paginationState.rowsPerPage) || 1;
        if (paginationState.currentPage > paginationState.totalPages) {
            paginationState.currentPage = paginationState.totalPages;
        }
    }

    function renderPaginationControls() {
        pageNumberSpan.text(paginationState.currentPage);
        entryInfoSpan.text(`${filteredData.length.toLocaleString()} entries on ${paginationState.totalPages.toLocaleString()} pages`);
        prevPageBtn.toggleClass('disabled', paginationState.currentPage === 1);
        nextPageBtn.toggleClass('disabled', paginationState.currentPage === paginationState.totalPages);
    }
    
    function resetAndRender() {
        paginationState.currentPage = 1;
        updateDashboardView();
    }

    // =========================================================================
    // == 3. EVENT HANDLERS (Unchanged) ==
    // =========================================================================
    
    filterToggleBtn.on('click', () => filterPanel.toggleClass('active'));

    applyFiltersBtn.on('click', () => {
        resetAndRender();
        filterPanel.removeClass('active');
    });

    clearFiltersBtn.on('click', () => {
        $('#filter-site, #filter-tl, #filter-projects').val('');
        resetAndRender();
        filterPanel.removeClass('active');
    });

    pillboxContainer.on('click', '.remove-pill', function() {
        const key = $(this).data('filter-key');
        const selectMap = { site: '#filter-site', tl_name: '#filter-tl', projects: '#filter-projects' };
        $(selectMap[key]).val('');
        resetAndRender();
    });

    headers.on('click', function() {
        const column = $(this).data('sort-by');
        headers.removeClass('sorted');
        $(this).addClass('sorted');

        if (sortState.column === column) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = column;
            sortState.direction = 'asc';
        }

        headers.find('i').attr('class', 'fas fa-sort');
        $(this).find('i').attr('class', sortState.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down');
        
        updateDashboardView();
    });
    
    prevPageBtn.on('click', () => {
        if (paginationState.currentPage > 1) {
            paginationState.currentPage--;
            updateDashboardView();
        }
    });

    nextPageBtn.on('click', () => {
        if (paginationState.currentPage < paginationState.totalPages) {
            paginationState.currentPage++;
            updateDashboardView();
        }
    });

    rowsPerPageSelect.on('change', resetAndRender);

    csvExportBtn.on('click', () => {
        if (filteredData.length === 0) return alert('No data to export.');
        const headers = Object.keys(filteredData[0]);
        const csvRows = [headers.join(','), ...filteredData.map(row => headers.map(h => JSON.stringify(row[h])).join(','))];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bps_dashboard_export.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    xlsxExportBtn.on('click', () => {
        if (filteredData.length === 0) return alert('No data to export.');
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BPS Data");
        XLSX.writeFile(workbook, "bps_dashboard_export.xlsx");
    });

    // =========================================================================
    // == 4. INITIALIZATION CALL ==
    // =========================================================================
    onDateChange(moment(), moment());
    $(`th[data-sort-by="${sortState.column}"] i`).removeClass('fa-sort').addClass('fa-sort-down');

});