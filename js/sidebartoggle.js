/**
 * Sidebar Dropdown & Toggle Logic
 * Optimized for Tailwind CSS and SPA routing
 */

var initSidebarToggle = function() {
    // 1. Handle Parent Dropdown Clicks
    const dropdownParents = document.querySelectorAll('.sidebar .dropdown > .parent');
    
    dropdownParents.forEach(link => {
        // Remove any old listeners to prevent double-firing in SPA
        link.removeEventListener('click', handleDropdownToggle);
        link.addEventListener('click', handleDropdownToggle);
    });

    // 2. Handle Child Link Clicks (Navigation)
    const childLinks = document.querySelectorAll('.sidebar .child-dropdown a');
    childLinks.forEach(child => {
        child.removeEventListener('click', handleChildClick);
        child.addEventListener('click', handleChildClick);
    });
};

function handleDropdownToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    const parentDropdown = this.parentElement;
    const childMenu = parentDropdown.querySelector('.child-dropdown');
    const indicator = this.querySelector('.dropdown-indicator');

    // Close all other dropdowns
    document.querySelectorAll('.sidebar .dropdown').forEach(dropdown => {
        if (dropdown !== parentDropdown) {
            dropdown.classList.remove('active');
            const otherMenu = dropdown.querySelector('.child-dropdown');
            const otherIndicator = dropdown.querySelector('.dropdown-indicator');
            if (otherMenu) otherMenu.style.display = 'none';
            if (otherIndicator) otherIndicator.style.transform = 'rotate(0deg)';
        }
    });

    // Toggle Current Dropdown
    const isActive = parentDropdown.classList.toggle('active');
    
    if (childMenu) {
        childMenu.style.display = isActive ? 'block' : 'none';
    }
    
    if (indicator) {
        indicator.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
        indicator.style.transition = 'transform 0.2s ease';
    }
}

function handleChildClick(e) {
    // Prevent the parent dropdown from closing when clicking a child
    e.stopPropagation();

    // Remove active state from all other child links
    document.querySelectorAll('.sidebar .child-dropdown a').forEach(link => {
        link.classList.remove('text-primary', 'font-bold', 'bg-slate-100', 'dark:bg-slate-800');
    });

    // Add active styling to the clicked child
    this.classList.add('text-primary', 'font-bold', 'bg-slate-100', 'dark:bg-slate-800');
}

// Close dropdowns if clicking outside the sidebar
document.addEventListener('click', function(e) {
    if (!e.target.closest('.sidebar')) {
        document.querySelectorAll('.sidebar .dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
            const menu = dropdown.querySelector('.child-dropdown');
            const indicator = dropdown.querySelector('.dropdown-indicator');
            if (menu) menu.style.display = 'none';
            if (indicator) indicator.style.transform = 'rotate(0deg)';
        });
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initSidebarToggle);