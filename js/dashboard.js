
$(function() { // Use jQuery's ready function

    // --- STATE MANAGEMENT ---
    const currentFilters = {
        dateRange: {
            start: null,
            end: null
        },
        projects: []
    };

    // --- ELEMENT REFERENCES ---
    const projectFilterBtn = $('#project-filter-btn');
    const projectFilterDropdown = $('#project-filter-dropdown');
    const applyProjectFilterBtn = $('#apply-project-filter');
    const selectedFiltersContainer = $('#selected-filters');
    const clearAllBtn = $('#clear-all-filters');


    // =========================================================================
    // == 1. DATE PICKER INITIALIZATION (Updated to default to Custom Range) ==
    // =========================================================================
    
    // MODIFIED: Set a default range that does NOT match a preset, like "Last 14 Days".
    // This forces the picker to open on the "Custom Range" view.
    const start = moment().subtract(13, 'days'); // Today is the 14th day.
    const end = moment();

    // The callback function that runs when a new date range is selected
    function cb(start, end) {
        // Update the text in the reportrange button
        $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));

        // Update our application's state object
        currentFilters.dateRange.start = start.toDate();
        currentFilters.dateRange.end = end.toDate();

        console.log("New date range selected:", currentFilters.dateRange);
        // In a real app, you would call a function to fetch new data here
        // applyAllFilters(); 
    }

    // Initialize the daterangepicker
    $('#reportrange').daterangepicker({
        startDate: start, // The default start date
        endDate: end,     // The default end date
        ranges: {
           'Today': [moment(), moment()],
           'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           'Last 7 Days': [moment().subtract(6, 'days'), moment()],
           'Last 30 Days': [moment().subtract(29, 'days'), moment()],
           'This Month': [moment().startOf('month'), moment()],
           'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, cb);

    // Call the callback to set the initial text and state
    cb(start, end);


    // --- 2. MULTI-SELECT FILTER LOGIC (Unchanged) ---

    projectFilterBtn.on('click', () => {
        projectFilterDropdown.toggleClass('hidden');
    });

    applyProjectFilterBtn.on('click', () => {
        const selectedCheckboxes = projectFilterDropdown.find('input[name="project"]:checked');
        currentFilters.projects = $.map(selectedCheckboxes, (cb) => $(cb).val());
        projectFilterDropdown.addClass('hidden');
        renderFilterChips();
        console.log("Applied project filters:", currentFilters.projects);
        // applyAllFilters();
    });

    function renderFilterChips() {
        selectedFiltersContainer.empty();
        currentFilters.projects.forEach(project => {
            const chip = $(`<div class="filter-chip" data-value="${project}"><span>${project}</span><span class="remove-chip" title="Remove filter">&times;</span></div>`);
            selectedFiltersContainer.append(chip);
        });
        if (currentFilters.projects.length > 0) {
            clearAllBtn.removeClass('hidden');
        } else {
            clearAllBtn.addClass('hidden');
        }
    }

    selectedFiltersContainer.on('click', '.remove-chip', function() {
        const chip = $(this).closest('.filter-chip');
        const projectToRemove = chip.data('value');
        currentFilters.projects = currentFilters.projects.filter(p => p !== projectToRemove);
        projectFilterDropdown.find(`input[value="${projectToRemove}"]`).prop('checked', false);
        renderFilterChips();
        console.log("Removed filter:", projectToRemove);
        // applyAllFilters();
    });

    clearAllBtn.on('click', () => {
        currentFilters.projects = [];
        projectFilterDropdown.find('input[name="project"]:checked').prop('checked', false);
        renderFilterChips();
        console.log("All filters cleared.");
        // applyAllFilters();
    });

    $(document).on('click', (event) => {
        if (!projectFilterBtn.is(event.target) && projectFilterBtn.has(event.target).length === 0 &&
            !projectFilterDropdown.is(event.target) && projectFilterDropdown.has(event.target).length === 0) {
            projectFilterDropdown.addClass('hidden');
        }
    });

});