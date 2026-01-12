document.addEventListener('DOMContentLoaded', function () {
    // Wait for the main dashboard script to be ready
    if (typeof window.dashboardGlobals === 'undefined') {
        console.error("Main dashboard script (hr_dashboard.js) must be loaded first.");
        return;
    }

    // --- GLOBAL STATE & HELPERS ---
    const { getApiUrl, getDropdownData, refreshAllData, getCurrentView, getFilteredIds } = window.dashboardGlobals;
    const API_URL = getApiUrl();
    
    // We will share the selection state with the main script if possible, 
    // or maintain a local one that syncs with the UI.
    let selectedApplicants = [];

    // --- ELEMENT SELECTORS ---
    const getEl = (id) => document.getElementById(id);
    const tableHead = getEl('tableHead');
    const tableBody = getEl('tableBody');
    const bulkActionContainer = getEl('bulkActionContainer'); // Ensure this ID exists in your HTML
    const selectionCount = getEl('selectionCount');
    const bulkStatusSelect = getEl('bulkStatusSelect'); // Ensure this ID exists (the dropdown)
    const bulkApplyBtn = getEl('bulkApplyBtn'); // Ensure this ID exists (the button)

    // --- FUNCTIONS ---

    function renderBulkActionContainer() {
        const currentView = getCurrentView();
        
        // Hide bulk actions if not in Active view
        if (currentView !== 'active') {
            if(bulkActionContainer) bulkActionContainer.classList.add('hidden');
            return;
        }

        if (selectedApplicants.length > 0) {
            if(selectionCount) selectionCount.textContent = selectedApplicants.length;
            
            // Populate status dropdown if not already populated and if it exists
            if (bulkStatusSelect && bulkStatusSelect.options.length <= 1) {
                const dropdownData = getDropdownData();
                const statuses = dropdownData.statuses || {};
                
                bulkStatusSelect.innerHTML = '<option value="">- Select Status -</option>';
                Object.entries(statuses).forEach(([id, name]) => {
                    bulkStatusSelect.innerHTML += `<option value="${id}">${name}</option>`;
                });
            }
            if(bulkActionContainer) bulkActionContainer.classList.remove('hidden');
        } else {
            if(bulkActionContainer) bulkActionContainer.classList.add('hidden');
            
            // Uncheck the "select all" box if no items are selected
            const selectAll = getEl('selectAllCheckbox');
            if (selectAll) selectAll.checked = false;
        }
    }

    // Make this function globally accessible for the main script to call on render
    window.renderBulkActionContainer = renderBulkActionContainer;

    async function handleBulkUpdate() {
        // Validation: Status Selected?
        const newStatusId = bulkStatusSelect ? bulkStatusSelect.value : null;
        if (!newStatusId) {
            return Swal.fire({
                icon: 'warning',
                title: 'No Status Selected',
                text: 'Please select a status to apply from the dropdown.',
                confirmButtonColor: '#3b82f6'
            });
        }

        // Validation: Applicants Selected?
        if (selectedApplicants.length === 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select at least one applicant.',
                confirmButtonColor: '#3b82f6'
            });
        }
        
        const newStatusName = bulkStatusSelect.options[bulkStatusSelect.selectedIndex].text;

        // Confirmation Dialog
        Swal.fire({
            title: 'Update Multiple Applicants?',
            text: `You are about to change the status of ${selectedApplicants.length} applicants to "${newStatusName}".`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, apply update',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // UI Loading State
                if(bulkApplyBtn) {
                    bulkApplyBtn.disabled = true;
                    bulkApplyBtn.textContent = 'Applying...';
                }
                
                // Show Spinner Alert
                Swal.fire({
                    title: 'Processing...',
                    text: 'Updating applicant records.',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                try {
                    const response = await fetch(`${API_URL}?action=bulkUpdateStatus`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            application_ids: selectedApplicants,
                            new_status: parseInt(newStatusId)
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.status !== 'success') throw new Error(result.message);
                    
                    // Success Notification
                    Swal.fire({
                        icon: 'success',
                        title: 'Batch Update Complete',
                        text: result.message,
                        timer: 2000,
                        showConfirmButton: false
                    });

                    selectedApplicants = []; // Clear local selection
                    if(bulkStatusSelect) bulkStatusSelect.value = ""; // Reset dropdown
                    
                    await refreshAllData(); // Refresh table via main script
                    renderBulkActionContainer(); // Hide the bulk toolbar

                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: error.message || 'An unexpected error occurred.'
                    });
                } finally {
                    if(bulkApplyBtn) {
                        bulkApplyBtn.disabled = false;
                        bulkApplyBtn.textContent = 'Apply Status';
                    }
                }
            }
        });
    }

    // --- EVENT LISTENERS ---

    // 1. Listen for 'change' on the table body for individual checkboxes
    if (tableBody) {
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
    }

    // 2. Listen for 'click' on the table head for the "select all" checkbox
    if (tableHead) {
        tableHead.addEventListener('click', e => {
            if (e.target.id === 'selectAllCheckbox') {
                const isChecked = e.target.checked;
                // Get IDs currently visible in the filtered table
                const visibleApplicantIds = getFilteredIds(); 
                
                if (isChecked) {
                    // Add all visible IDs to selection (avoid duplicates)
                    visibleApplicantIds.forEach(id => {
                        if (!selectedApplicants.includes(id)) selectedApplicants.push(id);
                    });
                } else {
                    // Remove all visible IDs from selection
                    // (We keep IDs that might be selected on other pages if you implement cross-page selection later,
                    // but for now, this logic clears the current view's selection)
                    selectedApplicants = selectedApplicants.filter(id => !visibleApplicantIds.includes(id));
                }
                
                // Visually update the checkboxes in the DOM
                document.querySelectorAll('.applicant-checkbox').forEach(checkbox => {
                    const id = parseInt(checkbox.dataset.id);
                    // Only toggle if it's part of the current filtered set
                    if (visibleApplicantIds.includes(id)) {
                        checkbox.checked = isChecked;
                    }
                });

                renderBulkActionContainer();
            }
        });
    }

    // 3. Listen for 'click' on the apply button
    if (bulkApplyBtn) {
        bulkApplyBtn.addEventListener('click', handleBulkUpdate);
    }

    // 4. Expose the selection array to the global scope if needed by other scripts
    // (Optional, but good for debugging)
    window.dashboardGlobals.getSelectedApplicants = () => selectedApplicants;
});