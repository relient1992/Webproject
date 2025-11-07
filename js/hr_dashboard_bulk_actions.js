document.addEventListener('DOMContentLoaded', function () {
    // Wait for the main dashboard script to be ready
    if (typeof window.dashboardGlobals === 'undefined') {
        console.error("Main dashboard script (hr_dashboard.js) must be loaded first.");
        return;
    }

    // --- GLOBAL STATE & HELPERS ---
    const { getApiUrl, getDropdownData, refreshAllData, getCurrentView, getFilteredIds } = window.dashboardGlobals;
    const API_URL = getApiUrl();
    let selectedApplicants = [];

    // --- ELEMENT SELECTORS ---
    const getEl = (id) => document.getElementById(id);
    const tableHead = getEl('tableHead');
    const tableBody = getEl('tableBody');
    const bulkActionContainer = getEl('bulkActionContainer');
    const selectionCount = getEl('selectionCount');
    const bulkStatusSelect = getEl('bulkStatusSelect');
    const bulkApplyBtn = getEl('bulkApplyBtn');

    // --- FUNCTIONS ---

    function renderBulkActionContainer() {
        const currentView = getCurrentView();
        if (currentView !== 'active') {
            bulkActionContainer.classList.add('hidden');
            return;
        }

        if (selectedApplicants.length > 0) {
            selectionCount.textContent = selectedApplicants.length;
            
            // Populate status dropdown if not already populated
            if (bulkStatusSelect.options.length <= 1) {
                const { statuses } = getDropdownData();
                bulkStatusSelect.innerHTML = '<option value="">- Select Status to Apply -</option>';
                Object.entries(statuses).forEach(([id, name]) => {
                    bulkStatusSelect.innerHTML += `<option value="${id}">${name}</option>`;
                });
            }
            bulkActionContainer.classList.remove('hidden');
        } else {
            bulkActionContainer.classList.add('hidden');
            // Uncheck the "select all" box if no items are selected
            const selectAll = getEl('selectAllCheckbox');
            if (selectAll) selectAll.checked = false;
        }
    }
    // Make this function globally accessible for the main script
    window.renderBulkActionContainer = renderBulkActionContainer;


    async function handleBulkUpdate() {
        const newStatusId = bulkStatusSelect.value;
        if (!newStatusId) {
            alert('Please select a status to apply.');
            return;
        }
        if (selectedApplicants.length === 0) {
            alert('No applicants selected.');
            return;
        }
        
        const newStatusName = bulkStatusSelect.options[bulkStatusSelect.selectedIndex].text;

        if (confirm(`Are you sure you want to change the status of ${selectedApplicants.length} applicants to "${newStatusName}"?`)) {
            bulkApplyBtn.disabled = true;
            bulkApplyBtn.textContent = 'Applying...';
            try {
                const response = await fetch(`${API_URL}?action=bulkUpdateStatus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        application_ids: selectedApplicants,
                        new_status: newStatusId
                    })
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                
                alert(`Successfully updated ${selectedApplicants.length} applicants.`);
                selectedApplicants = []; // Clear selection
                await refreshAllData(); // Refresh all data and UI
            } catch (error) {
                alert('Bulk update failed: ' + error.message);
            } finally {
                bulkApplyBtn.disabled = false;
                bulkApplyBtn.textContent = 'Apply Status';
                renderBulkActionContainer();
            }
        }
    }

    // --- EVENT LISTENERS ---

    // Listen for 'change' on the table body for individual checkboxes
    tableBody.addEventListener('change', e => {
        if (e.target.classList.contains('applicant-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                if (!selectedApplicants.includes(id)) selectedApplicants.push(id);
            } else {
                selectedApplicants = selectedApplicants.filter(appId => appId !== id);
            }
            renderBulkActionContainer();
        }
    });

    // Listen for 'click' on the table head for the "select all" checkbox
    tableHead.addEventListener('click', e => {
        if (e.target.id === 'selectAllCheckbox') {
            const isChecked = e.target.checked;
            const visibleApplicantIds = getFilteredIds(); // Get IDs of *visible* applicants
            
            // Clear selection first
            selectedApplicants = [];
            
            // Select/deselect only the visible checkboxes
            document.querySelectorAll('.applicant-checkbox').forEach(checkbox => {
                const id = parseInt(checkbox.dataset.id);
                if (visibleApplicantIds.includes(id)) {
                    checkbox.checked = isChecked;
                    if (isChecked) {
                        selectedApplicants.push(id);
                    }
                } else {
                     // Ensure checkboxes on other pages are unchecked
                    checkbox.checked = false;
                }
            });
            renderBulkActionContainer();
        }
    });

    // Listen for 'click' on the apply button
    if (bulkApplyBtn) {
        bulkApplyBtn.addEventListener('click', handleBulkUpdate);
    }

});

