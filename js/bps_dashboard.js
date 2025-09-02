// document.addEventListener('DOMContentLoaded', () => {
//     const filterElements = {
//         location: document.getElementById('location-filter'),
//         project: document.getElementById('project-filter'),
//         weekending: document.getElementById('weekending-filter'),
//         platform: document.getElementById('platform-filter'),
//         proddate: document.getElementById('proddate-filter'),
//         process: document.getElementById('process-filter'),
//         tl: document.getElementById('tl-filter'),
//         taskname: document.getElementById('taskname-filter'),
//         operator: document.getElementById('operator-filter'),
//         taskproject: document.getElementById('taskproject-filter')
//     };

//     const applyButton = document.getElementById('apply-filters');
//     const resetButton = document.getElementById('reset-filters');
//     const tableBody = document.getElementById('dashboard-table-body');

//     let recordsChart, hoursChart;

//     // Fetch initial data and populate filters
//     fetchData().then(initialData => {
//         populateFilters(initialData);
//         updateDashboard(initialData);
//     });

//     // Event Listeners
//     applyButton.addEventListener('click', () => {
//         const filters = getSelectedFilters();
//         fetchData(filters).then(updateDashboard);
//     });

//     resetButton.addEventListener('click', () => {
//         Object.values(filterElements).forEach(el => {
//             if (el.type === 'select-multiple') {
//                 Array.from(el.options).forEach(option => option.selected = false);
//             } else {
//                 el.value = '';
//             }
//         });
//         fetchData().then(updateDashboard);
//     });

//     // Functions
//     async function fetchData(filters = {}) {
//         const query = new URLSearchParams(filters).toString();
//         const response = await fetch(`fetch_data.php?${query}`);
//         return await response.json();
//     }

//     function populateFilters(data) {
//         const filterOptions = {
//             Location: new Set(),
//             'Primary Project': new Set(),
//             Weekending: new Set(),
//             Platform: new Set(),
//             'Firefly Process': new Set(),
//             'TL Name': new Set(),
//             Taskname: new Set(),
//             'Operator name': new Set(),
//             'Task PROJECT': new Set()
//         };

//         data.forEach(row => {
//             // Use the exact column names from your database
//             if (row['Location']) filterOptions.Location.add(row['Location']);
//             if (row['Primary Project']) filterOptions['Primary Project'].add(row['Primary Project']);
//             if (row['Weekending']) filterOptions.Weekending.add(row['Weekending']);
//             if (row['Platform']) filterOptions.Platform.add(row['Platform']);
//             if (row['Firefly Process']) filterOptions['Firefly Process'].add(row['Firefly Process']);
//             if (row['TL Name']) filterOptions['TL Name'].add(row['TL Name']);
//             if (row['Taskname']) filterOptions.Taskname.add(row['Taskname']);
//             if (row['Operator name']) filterOptions['Operator name'].add(row['Operator name']);
//             if (row['Task PROJECT']) filterOptions['Task PROJECT'].add(row['Task PROJECT']);
//         });

//         // Populate dropdowns
//         filterElements.location.innerHTML = [...filterOptions.Location].map(v => `<option>${v}</option>`).join('');
//         filterElements.project.innerHTML = [...filterOptions['Primary Project']].map(v => `<option>${v}</option>`).join('');
//         filterElements.weekending.innerHTML = [...filterOptions.Weekending].map(v => `<option>${v}</option>`).join('');
//         filterElements.platform.innerHTML = [...filterOptions.Platform].map(v => `<option>${v}</option>`).join('');
//         filterElements.process.innerHTML = [...filterOptions['Firefly Process']].map(v => `<option>${v}</option>`).join('');
//         filterElements.tl.innerHTML = [...filterOptions['TL Name']].map(v => `<option>${v}</option>`).join('');
//         filterElements.taskname.innerHTML = [...filterOptions.Taskname].map(v => `<option>${v}</option>`).join('');
//         filterElements.operator.innerHTML = [...filterOptions['Operator name']].map(v => `<option>${v}</option>`).join('');
//         filterElements.taskproject.innerHTML = [...filterOptions['Task PROJECT']].map(v => `<option>${v}</option>`).join('');
//     }

