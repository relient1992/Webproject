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
    let currentView = 'employee';
    let taskProjectSelectionBeforeOpen = [];
    let performanceChart = null;
    let chartPeriod = 'daily'; // ADDED: State for chart aggregation period

    // --- ELEMENT REFERENCES ---
    const tableBody = $('.data-table tbody');
    // UPDATED: Made selector specific to the new ID to avoid affecting the modal
    const tableHead = $('#main-table-container .data-table thead');
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
    const primaryMetricSelect = $('#primary-metric-select');
    const secondaryMetricSelect = $('#secondary-metric-select');
    const chartSection = $('.chart-section');
    const toggleChartBtn = $('#toggle-chart-btn');
    const chartPeriodSwitcher = $('.chart-period-switcher');
    
    // --- Modal References ---
    const modal = $('#employee-task-modal');
    const modalTitle = $('#modal-title');
    const modalCloseBtn = $('#modal-close-btn');
    const modalTableHead = $('#modal-table-head');
    const modalTableBody = $('#modal-table-body');
    const modalLoading = $('#modal-loading');

    // =========================================================================
    // == 1. INITIALIZATION & CORE LOGIC
    // =========================================================================
    
    multiSelectDropdown.removeClass('active').hide();

    async function initializePage() {
        loadingIndicator.css('display', 'flex'); 
        try {
            populateMetricSelectors();
            renderTableStructure();
            
            await Promise.all([
                updateFilterOptions(),
                fetchData(),
                updateChart()
            ]);
        } catch (error) {
            console.error("Page initialization failed:", error);
        } finally {
            loadingIndicator.css('display', 'none'); 
        }
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
    // == 3. CHARTING FUNCTIONS
    // =========================================================================

    const chartMetrics = {
        records: { label: "Records", color: "#4c51bf" },
        hours: { label: "Hours", color: "#ed64a6" },
        shipment: { label: "Shipment", color: "#38b2ac" },
        alloc_eds: { label: "Alloc. EDS", color: "#f56565" },
        tputs: { label: "TPUTS", color: "#f6e05e" },
        vph: { label: "VPH", color: "#a0aec0" },
        utilization: { label: "Utilization (%)", color: "#667eea" },
    };

    function populateMetricSelectors() {
        primaryMetricSelect.empty();
        secondaryMetricSelect.empty();
        secondaryMetricSelect.append('<option value="none">None</option>');

        for (const [key, value] of Object.entries(chartMetrics)) {
            primaryMetricSelect.append(`<option value="${key}">${value.label}</option>`);
            secondaryMetricSelect.append(`<option value="${key}">${value.label}</option>`);
        }
        primaryMetricSelect.val('records');
        secondaryMetricSelect.val('hours');
    }

    async function updateChart() {
        const datePicker = $('#date-range-picker').data('daterangepicker');
        const startDate = datePicker.startDate.format('YYYY-MM-DD');
        const endDate = datePicker.endDate.format('YYYY-MM-DD');
        const filters = getSelectedFilters();
        const chart_period = chartPeriodSwitcher.find('.active').data('period') || 'daily';

        const params = new URLSearchParams({ get_chart_data: 'true', chart_period, startDate, endDate, ...filters });
        
        try {
            const response = await fetch(`../bps_dashboard.php?${params.toString()}`);
            const chartData = await response.json();

            const primaryMetricKey = primaryMetricSelect.val();
            const secondaryMetricKey = secondaryMetricSelect.val();

            let chartTitle = chartMetrics[primaryMetricKey].label;
            if (secondaryMetricKey !== 'none') {
                chartTitle += ` vs. ${chartMetrics[secondaryMetricKey].label}`;
            }

            const labels = chartData.map(d => d.proddate);
            const primaryData = chartData.map(d => parseFloat(d[primaryMetricKey] || 0));
            const secondaryData = chartData.map(d => parseFloat(d[secondaryMetricKey] || 0));

            const datasets = [{
                label: chartMetrics[primaryMetricKey].label,
                data: primaryData,
                borderColor: chartMetrics[primaryMetricKey].color,
                backgroundColor: chartMetrics[primaryMetricKey].color + '33',
                yAxisID: 'y',
                tension: 0.1,
                fill: true,
            }];

            if (secondaryMetricKey !== 'none') {
                datasets.push({
                    label: chartMetrics[secondaryMetricKey].label,
                    data: secondaryData,
                    borderColor: chartMetrics[secondaryMetricKey].color,
                    backgroundColor: chartMetrics[secondaryMetricKey].color + '33',
                    yAxisID: 'y1',
                    tension: 0.1,
                    fill: true,
                });
            }

            const ctx = document.getElementById('performance-chart').getContext('2d');
            if (performanceChart) {
                performanceChart.destroy();
            }

            performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: chartMetrics[primaryMetricKey].label }
                        },
                        y1: {
                            type: 'linear',
                            display: secondaryMetricKey !== 'none',
                            position: 'right',
                            title: { display: true, text: secondaryMetricKey !== 'none' ? chartMetrics[secondaryMetricKey].label : '' },
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                    },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { mode: 'index', intersect: false },
                        title: {
                            display: true,
                            text: chartTitle,
                            font: { size: 18 },
                            padding: { top: 10, bottom: 10 }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                }
            });

        } catch (error) {
            console.error("Failed to update chart:", error);
        }
    }


    // =========================================================================
    // == 4. RENDERING FUNCTIONS
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
                 // Add data attributes for the modal
                rowHtml = `
                    <tr data-eds="${row.eds}" data-employee-name="${row.employee}">
                        <td>${row.eds ?? ''}</td>
                        <td class="employee-cell clickable">${row.employee ?? ''}</td>
                        <td>${row.tl_name ?? ''}</td>
                        <td>${formattedRecords}</td>
                        <td>${row.hours ? parseFloat(row.hours).toFixed(2) : ''}</td>
                        <td>${row.shipment ?? ''}</td>
                        <td>${row.alloc_eds ? parseFloat(row.alloc_eds).toFixed(2) : ''}</td>
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
                        <td>${row.alloc_eds ? parseFloat(row.alloc_eds).toFixed(2) : ''}</td>
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
        const selectedRows = rowsPerPageSelect.val();
        
        if (selectedRows === 'all') {
            paginationState.rowsPerPage = totalItems > 0 ? totalItems : 1;
        } else {
            paginationState.rowsPerPage = parseInt(selectedRows, 10);
        }

        paginationState.totalPages = Math.ceil(totalItems / paginationState.rowsPerPage) || 1;
        
        if (paginationState.currentPage > paginationState.totalPages) {
            paginationState.currentPage = paginationState.totalPages;
        }
    }
    
    function renderPaginationControls() {
        const totalItems = filteredData.length;
        pageNumberSpan.text(paginationState.currentPage);
        entryInfoSpan.text(`${totalItems.toLocaleString()} entries on ${paginationState.totalPages.toLocaleString()} pages`);

        const showControls = totalItems > paginationState.rowsPerPage && rowsPerPageSelect.val() !== 'all';

        if (showControls) {
            prevPageBtn.show();
            nextPageBtn.show();
            pageNumberSpan.show();
            prevPageBtn.toggleClass('disabled', paginationState.currentPage === 1);
            nextPageBtn.toggleClass('disabled', paginationState.currentPage === paginationState.totalPages);
        } else {
            prevPageBtn.hide();
            nextPageBtn.hide();
            pageNumberSpan.hide();
        }
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
    // == 5. EVENT HANDLERS 
    // =========================================================================
    
    filterToggleBtn.on('click', () => filterPanel.toggleClass('active'));

    applyFiltersBtn.on('click', () => {
        initializePage(); 
        filterPanel.removeClass('active');
        multiSelectDropdown.removeClass('active').hide();
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

    // --- Chart Metric Selectors ---
    primaryMetricSelect.on('change', updateChart);
    secondaryMetricSelect.on('change', updateChart);
    
    toggleChartBtn.on('click', function() {
        chartSection.toggleClass('hidden');
        const isHidden = chartSection.hasClass('hidden');
        if (isHidden) {
            $(this).html('<i class="fas fa-eye"></i> Show Chart');
        } else {
            $(this).html('<i class="fas fa-eye-slash"></i> Hide Chart');
        }
    });

    // --- ADDED: Event handler for chart period switcher ---
    chartPeriodSwitcher.on('click', '.view-btn', function() {
        const clickedPeriod = $(this).data('period');
        if (clickedPeriod !== chartPeriod) {
            chartPeriod = clickedPeriod;
            chartPeriodSwitcher.find('.view-btn').removeClass('active');
            $(this).addClass('active');
            updateChart();
        }
    });


    // --- Multi-select Dropdown Logic ---
    multiSelectButton.on('click', function(e) {
        e.stopPropagation();
        const isOpen = multiSelectDropdown.hasClass('active');
        if (!isOpen) {
            taskProjectSelectionBeforeOpen = multiSelectDropdown.find('input:checked')
                .map(function() { return $(this).val(); }).get();
            multiSelectDropdown.addClass('active').show();
        } else {
            multiSelectDropdown.removeClass('active').hide();
        }
    });

    multiSelectDropdown.on('click', '.multiselect-apply-btn', function(e) {
        e.stopPropagation();
        updateMultiSelectLabel();
        updateFilterOptions();
        multiSelectDropdown.removeClass('active').hide();
    });

    multiSelectDropdown.on('click', '.multiselect-cancel-btn', function(e) {
        e.stopPropagation();
        multiSelectDropdown.find('input[type="checkbox"]').each(function() {
            $(this).prop('checked', taskProjectSelectionBeforeOpen.includes($(this).val()));
        });
        multiSelectDropdown.removeClass('active').hide();
    });
    
    multiSelectDropdown.on('change', 'input[type="checkbox"]', function() {
        updateMultiSelectLabel();
    });

    multiSelectDropdown.on('click', function(e) {
        e.stopPropagation();
    });

    // --- Cascading Filter Logic for Single-selects ---
    singleFilterSelects.on('change', updateFilterOptions);

    $(document).on('click', function() {
        if (multiSelectDropdown.hasClass('active')) {
            multiSelectDropdown.find('input[type="checkbox"]').each(function() {
                $(this).prop('checked', taskProjectSelectionBeforeOpen.includes($(this).val()));
            });
            multiSelectDropdown.removeClass('active').hide();
        }
    });

    // --- Table Sorting ---
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
    
    // --- Pagination ---
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

    xlsxExportBtn.on('click', async function() {
        const originalButtonHtml = $(this).html();
        $(this).html('<i class="fas fa-spinner fa-spin"></i> Downloading...').prop('disabled', true);
        
        try {
            const datePicker = $('#date-range-picker').data('daterangepicker');
            const startDate = datePicker.startDate.format('YYYY-MM-DD');
            const endDate = datePicker.endDate.format('YYYY-MM-DD');
            
            const params = new URLSearchParams({ get_export_data: 'true', startDate, endDate });
            const response = await fetch(`../bps_dashboard.php?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch export data.');
            }

            const exportData = await response.json();

            if (exportData.length === 0) {
                alert('No data to export for the selected date range.');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "BPS Raw Data");
            XLSX.writeFile(workbook, `bps_dashboard_raw_export_${startDate}_to_${endDate}.xlsx`);

        } catch (error) {
            console.error("Export failed:", error);
            alert("An error occurred during the export.");
        } finally {
            $(this).html(originalButtonHtml).prop('disabled', false);
        }
    });
    
    // --- ADDED: Modal Event Handlers ---
    tableBody.on('click', '.employee-cell.clickable', async function() {
        const row = $(this).closest('tr');
        const eds = row.data('eds');
        const employeeName = row.data('employee-name');

        modalTitle.text(`Task Details for: ${employeeName}`);
        modal.removeClass('hidden');
        modalLoading.css('display', 'flex');
        modalTableBody.empty();

        // Prepare headers for the modal table
        const modalHeaders = `
            <tr>
                <th>TASK PROJECT</th>
                <th>TASK NAME</th>
                <th>RECORDS</th>
                <th>HOURS</th>
                <th>SHIPMENT</th>
                <th>ALLOC EDS</th>
                <th>TPUTS</th>
                <th>VPH</th>
                <th>UTILIZATION</th>
            </tr>`;
        modalTableHead.html(modalHeaders);
        
        // Fetch the detailed data for this employee
        const datePicker = $('#date-range-picker').data('daterangepicker');
        const startDate = datePicker.startDate.format('YYYY-MM-DD');
        const endDate = datePicker.endDate.format('YYYY-MM-DD');
        const filters = getSelectedFilters();
        const params = new URLSearchParams({ 
            get_employee_tasks: 'true', 
            employee_eds: eds,
            startDate, 
            endDate, 
            ...filters 
        });

        try {
            const response = await fetch(`../bps_dashboard.php?${params.toString()}`);
            const taskData = await response.json();

            if (taskData.length === 0) {
                modalTableBody.html('<tr><td colspan="9" style="text-align:center; padding:16px;">No tasks found for this employee with the current filters.</td></tr>');
            } else {
                taskData.forEach(task => {
                    const taskRowHtml = `
                        <tr>
                            <td>${task.taskprojects ?? ''}</td>
                            <td>${task.taskname ?? ''}</td>
                            <td>${task.records ? parseInt(task.records, 10).toLocaleString() : ''}</td>
                            <td>${task.hours ? parseFloat(task.hours).toFixed(2) : ''}</td>
                            <td>${task.shipment ?? ''}</td>
                            <td>${task.alloc_eds ? parseFloat(task.alloc_eds).toFixed(2) : ''}</td>
                            <td>${task.tputs ? parseFloat(task.tputs).toFixed(2) : ''}</td>
                            <td>${task.vph ? parseFloat(task.vph).toFixed(2) : ''}</td>
                            <td>${task.utilization ? (parseFloat(task.utilization) * 100).toFixed(2) + '%' : ''}</td>
                        </tr>`;
                    modalTableBody.append(taskRowHtml);
                });
            }
        } catch (error) {
            console.error('Failed to fetch employee task details:', error);
            modalTableBody.html(`<tr><td colspan="9" style="text-align:center; padding:16px; color:red;">Failed to load task details.</td></tr>`);
        } finally {
            modalLoading.css('display', 'none');
        }
    });

    modalCloseBtn.on('click', () => modal.addClass('hidden'));
    modal.on('click', function(e) {
        if (e.target === this) {
            $(this).addClass('hidden');
        }
    });


    // =========================================================================
    // == 6. INITIALIZATION CALL
    // =========================================================================
    initializePage();

});

