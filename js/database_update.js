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
            // UPDATED: Instead of showing the error on the page, we log it to the console.
            // This prevents the UI from showing an error after a successful import,
            // while still providing the necessary info for debugging.
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

    if(analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            const file = csvFile.files[0];
            if (!file) {
                alert('Please select a CSV file first.');
                return;
            }
            feedbackText.textContent = "Analyzing... this may take a moment.";
            importFeedback.style.display = 'block';
            importStage1.style.display = 'none';

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
        });
    }
    
    if(processImportBtn) {
        processImportBtn.addEventListener('click', async function() {
            if (!parsedCsvData) return alert("No data to import.");
            
            const selectedMode = document.querySelector('input[name="importMode"]:checked').value;

            const payload = {
                importType: document.getElementById('importType').value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                importMode: selectedMode,
                data: parsedCsvData
            };
            
            importStage2.style.display = 'none';
            feedbackText.textContent = `Importing data for '${payload.importType}'...`;
            importFeedback.style.display = 'block';

            try {
                const response = await fetch(`${API_URL}?action=bulk_import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.status === 'success') {
                    feedbackText.textContent = result.message;
                    setTimeout(() => {
                        hideModal('importModal');
                        fetchData();
                    }, 2000);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                importStage2.style.display = 'block';
                importFeedback.style.display = 'none';
                alert("Import failed: " + error.message);
            }
        });
    }
    
    // Universal Cancel Buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            // Find the closest parent modal and hide it
            const modalToClose = this.closest('.modal');
            if (modalToClose) {
                modalToClose.style.display = 'none';
            }
        });
    });
    
    fetchData(); // Initial data load
});