//     function getSelectedFilters() {
//         const filters = {};
//         Object.entries(filterElements).forEach(([key, el]) => {
//             if (el.type === 'select-multiple') {
//                 const selected = [...el.selectedOptions].map(opt => opt.value);
//                 // Use the label text as the key for the query parameter
//                 if (selected.length) filters[el.labels[0].innerText] = selected.join(',');
//             } else if (el.value) {
//                 filters[el.labels[0].innerText] = el.value;
//             }
//         });
//         return filters;
//     }

//     function updateDashboard(data) {
//         updateCharts(data);
//         updateTable(data);
//     }

//     function updateCharts(data) {
//         const operatorData = {};
//         data.forEach(row => {
//             const operator = row['Operator name'];
//             if (!operatorData[operator]) {
//                 operatorData[operator] = { records: 0, hours: 0 };
//             }
//             operatorData[operator].records += parseFloat(row.Records) || 0;
//             operatorData[operator].hours += parseFloat(row.Hours) || 0;
//         });

//         const labels = Object.keys(operatorData);
//         const records = labels.map(l => operatorData[l].records);
//         const hours = labels.map(l => operatorData[l].hours);

//         // Records Chart
//         if (recordsChart) recordsChart.destroy();
//         recordsChart = new Chart(document.getElementById('records-chart'), {
//             type: 'bar',
//             data: {
//                 labels,
//                 datasets: [{
//                     label: 'Total Records',
//                     data: records,
//                     backgroundColor: 'rgba(52, 152, 219, 0.7)'
//                 }]
//             }
//         });

//         // Hours Chart
//         if (hoursChart) hoursChart.destroy();
//         hoursChart = new Chart(document.getElementById('hours-chart'), {
//             type: 'doughnut',
//             data: {
//                 labels,
//                 datasets: [{
//                     label: 'Total Hours',
//                     data: hours,
//                     backgroundColor: ['#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#34495e', '#1abc9c', '#e67e22']
//                 }]
//             }
//         });
//     }

//     function updateTable(data) {
//         tableBody.innerHTML = '';
//         if (!data || data.error) {
//             tableBody.innerHTML = `<tr><td colspan="6">Error: ${data ? data.error : 'Could not load data.'}</td></tr>`;
//             return;
//         }
//         data.forEach(row => {
//             const tr = document.createElement('tr');
//             tr.innerHTML = `
//                 <td>${row.eds || ''}</td>
//                 <td>${row['Operator name'] || ''}</td>
//                 <td>${row['TL Name'] || ''}</td>
//                 <td>${row.Records || 0}</td>
//                 <td>${row.Hours || 0}</td>
//                 <td>${row.Shipment || ''}</td>
//             `;
//             tableBody.appendChild(tr);
//         });
//     }
// });


