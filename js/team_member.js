// Use 'var' to prevent SPA crash if script is re-loaded via router
var initTeamMemberView = function () {
    console.log('=== TEAM MEMBER INITIALIZING ===');
    
    const select = document.getElementById("teamSelect");
    const tbody = document.querySelector("#team-table tbody");
    const container = document.querySelector('.export-buttons-container');
    
    if (!select || !tbody) return;

    // Clear previous options to prevent duplicates in SPA environment
    select.innerHTML = '<option value="" disabled selected>-- Select Supervisor --</option>';

    // Initialize Export Manager if exists
    if (typeof ExportManager !== 'undefined') {
        ExportManager.init({
            tableId: 'team-table',
            selectId: 'teamSelect',
            fetchUrl: 'fetch_data.php'
        });
    }

    // Populate dropdown
    fetch("fetch_data.php?action=list_names")
        .then(response => response.json())
        .then(data => {
            data.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                option.className = "dark:bg-slate-900";
                select.appendChild(option);
            });
        })
        .catch(error => console.error("Error loading team names:", error));

    // Handle Selection Change
    select.addEventListener("change", function () {
        const selectedName = select.value;
        tbody.innerHTML = "";

        if (!selectedName) return;

        // Show Loading UI
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="py-20 text-center">
                    <div class="inline-block w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p class="mt-4 text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Fetching Team Data...</p>
                </td>
            </tr>
        `;

        fetch(`fetch_data.php?action=filter&name=${encodeURIComponent(selectedName)}`)
            .then(response => response.json())
            .then(data => {
                tbody.innerHTML = ""; 

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-slate-400 italic">No team members found.</td></tr>`;
                    return;
                }

                data.forEach(row => {
                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group";
                    
                    const tdClass = "px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap";
                    
                    // Logic for Status Badges
                    const status = (row.emp_status || 'ACTIVE').toUpperCase();
                    const statusClass = status === 'INACTIVE' 
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
                        : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';

                    tr.innerHTML = `
                        <td class="${tdClass} font-bold text-indigo-600 dark:text-indigo-400">${row.EDS}</td>
                        <td class="${tdClass}">${row.FULLNAME}</td>
                        <td class="${tdClass}">${row.PROJECT}</td>
                        <td class="${tdClass}">${row.POSITION}</td>
                        <td class="${tdClass}">${row.SITE}</td>
                        <td class="${tdClass}">${row.SUPERVISOR}</td>
                        <td class="px-6 py-4"><span class="${statusClass}">${status}</span></td>
                        <td class="${tdClass}">${row.DATEHIRED}</td>
                    `;
                    tbody.appendChild(tr);
                });

                // Update export buttons if ExportManager logic is used
                if (typeof updateExportButtonsState === 'function') {
                    updateExportButtonsState(selectedName);
                }
            })
            .catch(error => {
                tbody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-rose-500 font-bold">Error loading data.</td></tr>`;
            });
    });
};

// Auto-trigger if loaded directly
document.addEventListener("DOMContentLoaded", initTeamMemberView);