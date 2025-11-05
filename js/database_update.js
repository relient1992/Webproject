document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors ---
    const tableContainer = document.getElementById('table-container');
    const addNewBtn = document.getElementById('addNewBtn');

    // Add/Edit Modal Elements
    const dataModal = document.getElementById('dataModal');
    const modalTitle = document.getElementById('modalTitle');
    const dataForm = document.getElementById('dataForm');
    const recordIdInput = document.getElementById('recordId');

    // Import Modal Elements
    const importModal = document.getElementById('importModal');
    const importBtn = document.getElementById('importBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn'); // Make sure this has a unique ID if it exists
    const analyzeBtn = document.getElementById('analyzeBtn');
    const csvFile = document.getElementById('csvFile');
    const importStage1 = document.getElementById('import-stage-1');
    const importStage2 = document.getElementById('import-stage-2');
    const analysisResult = document.getElementById('analysisResult');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const processImportBtn = document.getElementById('processImportBtn');
    const importFeedback = document.getElementById('import-feedback');
    const feedbackText = document.getElementById('feedbackText');
    
    // Use the API path from your script
    const API_URL = '../database_update_api.php'; 

    let parsedCsvData = null;

    // --- Core Functions ---

    async function fetchData() {
        try {
            const response = await fetch(`${API_URL}?action=read`);
            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}. Server response: ${responseText}`);
            }
            
            let records;
            try {
                records = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse JSON. The full server response is printed below:");
                console.log(responseText);
                throw new Error("The server returned an invalid response (likely a PHP error). Check the developer console (F12) for the full server message.");
            }
            
            let tableHTML = '<table><thead><tr><th>Record ID</th><th>Metric Name</th><th>Value</th><th>Details</th><th>Prod Date</th><th>Actions</th></tr></thead><tbody>';
            if (records.length > 0) {
                records.forEach(record => {
                    const proddate = record.proddate || '';
                    tableHTML += `
                        <tr>
                            <td>${record.record_id}</td>
                            <td>${record.metric_name}</td>
                            <td>${record.metric_value}</td>
                            <td>${record.details}</td>
                            <td>${proddate}</td>
                            <td class="actions">
                                <button class="btn-edit" data-id="${record.record_id}">Edit</button>
                                <button class="btn-delete" data-id="${record.record_id}">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableHTML += '<tr><td colspan="6">No records found.</td></tr>';
            }
            tableHTML += '</tbody></table>';
            tableContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error("FetchData failed. This is likely a PHP error in the 'read' action. Full details below:");
            console.error(error.message);
        }
    }

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if(modal) modal.style.display = 'block';
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if(modal) modal.style.display = 'none';
    }
    
    function resetImportModal() {
        if(csvFile) csvFile.value = '';
        if(importStage1) importStage1.style.display = 'block';
        if(importStage2) importStage2.style.display = 'none';
        if(importFeedback) importFeedback.style.display = 'none';
        parsedCsvData = null;
    }

    // --- Event Handlers for CRUD Operations ---

    if (dataForm) {
        dataForm.addEventListener('submit', async function(e) {
            // ... (your existing code, no changes needed)
            e.preventDefault();
            const formData = new FormData(dataForm);
            const action = recordIdInput.value ? 'update' : 'create';
            formData.append('action', action);
            try {
                const response = await fetch(API_URL, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    hideModal('dataModal');
                    fetchData();
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                alert(`An error occurred: ${error.message}`);
            }
        });
    }

    if (tableContainer) {
        tableContainer.addEventListener('click', async function(e) {
            // ... (your existing code, no changes needed)
            const target = e.target;
            const id = target.dataset.id;
            if (target.classList.contains('btn-edit')) {
                try {
                    const response = await fetch(`${API_URL}?action=read_single&record_id=${id}`);
                    const record = await response.json();
                    if (record) {
                        recordIdInput.value = record.record_id;
                        document.getElementById('metric_name').value = record.metric_name;
                        document.getElementById('metric_value').value = record.metric_value;
                        document.getElementById('details').value = record.details;
                        modalTitle.textContent = 'Edit Record';
                        showModal('dataModal');
                    } else {
                        alert('Record not found.');
                    }
                } catch (error) {
                    alert(`Error fetching record details: ${error.message}`);
                }
            }
            if (target.classList.contains('btn-delete')) {
                if (confirm(`Are you sure you want to delete record ID ${id}?`)) {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'delete');
                        formData.append('record_id', id);
                        const response = await fetch(API_URL, { method: 'POST', body: formData });
                        const result = await response.json();
                        if (result.status === 'success') {
                            fetchData();
                        } else {
                            alert(`Error: ${result.message}`);
                        }
                    } catch (error) {
                        alert(`An error occurred: ${error.message}`);
                    }
                }
            }
        });
    }

    // --- General & CRUD Button Event Listeners ---
    
    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => {
             // ... (your existing code, no changes needed)
             if(dataForm) {
                dataForm.reset();
                recordIdInput.value = '';
                modalTitle.textContent = 'Add New Record';
                showModal('dataModal');
            }
        });
    }

    // --- CORRECTED & COMPLETE IMPORT FEATURE LOGIC ---

    if (importBtn) {
        importBtn.addEventListener('click', () => {
             resetImportModal();
             showModal('importModal');
        });
    }

    // --- UPDATED: 'Analyze' button handles both import types ---
    if(analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            const importType = document.getElementById('importType').value;
            const fileInput = document.getElementById('csvFile');
            
            if (fileInput.files.length === 0) {
                 alert('Please select a file (or files) first.');
                 return;
            }

            feedbackText.textContent = "Analyzing... this may take a moment.";
            importFeedback.style.display = 'block';
            importStage1.style.display = 'none';

            if (importType === 'efficiency_update') {
                // --- Efficiency Update: Multi-file, skip parsing ---
                analysisResult.textContent = `${fileInput.files.length} file(s) selected for import.`;
                
                // Clear any old parsed data
                parsedCsvData = null; 
                
                // Set default dates if empty, user must verify
                const today = new Date().toISOString().split('T')[0];
                if (!startDateInput.value) startDateInput.value = today;
                if (!endDateInput.value) endDateInput.value = today;
                
                importFeedback.style.display = 'none';
                importStage2.style.display = 'block';

            } else {
                // --- BPS Dashboard: Single-file, parse it ---
                if (fileInput.files.length > 1) {
                    alert('BPS Dashboard import only supports a single file. Please select only one.');
                    importFeedback.style.display = 'none';
                    importStage1.style.display = 'block';
                    return;
                }
                
                const file = fileInput.files[0];
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        parsedCsvData = results.data;
                        let minDate = null, maxDate = null;
                        for (const row of parsedCsvData) {
                            if (row.proddate) {
                                const currentDate = new Date(row.proddate);
                                if (!isNaN(currentDate.getTime())) {
                                    if (!minDate || currentDate < minDate) minDate = currentDate;
                                    if (!maxDate || currentDate > maxDate) maxDate = currentDate;
                                }
                            }
                        }
                        importFeedback.style.display = 'none';
                        if (minDate && maxDate) {
                            const toISODate = (date) => date.toISOString().split('T')[0];
                            analysisResult.textContent = `Date range found in file: ${toISODate(minDate)} to ${toISODate(maxDate)}.`;
                            startDateInput.value = toISODate(minDate);
                            endDateInput.value = toISODate(maxDate);
                            importStage2.style.display = 'block';
                        } else {
                            alert("Analysis failed. Could not find a valid 'proddate' column with recognizable dates.");
                            importStage1.style.display = 'block';
                        }
                    },
                    error: function(err) {
                        importFeedback.style.display = 'none';
                        importStage1.style.display = 'block';
                        alert("Error parsing CSV: " + err.message);
                    }
                });
            }
        });
    }
    
    // --- UPDATED: 'Process Import' button handles both import types ---
    if(processImportBtn) {
        processImportBtn.addEventListener('click', async function() {
            
            const importType = document.getElementById('importType').value;
            const fileInput = document.getElementById('csvFile');
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            const importMode = document.querySelector('input[name="importMode"]:checked').value;

            if (!startDate || !endDate) {
                alert('Start and End date are required.');
                return;
            }
            
            importStage2.style.display = 'none';
            feedbackText.textContent = `Importing data for '${importType}'...`;
            importFeedback.style.display = 'block';

            try {
                let response;
                let result;

                if (importType === 'efficiency_update') {
                    // --- NEW: Efficiency Update (Multi-file FormData) ---
                    if (fileInput.files.length === 0) {
                        throw new Error('No files selected for import.');
                    }
                    
                    const formData = new FormData();
                    formData.append('importMode', importMode);
                    formData.append('startDate', startDate);
                    formData.append('endDate', endDate);

                    // Append all files
                    for (let i = 0; i < fileInput.files.length; i++) {
                        // The '[]' is critical for PHP to receive an array
                        formData.append('csvFiles[]', fileInput.files[i], fileInput.files[i].name);
                    }

                    // Fetch to the new action
                    response = await fetch(`${API_URL}?action=bulk_import_multi_csv`, {
                        method: 'POST',
                        body: formData
                        // No Content-Type header needed; browser sets it for FormData
                    });
                    
                    result = await response.json();
                    if (result.status !== 'success') throw new Error(result.message);
                    
                    console.log(result.details); // Log details for debugging

                } else {
                    // --- OLD: BPS Dashboard (Single-file JSON) ---
                    if (!parsedCsvData) {
                        throw new Error("No data to import. Please analyze a file first.");
                    }
                    
                    const payload = {
                        importType: importType,
                        startDate: startDate,
                        endDate: endDate,
                        importMode: importMode,
                        data: parsedCsvData,
                        dateColumn: 'proddate' // Hard-code for BPS Dashboard
                    };
                    
                    // Fetch to the original CSV action
                    // This MUST match the action in your PHP 'switch' statement
                    response = await fetch(`${API_URL}?action=bulk_import_csv`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    result = await response.json();
                    if (result.status !== 'success') throw new Error(result.message);
                }

                // --- Common Success Handling ---
                feedbackText.textContent = result.message; // Show success message
                setTimeout(() => {
                    hideModal('importModal');
                    fetchData(); // Refresh the main table
                }, 2000);

            } catch (error) {
                // --- Common Error Handling ---
                importStage2.style.display = 'block'; // Show controls again
                importFeedback.style.display = 'none';
                alert("Import failed: " + error.message);
            }
        });
    }
    
    // Universal Cancel Buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            // ... (your existing code, no changes needed)
            const modalToClose = this.closest('.modal');
            if (modalToClose) {
                modalToClose.style.display = 'none';
            }
        });
    });
    
    fetchData(); // Initial data load
});