$(function() {
    // Initialize the date range picker
    $('#date-range-picker').daterangepicker({
        opens: 'left',
        startDate: moment().subtract(7, 'days'),
        endDate: moment(),
        locale: {
            format: 'MMM D, YYYY'
        },
        ranges: {
           'Today': [moment(), moment()],
           'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           'Last 7 Days': [moment().subtract(6, 'days'), moment()],
           'Last 30 Days': [moment().subtract(29, 'days'), moment()],
           'This Month': [moment().startOf('month'), moment().endOf('month')],
           'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, function(start, end, label) {
        $('#date-range-picker').val(start.format('MMM D, YYYY') + ' — ' + end.format('MMM D, YYYY'));
    });

    // --- Table Sorting and Filtering Logic ---
    const tableBody = document.querySelector('.data-table tbody');
    const tableHeaders = document.querySelectorAll('.data-table th');

    // Sample data with new filter properties
    const employeeData = [
        { name: "Allie Rucker", site: "site-a", tl: "tl-smith", projects: "project-x", inbound: 73, inboundTrend: 73, serviceLevel: "98.75%", slTrend: "97.25%", answered: 72, answeredTrend: 70, answeredPercent: "98.64%", unanswered: 2, unansweredTrend: 1, unansweredPercent: "94.50%", inboundCC: "" },
        { name: "Bob Katz", site: "site-b", tl: "tl-jones", projects: "project-y", inbound: 55, inboundTrend: 55, serviceLevel: "97.25%", slTrend: "94.00%", answered: 53, answeredTrend: 50, answeredPercent: "96.37%", unanswered: 3, unansweredTrend: 5, unansweredPercent: "91.25%", inboundCC: "" },
        { name: "Hannah Campbell", site: "site-a", tl: "tl-smith", projects: "project-z", inbound: 67, inboundTrend: 67, serviceLevel: "94.25%", slTrend: "95.50%", answered: 64, answeredTrend: 63, answeredPercent: "95.52%", unanswered: 1, unansweredTrend: 2, unansweredPercent: "97.75%", inboundCC: "" },
        { name: "Henry Green", site: "site-c", tl: "tl-williams", projects: "project-x", inbound: 32, inboundTrend: 32, serviceLevel: "100%", slTrend: "98.75%", answered: 30, answeredTrend: 28, answeredPercent: "93.75%", unanswered: 2, unansweredTrend: 2, unansweredPercent: "96.75%", inboundCC: "" },
        { name: "Jasmine Welder", site: "site-b", tl: "tl-jones", projects: "project-z", inbound: 56, inboundTrend: 56, serviceLevel: "97.50%", slTrend: "98.75%", answered: 53, answeredTrend: 53, answeredPercent: "94.64%", unanswered: "-", unansweredTrend: 2, unansweredPercent: "91.00%", inboundCC: "" },
        { name: "Jessica Hawk", site: "site-a", tl: "tl-smith", projects: "project-y", inbound: 28, inboundTrend: 28, serviceLevel: "99.25%", slTrend: "98.75%", answered: 27, answeredTrend: 24, answeredPercent: "96.43%", unanswered: 3, unansweredTrend: 3, unansweredPercent: "93.25%", inboundCC: "" },
        { name: "John Wilson", site: "site-c", tl: "tl-williams", projects: "project-z", inbound: 35, inboundTrend: 35, serviceLevel: "98.75%", slTrend: "99.50%", answered: 34, answeredTrend: 33, answeredPercent: "97.14%", unanswered: 1, unansweredTrend: 4, unansweredPercent: "94.75%", inboundCC: "" },
        { name: "Jordan Young", site: "site-b", tl: "tl-jones", projects: "project-x", inbound: 76, inboundTrend: 76, serviceLevel: "95.25%", slTrend: "96.50%", answered: 73, answeredTrend: 68, answeredPercent: "96.05%", unanswered: 5, unansweredTrend: 2, unansweredPercent: "89.50%", inboundCC: "" },
        { name: "Karey Nguyen", site: "site-a", tl: "tl-smith", projects: "project-y", inbound: 61, inboundTrend: 61, serviceLevel: "97.50%", slTrend: "98.25%", answered: 60, answeredTrend: 58, answeredPercent: "98.36%", unanswered: 2, unansweredTrend: 3, unansweredPercent: "96.25%", inboundCC: "" },
        { name: "Karl Thompson", site: "site-c", tl: "tl-williams", projects: "project-z", inbound: 50, inboundTrend: 50, serviceLevel: "82.25%", slTrend: "91.75%", answered: 46, answeredTrend: 40, answeredPercent: "92.00%", unanswered: 6, unansweredTrend: 3, unansweredPercent: "98.00%", inboundCC: "" },
    ];

    // Functions for rendering and sorting remain the same
    function renderTable(data) {
        tableBody.innerHTML = '';
        data.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="employee-cell">
                    <img src="https://via.placeholder.com/30" alt="${employee.name}">
                    <span>${employee.name}</span>
                </td>
                <td>${employee.inbound}</td>
                <td>${employee.inboundTrend}</td>
                <td>${employee.serviceLevel}</td>
                <td>${employee.slTrend}</td>
                <td>${employee.answered}</td>
                <td>${employee.answeredTrend}</td>
                <td>${employee.answeredPercent}</td>
                <td>${employee.unanswered}</td>
                <td>${employee.unansweredTrend}</td>
                <td>${employee.unansweredPercent}</td>
                <td>${employee.inboundCC}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    renderTable(employeeData);

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.getAttribute('data-sort-by');
            const sortOrder = header.getAttribute('data-sort-order') === 'desc' ? 'asc' : 'desc';
            tableHeaders.forEach(h => h.removeAttribute('data-sort-order'));
            header.setAttribute('data-sort-order', sortOrder);

            const sortedData = [...employeeData].sort((a, b) => {
                const aVal = a[sortBy.replace(/-/g, '')];
                const bVal = b[sortBy.replace(/-/g, '')];

                if (typeof aVal === 'string' && aVal.includes('%')) {
                    const aNum = parseFloat(aVal.replace('%', ''));
                    const bNum = parseFloat(bVal.replace('%', ''));
                    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
                }
                
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            });
            renderTable(sortedData);
        });
    });

    // --- New Filter Logic ---
    const filterBtn = document.querySelector('.control-btn');
    const filterPanel = document.getElementById('filter-panel');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const clearFiltersBtn = document.querySelector('.clear-filters-btn');
    const pillboxContainer = document.querySelector('.pillbox-container');

    // Toggle filter panel visibility
    filterBtn.addEventListener('click', () => {
        filterPanel.style.display = filterPanel.style.display === 'block' ? 'none' : 'block';
    });

    // Apply filters and create pillbox tags
    applyFiltersBtn.addEventListener('click', () => {
        const filters = {
            site: document.getElementById('filter-site').value,
            tl: document.getElementById('filter-tl').value,
            projects: document.getElementById('filter-projects').value
        };

        // Clear existing dynamic pills
        const dynamicPills = document.querySelectorAll('.dynamic-pill');
        dynamicPills.forEach(pill => pill.remove());

        let filteredData = [...employeeData];

        // Apply filters
        for (const key in filters) {
            if (filters[key]) {
                filteredData = filteredData.filter(employee => employee[key] === filters[key]);
                
                // Create and add pillbox tag
                const pill = document.createElement('span');
                pill.classList.add('dynamic-pill');
                pill.innerHTML = `${key}: ${filters[key]} <span class="remove-pill">&times;</span>`;
                pill.setAttribute('data-filter-key', key);
                pillboxContainer.appendChild(pill);
            }
        }
        
        renderTable(filteredData);
    });

    // Remove individual pillbox tags and re-filter
    pillboxContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-pill')) {
            const pillToRemove = e.target.closest('.dynamic-pill');
            const keyToRemove = pillToRemove.getAttribute('data-filter-key');
            
            // Clear the corresponding select option
            document.getElementById(`filter-${keyToRemove}`).value = '';
            
            // Remove the pill and re-apply filters
            pillToRemove.remove();
            applyFiltersBtn.click();
        }
    });

    // Clear all filters
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filter-site').value = '';
        document.getElementById('filter-tl').value = '';
        document.getElementById('filter-projects').value = '';
        const dynamicPills = document.querySelectorAll('.dynamic-pill');
        dynamicPills.forEach(pill => pill.remove());
        renderTable(employeeData);
        filterPanel.style.display = 'none';
    });
});