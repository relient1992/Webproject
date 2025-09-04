$(function() { // Use jQuery's ready function for initialization

    // --- STATE MANAGEMENT ---
    let masterData = [];     
    let filteredData = [];   
    let sortState = { column: 'eds', direction: 'asc' };
    let paginationState = {
        currentPage: 1,
        rowsPerPage: 30,
        totalPages: 1
    };
    let currentView = 'employee'; // 'employee' or 'project'
    let taskProjectSelectionBeforeOpen = []; // For canceling multi-select changes

    // --- ELEMENT REFERENCES ---
    const tableBody = $('.data-table tbody');
    const tableHead = $('.data-table thead');
    const loadingIndicator = $('#loading');
    const filterToggleBtn = $('#filter-toggle-btn');
    const filterPanel = $('#filter-panel');
    const applyFiltersBtn = $('.apply-filters-btn');
    const clearFiltersBtn = $('.clear-filters-btn');
    const pillboxContainer = $('.pillbox-container');
    const entryInfoSpan = $('.entry-info');
    const pageNumberSpan = $('#page-number');
    const prevPageBtn = $('#prev-page-btn');
    const nextPageBtn = $('#next-page-btn');
    const rowsPerPageSelect = $('#rows-per-page');
    const csvExportBtn = $('#csv-export-btn');
    const xlsxExportBtn = $('#xlsx-export-btn');
    const singleFilterSelects = $('#filter-site, #filter-tl, #filter-projects, #filter-taskname, #filter-fireflyprocess');
    const employeeViewBtn = $('#employee-view-btn');
    const projectViewBtn = $('#project-view-btn');
    const multiSelectContainer = $('#taskprojects-multiselect-container');
    const multiSelectButton = multiSelectContainer.find('.multiselect-button');
    const multiSelectDropdown = multiSelectContainer.find('.multiselect-dropdown');
    const multiSelectLabel = multiSelectContainer.find('.multiselect-label');
    
    // =========================================================================
    // == 1. INITIALIZATION & CORE LOGIC
    // =========================================================================
    
    async function initializePage() {
        renderTableStructure();
        await updateFilterOptions(); 
        await fetchData(); 
    }

    function onDateChange() {
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

        const params = new URLSearchParams({ view_mode: currentView, startDate, endDate, ...filters });
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
        const datePicker = $('#date-range-picker').data('daterangepicker');
        const startDate = datePicker.startDate.format('YYYY-MM-DD');
        const endDate = datePicker.endDate.format('YYYY-MM-DD');
        const params = new URLSearchParams({ get_options: 'true', startDate, endDate, ...filters });
        
        try {
            const response = await fetch(`../bps_dashboard.php?${params.toString()}`);
            if (!response.ok) { 
                const errorText = await response.text();
                throw new Error(`Failed to update filters. Server responded with ${response.status}: ${errorText}`);
            }
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
                const dropdownContent = multiSelectDropdown.find('.multiselect-options-container');
                dropdownContent.empty();
                data.forEach(item => {
                    const isChecked = currentValues.includes(item.value);
                    const checkboxId = `taskproject-${item.value.replace(/\W/g, '_')}`;
                    dropdownContent.append(`
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

    // =========================================================================
    // == 3. RENDERING FUNCTIONS
    // =========================================================================

    function renderTableStructure() {
        tableHead.empty();
        let headersHtml = '';
        if (currentView === 'employee') {
            sortState.column = 'eds';
            headersHtml = `
                <tr>
                    <th data-sort-by="eds">EDS <i class="fas fa-sort"></i></th>
                    <th data-sort-by="employee">EMPLOYEE <i class="fas fa-sort"></i></th>
                    <th data-sort-by="tl_name">TL NAME <i class="fas fa-sort"></i></th>
                    <th data-sort-by="records">RECORDS <i class="fas fa-sort"></i></th>
                    <th data-sort-by="hours">HOURS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="shipment">SHIPMENT<i class="fas fa-sort"></i></th>
                    <th data-sort-by="alloc_eds">ALLOC EDS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="tputs">TPUTS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="vph">VPH <i class="fas fa-sort"></i></th>
                    <th data-sort-by="utilization">UTILIZATION<i class="fas fa-sort"></i></th>
                    <th data-sort-by="prod_ks_tputs">PROD_KS_TPUTS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="payroll_ks_tputs">PAYROLL_KS_TPUTS<i class="fas fa-sort"></i></th>
                </tr>`;
        } else { // Project View
            sortState.column = 'taskprojects';
            headersHtml = `
                <tr>
                    <th data-sort-by="taskprojects">TASK PROJECT <i class="fas fa-sort"></i></th>
                    <th data-sort-by="taskname">TASK NAME <i class="fas fa-sort"></i></th>
                    <th data-sort-by="records">RECORDS <i class="fas fa-sort"></i></th>
                    <th data-sort-by="hours">HOURS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="shipment">SHIPMENT<i class="fas fa-sort"></i></th>
                    <th data-sort-by="alloc_eds">ALLOC EDS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="tputs">TPUTS<i class="fas fa-sort"></i></th>
                    <th data-sort-by="vph">VPH <i class="fas fa-sort"></i></th>
                    <th data-sort-by="utilization">UTILIZATION<i class="fas fa-sort"></i></th>
                </tr>`;
        }
        tableHead.html(headersHtml);
        $(`.data-table th[data-sort-by="${sortState.column}"]`).addClass('sorted').find('i').removeClass('fa-sort').addClass('fa-sort-down');
    }

    function renderTable(dataToRender) {
        tableBody.empty();
        const noDataColspan = (currentView === 'employee') ? 12 : 9;

        if (dataToRender.length === 0) {
            tableBody.append(`<tr><td colspan="${noDataColspan}" style="text-align:center; padding: 16px;">No data matches the current criteria.</td></tr>`);
            return;
        }

        dataToRender.forEach(row => {
            const formattedRecords = row.records ? parseInt(row.records, 10).toLocaleString() : '';
            let rowHtml = '';

            if (currentView === 'employee') {
                rowHtml = `
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
            } else { // Project View
                rowHtml = `
                    <tr>
                        <td>${row.taskprojects ?? ''}</td>
                        <td>${row.taskname ?? ''}</td>
                        <td>${formattedRecords}</td>
                        <td>${row.hours ? parseFloat(row.hours).toFixed(2) : ''}</td>
                        <td>${row.shipment ?? ''}</td>
                        <td>${row.alloc_eds ?? ''}</td>
                        <td>${row.tputs ? parseFloat(row.tputs).toFixed(2) : ''}</td>
                        <td>${row.vph ? parseFloat(row.vph).toFixed(2) : ''}</td>
                        <td>${row.utilization ? (parseFloat(row.utilization) * 100).toFixed(2) + '%' : ''}</td>
                    </tr>`;
            }
            tableBody.append(rowHtml);
        });
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

    function renderPills() {
        pillboxContainer.empty();
        const filters = getSelectedFilters();

        const createPill = (name, value, key) => {
            if (value) {
                pillboxContainer.append(`<div class="pill">${name}: ${value} <span class="remove-pill" data-filter-key="${key}">&times;</span></div>`);
            }
        };

        createPill('Site', filters.site, 'site');
        createPill('Team Leader', filters.tl_name, 'tl_name');
        createPill('Primary Project', filters.projects, 'projects');
        createPill('Taskname', filters.taskname, 'taskname');
        createPill('Firefly Process', filters.fireflyprocess, 'fireflyprocess');
        
        const selectedTaskProjects = filters.taskprojects.split(',').filter(Boolean);
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


    // =========================================================================
    // == 4. EVENT HANDLERS 
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
        initializePage();
        filterPanel.removeClass('active');
    });

    pillboxContainer.on('click', '.remove-pill', function() {
        const key = $(this).data('filter-key');
        
        if (key === 'taskprojects') {
            const valueToRemove = $(this).data('filter-value');
            multiSelectDropdown.find(`input[value="${valueToRemove}"]`).prop('checked', false);
        } else {
            const selectorMap = {
                site: '#filter-site',
                tl_name: '#filter-tl',
                projects: '#filter-projects',
                taskname: '#filter-taskname',
                fireflyprocess: '#filter-fireflyprocess'
            };
            $(selectorMap[key]).val('');
        }
        
        initializePage();
    });

    // --- View Switcher ---
    employeeViewBtn.on('click', () => {
        if(currentView !== 'employee') {
            currentView = 'employee';
            employeeViewBtn.addClass('active');
            projectViewBtn.removeClass('active');
            initializePage();
        }
    });
    projectViewBtn.on('click', () => {
        if(currentView !== 'project') {
            currentView = 'project';
            projectViewBtn.addClass('active');
            employeeViewBtn.removeClass('active');
            initializePage();
        }
    });


    // --- Cascading Filter Logic for Multi-select ---
    multiSelectButton.on('click', (e) => {
        e.stopPropagation();
        const isOpen = multiSelectDropdown.hasClass('active');
        if (!isOpen) {
            taskProjectSelectionBeforeOpen = multiSelectDropdown.find('input:checked').map(function() {
                return $(this).val();
            }).get();
        }
        multiSelectDropdown.toggleClass('active');
    });
    
    // --- FINAL FIX: More direct event handlers for apply/cancel ---
    multiSelectDropdown.on('mousedown', '.multiselect-apply-btn', function(e) {
        e.preventDefault(); 
        e.stopPropagation(); 
        multiSelectDropdown.removeClass('active');
        // Defer the async update to prevent race conditions
        setTimeout(() => {
            updateMultiSelectLabel();
            updateFilterOptions();
        }, 0);
    });

    multiSelectDropdown.on('mousedown', '.multiselect-cancel-btn', function(e) {
        e.preventDefault(); 
        e.stopPropagation(); 
        multiSelectDropdown.removeClass('active');
        multiSelectDropdown.find('input[type="checkbox"]').each(function() {
            const value = $(this).val();
            $(this).prop('checked', taskProjectSelectionBeforeOpen.includes(value));
        });
    });


    // --- Cascading Filter Logic for Single-selects ---
    singleFilterSelects.on('change', updateFilterOptions);

    $(document).on('click', function(e) {
        if (!multiSelectContainer.is(e.target) && multiSelectContainer.has(e.target).length === 0) {
            if (multiSelectDropdown.hasClass('active')) {
                // If clicking outside, revert changes and close
                multiSelectDropdown.find('input[type="checkbox"]').each(function() {
                    const value = $(this).val();
                    $(this).prop('checked', taskProjectSelectionBeforeOpen.includes(value));
                });
                multiSelectDropdown.removeClass('active');
            }
        }
    });

    tableHead.on('click', 'th', function() {
        const th = $(this);
        const column = th.data('sort-by');
        if (!column) return;

        $('.data-table th').removeClass('sorted');
        th.addClass('sorted');
        if (sortState.column === column) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = column;
            sortState.direction = 'asc';
        }
        $('.data-table th i').attr('class', 'fas fa-sort');
        th.find('i').attr('class', sortState.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down');
        resetAndRender();
    });
    
    prevPageBtn.on('click', () => {
        if (paginationState.currentPage > 1) {
            paginationState.currentPage--;
            resetAndRender();
        }
    });

    nextPageBtn.on('click', () => {
        if (paginationState.currentPage < paginationState.totalPages) {
            paginationState.currentPage++;
            resetAndRender();
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
    // == 5. INITIALIZATION CALL
    // =========================================================================
    initializePage();

});

