document.addEventListener('DOMContentLoaded', () => {
    const filterElements = {
        location: document.getElementById('location-filter'),
        project: document.getElementById('project-filter'),
        weekending: document.getElementById('weekending-filter'),
        platform: document.getElementById('platform-filter'),
        proddate: document.getElementById('proddate-filter'),
        process: document.getElementById('process-filter'),
        tl: document.getElementById('tl-filter'),
        taskname: document.getElementById('taskname-filter'),
        operator: document.getElementById('operator-filter'),
        taskproject: document.getElementById('taskproject-filter')
    };

    const applyButton = document.getElementById('apply-filters');
    const resetButton = document.getElementById('reset-filters');
    const tableBody = document.getElementById('dashboard-table-body');

    let recordsChart, hoursChart;

    // Fetch initial data and populate filters
    fetchData().then(initialData => {
        populateFilters(initialData);
        updateDashboard(initialData);
    });

    // Event Listeners
    applyButton.addEventListener('click', () => {
        const filters = getSelectedFilters();
        fetchData(filters).then(updateDashboard);
    });

    resetButton.addEventListener('click', () => {
        Object.values(filterElements).forEach(el => {
            if (el.type === 'select-multiple') {
                Array.from(el.options).forEach(option => option.selected = false);
            } else {
                el.value = '';
            }
        });
        fetchData().then(updateDashboard);
    });

    // Functions
    async function fetchData(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const response = await fetch(`fetch_data.php?${query}`);
        return await response.json();
    }

    function populateFilters(data) {
        const filterOptions = {
            Location: new Set(),
            'Primary Project': new Set(),
            Weekending: new Set(),
            Platform: new Set(),
            'Firefly Process': new Set(),
            'TL Name': new Set(),
            Taskname: new Set(),
            'Operator name': new Set(),
            'Task PROJECT': new Set()
        };

        data.forEach(row => {
            // Use the exact column names from your database
            if (row['Location']) filterOptions.Location.add(row['Location']);
            if (row['Primary Project']) filterOptions['Primary Project'].add(row['Primary Project']);
            if (row['Weekending']) filterOptions.Weekending.add(row['Weekending']);
            if (row['Platform']) filterOptions.Platform.add(row['Platform']);
            if (row['Firefly Process']) filterOptions['Firefly Process'].add(row['Firefly Process']);
            if (row['TL Name']) filterOptions['TL Name'].add(row['TL Name']);
            if (row['Taskname']) filterOptions.Taskname.add(row['Taskname']);
            if (row['Operator name']) filterOptions['Operator name'].add(row['Operator name']);
            if (row['Task PROJECT']) filterOptions['Task PROJECT'].add(row['Task PROJECT']);
        });

        // Populate dropdowns
        filterElements.location.innerHTML = [...filterOptions.Location].map(v => `<option>${v}</option>`).join('');
        filterElements.project.innerHTML = [...filterOptions['Primary Project']].map(v => `<option>${v}</option>`).join('');
        filterElements.weekending.innerHTML = [...filterOptions.Weekending].map(v => `<option>${v}</option>`).join('');
        filterElements.platform.innerHTML = [...filterOptions.Platform].map(v => `<option>${v}</option>`).join('');
        filterElements.process.innerHTML = [...filterOptions['Firefly Process']].map(v => `<option>${v}</option>`).join('');
        filterElements.tl.innerHTML = [...filterOptions['TL Name']].map(v => `<option>${v}</option>`).join('');
        filterElements.taskname.innerHTML = [...filterOptions.Taskname].map(v => `<option>${v}</option>`).join('');
        filterElements.operator.innerHTML = [...filterOptions['Operator name']].map(v => `<option>${v}</option>`).join('');
        filterElements.taskproject.innerHTML = [...filterOptions['Task PROJECT']].map(v => `<option>${v}</option>`).join('');
    }

    function getSelectedFilters() {
        const filters = {};
        Object.entries(filterElements).forEach(([key, el]) => {
            if (el.type === 'select-multiple') {
                const selected = [...el.selectedOptions].map(opt => opt.value);
                // Use the label text as the key for the query parameter
                if (selected.length) filters[el.labels[0].innerText] = selected.join(',');
            } else if (el.value) {
                filters[el.labels[0].innerText] = el.value;
            }
        });
        return filters;
    }

    function updateDashboard(data) {
        updateCharts(data);
        updateTable(data);
    }

    function updateCharts(data) {
        const operatorData = {};
        data.forEach(row => {
            const operator = row['Operator name'];
            if (!operatorData[operator]) {
                operatorData[operator] = { records: 0, hours: 0 };
            }
            operatorData[operator].records += parseFloat(row.Records) || 0;
            operatorData[operator].hours += parseFloat(row.Hours) || 0;
        });

        const labels = Object.keys(operatorData);
        const records = labels.map(l => operatorData[l].records);
        const hours = labels.map(l => operatorData[l].hours);

        // Records Chart
        if (recordsChart) recordsChart.destroy();
        recordsChart = new Chart(document.getElementById('records-chart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Total Records',
                    data: records,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)'
                }]
            }
        });

        // Hours Chart
        if (hoursChart) hoursChart.destroy();
        hoursChart = new Chart(document.getElementById('hours-chart'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    label: 'Total Hours',
                    data: hours,
                    backgroundColor: ['#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#34495e', '#1abc9c', '#e67e22']
                }]
            }
        });
    }

    function updateTable(data) {
        tableBody.innerHTML = '';
        if (!data || data.error) {
            tableBody.innerHTML = `<tr><td colspan="6">Error: ${data ? data.error : 'Could not load data.'}</td></tr>`;
            return;
        }
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.eds || ''}</td>
                <td>${row['Operator name'] || ''}</td>
                <td>${row['TL Name'] || ''}</td>
                <td>${row.Records || 0}</td>
                <td>${row.Hours || 0}</td>
                <td>${row.Shipment || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
});
