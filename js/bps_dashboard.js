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
    const singleFilterSelects = $('#filter-site, #filter-tl, #filter-projects, #filter-taskname, #filter-fireflyprocess');
    // --- References for the custom multi-select ---
    const multiSelectContainer = $('#taskprojects-multiselect-container');
    const multiSelectButton = multiSelectContainer.find('.multiselect-button');
    const multiSelectDropdown = multiSelectContainer.find('.multiselect-dropdown');
    const multiSelectLabel = multiSelectContainer.find('.multiselect-label');

    // =========================================================================
    // == 1. DATE PICKER INITIALIZATION
    // =========================================================================
    
    function onDateChange() {
        // When the date changes, we need to refetch both the table data AND the filter options
        // because the available options might change with the date range.
        initializePage(); 
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
    // == 2. DATA HANDLING AND RENDERING
    // =========================================================================

    function getSelectedFilters() {
        const selectedTaskProjects = multiSelectDropdown.find('input:checked').map(function() {
            return $(this).val();
        }).get();

        return {
            site: $('#filter-site').val(),
            tl_name: $('#filter-tl').val(),
            projects: $('#filter-projects').val(),
            taskprojects: selectedTaskProjects.join(','),
            taskname: $('#filter-taskname').val(),
            fireflyprocess: $('#filter-fireflyprocess').val()
        };
    }

    async function fetchData() {
        loadingIndicator.css('display', 'flex'); 
        
        const datePicker = $('#date-range-picker').data('daterangepicker');
        const startDate = datePicker.startDate.format('YYYY-MM-DD');
        const endDate = datePicker.endDate.format('YYYY-MM-DD');
        const filters = getSelectedFilters();

        const params = new URLSearchParams({ startDate, endDate, ...filters });
        const urlWithParams = `../bps_dashboard.php?${params.toString()}`;

        try {
            const response = await fetch(urlWithParams);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText || 'Server error'}`);
            }
            const data = await response.json();
            masterData = data; 
            filteredData = data;
            
            resetAndRender(); 
        } catch (error) {
            console.error("Failed to fetch data:", error);
            tableBody.html(`<tr><td colspan="12" style="text-align:center; padding:16px; color:red;"><b>Error:</b> ${error.message}</td></tr>`);
        } finally {
            loadingIndicator.css('display', 'none'); 
        }
    }
    
    async function updateFilterOptions() {
        const filters = getSelectedFilters();
        const params = new URLSearchParams({ get_options: 'true', ...filters });
        
        try {
            const response = await fetch(`../bps_dashboard.php?${params.toString()}`);
            const options = await response.json();
            
            const populateSelect = (selector, data) => {
                const select = $(selector);
                const currentValue = select.val(); 
                select.html('<option value="">All</option>');
                data.forEach(item => {
                    select.append(`<option value="${item.value}">${item.value}</option>`);
                });
                select.val(currentValue);
            };

            const populateMultiSelect = (data) => {
                const currentValues = getSelectedFilters().taskprojects.split(',').filter(Boolean);
                multiSelectDropdown.empty();
                data.forEach(item => {
                    const isChecked = currentValues.includes(item.value);
                    const checkboxId = `taskproject-${item.value.replace(/\W/g, '_')}`; // Sanitize ID
                    multiSelectDropdown.append(`
                        <label for="${checkboxId}" class="multiselect-option">
                            <input type="checkbox" id="${checkboxId}" value="${item.value}" ${isChecked ? 'checked' : ''}>
                            ${item.value}
                        </label>
                    `);
                });
                updateMultiSelectLabel();
            };

            populateSelect('#filter-site', options.site);
            populateSelect('#filter-tl', options.tl_name);
            populateSelect('#filter-projects', options.projects);
            populateMultiSelect(options.taskprojects);
            populateSelect('#filter-taskname', options.taskname);
            populateSelect('#filter-fireflyprocess', options.fireflyprocess);

        } catch (error) {
            console.error("Failed to update filter options:", error);
        }
    }

    function updateMultiSelectLabel() {
        const selectedCount = multiSelectDropdown.find('input:checked').length;
        if (selectedCount === 0) {
            multiSelectLabel.text('Select Projects');
        } else if (selectedCount === 1) {
            multiSelectLabel.text(multiSelectDropdown.find('input:checked').val());
        } else {
            multiSelectLabel.text(`${selectedCount} selected`);
        }
    }


    function updateDashboardView() {
        const sortedData = [...filteredData].sort((a, b) => {
            const valA = a[sortState.column] ?? '';
            const valB = b[sortState.column] ?? '';
            const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return sortState.direction === 'asc' ? comparison : -comparison;
        });

        updatePaginationState(sortedData.length);
        const paginatedData = sortedData.slice(
            (paginationState.currentPage - 1) * paginationState.rowsPerPage,
            paginationState.currentPage * paginationState.rowsPerPage
        );

        renderTable(paginatedData);
        renderPills();
        renderPaginationControls();
    }
    
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
                    <td>${formattedRecords}</td>
                    <td>${row.hours ? parseFloat(row.hours).toFixed(2) : ''}</td>
                    <td>${row.shipment ?? ''}</td>
                    <td>${row.alloc_eds ?? ''}</td>
                    <td>${row.tputs ? parseFloat(row.tputs).toFixed(2) : ''}</td>
                    <td>${row.vph ? parseFloat(row.vph).toFixed(2) : ''}</td>
                    <td>${row.utilization ? (parseFloat(row.utilization) * 100).toFixed(2) + '%' : ''}</td>
                    <td>${row.prod_ks_tputs ? parseFloat(row.prod_ks_tputs).toFixed(2) : ''}</td>
                    <td>${row.payroll_ks_tputs ? parseFloat(row.payroll_ks_tputs).toFixed(2) : ''}</td>
                </tr>`;
            tableBody.append(tr);
        });
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
        createPill('Taskname', $('#filter-taskname').val(), 'taskname');
        createPill('Firefly Process', $('#filter-fireflyprocess').val(), 'fireflyprocess');
        
        const selectedTaskProjects = getSelectedFilters().taskprojects.split(',').filter(Boolean);
        selectedTaskProjects.forEach(project => {
            pillboxContainer.append(`<div class="pill">Task Project: ${project} <span class="remove-pill" data-filter-key="taskprojects" data-filter-value="${project}">&times;</span></div>`);
        });
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
    // == 3. EVENT HANDLERS 
    // =========================================================================
    
    filterToggleBtn.on('click', () => filterPanel.toggleClass('active'));

    applyFiltersBtn.on('click', () => {
        fetchData();
        filterPanel.removeClass('active');
        multiSelectDropdown.removeClass('active');
    });

    clearFiltersBtn.on('click', () => {
        singleFilterSelects.val('');
        multiSelectDropdown.find('input:checked').prop('checked', false);
        fetchData();
        updateFilterOptions(); 
        filterPanel.removeClass('active');
    });

    pillboxContainer.on('click', '.remove-pill', function() {
        const key = $(this).data('filter-key');
        
        if (key === 'taskprojects') {
            const valueToRemove = $(this).data('filter-value');
            multiSelectDropdown.find(`input[value="${valueToRemove}"]`).prop('checked', false);
        } else {
            $(`#filter-${key}`).val('');
        }
        
        fetchData();
        updateFilterOptions();
    });

    // --- MODIFIED: More robust event handlers for the multi-select ---

    // When a single-select filter changes, update the options in all other filters
    singleFilterSelects.on('change', updateFilterOptions);

    // When a checkbox is clicked, update the label and the other filter options
    multiSelectDropdown.on('change', 'input[type="checkbox"]', function() {
        updateMultiSelectLabel();
        updateFilterOptions();
    });

    // Toggle the dropdown's visibility
    multiSelectButton.on('click', (e) => {
        e.stopPropagation(); // Prevent the document click handler from immediately closing it
        multiSelectDropdown.toggleClass('active');
    });

    // Stop clicks inside the dropdown from closing it
    multiSelectDropdown.on('click', (e) => {
        e.stopPropagation();
    });

    // A single global handler to close the dropdown if clicking anywhere else
    $(document).on('click', function() {
        multiSelectDropdown.removeClass('active');
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

    // --- Export Handlers ---
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
    // == 4. INITIALIZATION CALL
    // =========================================================================
    async function initializePage() {
        await updateFilterOptions(); // Load all dropdown options first
        await fetchData(); // Then fetch the initial table data
        $(`th[data-sort-by="${sortState.column}"] i`).removeClass('fa-sort').addClass('fa-sort-down');
    }
    initializePage();

});

