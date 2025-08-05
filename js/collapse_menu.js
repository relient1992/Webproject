document.addEventListener('DOMContentLoaded', function () {
    const collapseBtn = document.getElementById('collapse-btn');
    const body = document.body;
  
    collapseBtn.addEventListener('click', () => {
      body.classList.toggle('sidebar-collapsed');
  
      const indicators = document.querySelectorAll('.dropdown-indicator');
      const childdropdowns = document.querySelectorAll('.child-dropdown');
  
      // Handle indicators
      indicators.forEach(indicator => {
        indicator.style.display = body.classList.contains('sidebar-collapsed') ? 'none' : '';
      });
  
      // Handle child dropdowns
      childdropdowns.forEach(child => {
        child.style.display = body.classList.contains('sidebar-collapsed') ? 'none' : '';
      });
    });
  });