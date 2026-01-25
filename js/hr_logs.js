document.addEventListener('DOMContentLoaded', function () {
    const API_URL = '../hr_dashboard_api.php';
    const getEl = (id) => document.getElementById(id);

    const viewLogsBtn = getEl('viewLogsBtn');
    const logsModal = getEl('logsModal');
    const logsTableBody = getEl('logsTableBody');
    const closeLogsModal = getEl('closeLogsModal');
    const logDateRangePickerEl = getEl('logDateRangePicker');
    const exportLogsBtn = getEl('exportLogsBtn');

    let logDateRangePicker;

    function initializeLogDatePicker() {
        if (logDateRangePickerEl && !logDateRangePicker) {
            logDateRangePicker = new Litepicker({
                element: logDateRangePickerEl,
                singleMode: false,
                allowRepick: true,
                setup: (picker) => {
                    picker.on('selected', (date1, date2) => {
                        if (date1 && date2) {
                            fetchAndDisplayLogs();
                        }
                    });
                }
            });
        }
    }

    async function fetchAndDisplayLogs() {
        const startDate = logDateRangePicker?.getStartDate()?.toJSDate().toISOString().slice(0, 10);
        const endDate = logDateRangePicker?.getEndDate()?.toJSDate().toISOString().slice(0, 10);

        let logUrl = `${API_URL}?action=getSystemLogs`;
        const params = new URLSearchParams();

        if (startDate && endDate) {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
        }
        
        const queryString = params.toString();
        if (queryString) {
            logUrl += `&${queryString}`;
        }
        
        logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">Loading logs...</td></tr>`;

        try {
            const response = await fetch(logUrl);
            if (!response.ok) throw new Error('Failed to fetch logs from server.');
            const logs = await response.json();

            let logsHTML = '';
            if (logs.length > 0) {
                logs.forEach(log => {
                    logsHTML += `<tr class="border-b hover:bg-gray-50"><td class="px-6 py-4 whitespace-nowrap">${log.timestamp}</td><td class="px-6 py-4">${log.username}</td><td class="px-6 py-4 font-semibold">${log.action_type}</td><td class="px-6 py-4">${log.action_description}</td></tr>`;
                });
            } else {
                logsHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">No system logs found for the selected period.</td></tr>`;
            }
            logsTableBody.innerHTML = logsHTML;

        } catch (error) {
            logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-500">${error.message}</td></tr>`;
        }
    }

    function openLogsModal() {
        if(logDateRangePicker) logDateRangePicker.clearSelection();
        initializeLogDatePicker();
        if(logsModal) logsModal.classList.remove('hidden');
        fetchAndDisplayLogs();
    }

    async function exportLogData() {
        exportLogsBtn.disabled = true;
        exportLogsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
        
        try {
            const startDate = logDateRangePicker?.getStartDate()?.toJSDate().toISOString().slice(0, 10);
            const endDate = logDateRangePicker?.getEndDate()?.toJSDate().toISOString().slice(0, 10);
            
            let exportUrl = `${API_URL}?action=getSystemLogs&limit=none`;
            if (startDate && endDate) {
                exportUrl += `&start_date=${startDate}&end_date=${endDate}`;
            }

            const response = await fetch(exportUrl);
            if (!response.ok) throw new Error('Failed to fetch log data for export.');
            const logs = await response.json();

            if (logs.length === 0) {
                alert('No log data found for the selected period to export.');
                return; 
            }

            const headers = Object.keys(logs[0]);
            // CORRECTED: Start with just the header row, not the data URI prefix.
            let csvContent = headers.join(",") + "\n";

            logs.forEach(log => {
                const row = headers.map(header => {
                    let cellData = log[header] === null || log[header] === undefined ? '' : String(log[header]);
                    cellData = cellData.replace(/(\r\n|\n|\r)/gm, " "); 
                    cellData = cellData.replace(/"/g, '""');
                    return `"${cellData}"`;
                });
                csvContent += row.join(",") + "\n";
            });

            // CORRECTED: Use the Blob method for a robust download.
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "hr_system_logs_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // --- NEW: LOG THIS ACTION TOO ---
            // We use a simple fire-and-forget fetch here since we are inside the logs module
            const formData = new FormData();
            formData.append('description', 'Exported System Activity Logs.');
            fetch(`${API_URL}?action=log_manual_action`, { method: 'POST', body: formData });

        } catch (error) {
            alert('Export failed: ' + error.message);
        } finally {
            exportLogsBtn.disabled = false;
            exportLogsBtn.innerHTML = '<i class="fas fa-file-csv mr-2"></i>Export';
        }
    }
    
    if (viewLogsBtn) viewLogsBtn.addEventListener('click', openLogsModal);
    if (closeLogsModal) closeLogsModal.addEventListener('click', () => logsModal.classList.add('hidden'));
    if (exportLogsBtn) exportLogsBtn.addEventListener('click', exportLogData);
});

