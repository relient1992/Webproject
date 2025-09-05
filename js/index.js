const sideMenu = document.querySelector("aside");
const menuBtn = document.querySelector("#menu-btn");
const closeBtn = document.querySelector("#close-btn");
const themeToggler = document.querySelector(".theme-toggler");

// Sidebar show
menuBtn.addEventListener('click', () => {
    sideMenu.style.display = 'block';
});

// Sidebar hide
closeBtn.addEventListener('click', () => {
    sideMenu.style.display = 'none';
});

// Theme toggle
themeToggler.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme-variables');
    themeToggler.querySelectorAll('span').forEach(span => {
        span.classList.toggle('active');
    });
});


