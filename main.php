<?php
session_start();  // Start the session

$firstname = $_SESSION['firstname'] ?? 'Guest';
$position = $_SESSION['position'] ?? 'Unknown';

$role = isset($_SESSION['user_role']) ? $_SESSION['user_role'] : 'Guest';
// Prevent browser caching
header("Cache-Control: no-cache, no-store, must-revalidate"); // HTTP 1.1
header("Pragma: no-cache"); // HTTP 1.0
header("Expires: 0"); // Proxies

// Check if user is logged in (session variable exists)
if (!isset($_SESSION['employee_id'])) {
    // Redirect to login page if not logged in
    header('Location: index.html');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exela Local Website</title>
    
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Sharp" rel="stylesheet">
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Configure Tailwind to hook into your existing dark theme JS toggle
        tailwind.config = {
            darkMode: ['class', '.dark-theme-variables'],
            theme: {
                extend: {
                    colors: {
                        primary: '#1d4ed8', // Blue-700
                        danger: '#ef4444',  // Red-500
                    }
                }
            }
        }
    </script>

    <style type="text/tailwindcss">
        @layer utilities {
            /* Handles the loading screen spinner */
            .spinner {
                @apply w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4;
            }
            /* Handles sidebar active state toggled by your JS router */
            .sidebar .Active {
                @apply bg-blue-50 text-primary border-l-4 border-primary dark:bg-slate-800 dark:text-blue-400 dark:border-blue-400;
            }
            .sidebar .Active .material-icons-sharp {
                @apply text-primary dark:text-blue-400;
            }
            /* Theme toggler active state */
            .theme-toggler span.active {
                @apply bg-primary text-white rounded-md;
            }
            /* Dropdown logic (Assuming JS toggles display or a class. Default hidden) */
            .child-dropdown {
                display: none;
            }
            .child-dropdown.show {
                display: block;
            }
        }
        
        /* Hide scrollbar for sidebar but allow scrolling */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>

    <script>
        const USER_ROLE = <?php echo json_encode($role); ?>;
        sessionStorage.setItem("user_role", USER_ROLE);
        console.log("USER_ROLE set to:", USER_ROLE);
    </script>
</head>
<body class="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden dark:bg-slate-900 dark:text-slate-200 transition-colors duration-300">

    <aside id="sidebar-wrapper" class="w-72 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-30 dark:bg-slate-900 dark:border-slate-800 hidden md:flex flex-shrink-0">
        
        <div class="top flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
            <div class="logo font-bold text-xl tracking-wide text-primary dark:text-blue-400">
                XBP Global
            </div>
            <div class="flex gap-2">
                <button id="collapse-btn" class="hidden text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <span class="material-icons-sharp text-xl">menu_open</span>
                </button>
                <button id="close-btn" class="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <span class="material-icons-sharp text-xl">close</span>
                </button>
            </div>
        </div>

        <div class="sidebar flex-1 overflow-y-auto py-4 no-scrollbar">
            
            <a href="#" class="Active flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" data-view="active_attrition">
                <span class="material-icons-sharp text-[1.2rem]">group</span>
                <h3 class="flex-1">Active & Attrition</h3>
            </a>

            <a href="#" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" data-view="team_member">
                <span class="material-icons-sharp text-[1.2rem]">supervised_user_circle</span>
                <h3 class="flex-1">Team Member</h3>
            </a>

            <a href="./views/hr_dashboard.php" target="_blank" rel="noopener noreferrer" data-view="hr_dashboard.php" data-external="true" onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">build</span>
                <h3 class="flex-1">HR Dashboard</h3>
            </a>

            <a href="http://10.200.168.112:3001/" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">punch_clock</span>
                <h3 class="flex-1">ESS</h3>
            </a>

            <a href="./views/bps_overall_dashboard.php" target="_blank" rel="noopener noreferrer" data-view="bps_overall_dashboard.php" data-external="true" onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">dashboard</span>
                <h3 class="flex-1">BPS Overall Dashboard</h3>
            </a>

            <a href="./views/web_training.php" target="_blank" rel="noopener noreferrer" data-view="web_training.php" data-external="true" onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">build</span>
                <h3 class="flex-1">BPS Training Material</h3>
            </a>

            <div class="dropdown">
                <a href="#" class="parent flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                    <span class="material-icons-sharp text-[1.2rem]">money</span>
                    <h3 class="flex-1">BPS Production Reports</h3>
                    <span class="dropdown-indicator transition-transform duration-200">&#9662;</span>
                </a>
                <div class="child-dropdown bg-slate-50 dark:bg-slate-800/50 py-2">
                    <a href="#" data-view="bps_dashboard" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BPS Dashboard</a>
                    <a href="#" data-view="bps_bfp" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BPS BFP</a>
                    <a href="#" data-view="project_efficiency" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">Project Efficiency</a>
                    <a href="#" data-view="quality_scores" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">Quality Scores</a>
                    <a href="#" data-view="fedex_manifest_conso_data" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">Fedex Manifest</a>
                    <a href="#" data-view="fedex_aus_hourly_count" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">Fedex AUS Hourly Count</a>
                </div>
            </div>

            <div class="dropdown">
                <a href="#" class="parent flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                    <span class="material-icons-sharp text-[1.2rem]">calendar_month</span>
                    <h3 class="flex-1">Attendance & Absenteeism</h3>
                    <span class="dropdown-indicator transition-transform duration-200">&#9662;</span>
                </a>
                <div class="child-dropdown bg-slate-50 dark:bg-slate-800/50 py-2">
                    <a href="#" data-view="lhi_absenteeism" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI Absenteeism</a>
                    <a href="#" data-view="bps_absenteeism" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BPS Absenteeism</a>
                    <a href="#" data-view="bps_attendance_db" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BPS Attendance DB</a>
                    <a href="#" data-view="daily_attendance_status" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">Daily Attendance Status</a>
                </div>
            </div>

            <hr class="menu-divider my-2 border-slate-200 dark:border-slate-800 mx-6">

            <div class="dropdown">
                <a href="#" class="parent flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                    <span class="material-icons-sharp text-[1.2rem]">grid_view</span>
                    <h3 class="flex-1">LHI Production Reports</h3>
                    <span class="dropdown-indicator transition-transform duration-200">&#9662;</span>
                </a>
                <div class="child-dropdown bg-slate-50 dark:bg-slate-800/50 py-2">
                    <a href="#" data-view="lhi_dashboard" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI Dashboard</a>
                    <a href="#" data-view="lhi_bfp" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI BFP</a>
                    <a href="#" data-view="lhi_weekly_efficiency" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI Weekly Efficiency</a>
                    <a href="#" data-view="lhi_scorecard" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI Scorecard</a>
                    <a href="#" data-view="lhi_inventory" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">LHI Inventory</a>
                </div>
            </div>

            <hr class="menu-divider my-2 border-slate-200 dark:border-slate-800 mx-6">

            <a href="#" data-view="bps_financial" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">bar_chart</span>
                <h3 class="flex-1">BPS Financial</h3>
            </a>

            <a href="#" data-view="lhi_financial" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">insert_chart</span>
                <h3 class="flex-1">LHI Financial</h3>
            </a>

            <a href="./views/database_update.php" target="_blank" rel="noopener noreferrer" data-view="database_update.php" data-external="true" onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;" class="flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                <span class="material-icons-sharp text-[1.2rem]">build</span>
                <h3 class="flex-1">Database Update</h3>
            </a>

            <div class="dropdown">
                <a href="#" class="parent flex items-center gap-4 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer">
                    <span class="material-icons-sharp text-[1.2rem]">query_stats</span>
                    <h3 class="flex-1">BU Review Reports</h3>
                    <span class="dropdown-indicator transition-transform duration-200">&#9662;</span>
                </a>
                <div class="child-dropdown bg-slate-50 dark:bg-slate-800/50 py-2">
                    <a href="#" data-view="bu_bps" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BU BPS</a>
                    <a href="#" data-view="bu_lhi" class="block pl-14 pr-6 py-2.5 text-sm text-slate-500 hover:text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">BU LHI</a>
                </div>
            </div>

            <a href="#" id="logout-link" class="flex items-center gap-4 px-6 py-3.5 mt-4 text-sm font-medium text-danger hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20">
                <span class="material-icons-sharp text-[1.2rem]">logout</span>
                <h3 class="flex-1">Log Out</h3>
            </a>

        </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative">
        
        <header class="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 z-20 dark:bg-slate-900 dark:border-slate-800 transition-colors duration-300 shadow-sm">
            
            <div class="flex items-center">
                <button id="menu-btn" class="md:hidden text-slate-500 hover:text-primary transition-colors p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <span class="material-icons-sharp">dehaze</span>
                </button>
            </div>

            <div class="flex items-center gap-6">
                <div class="theme-toggler flex bg-slate-100 rounded-md cursor-pointer overflow-hidden p-1 dark:bg-slate-800">
                    <span class="material-icons-sharp active p-1 text-[1.2rem] flex items-center justify-center transition-colors">light_mode</span>
                    <span class="material-icons-sharp p-1 text-[1.2rem] flex items-center justify-center transition-colors text-slate-500 dark:text-slate-400">dark_mode</span>
                </div>

                <div class="profile flex items-center gap-3 border-l border-slate-200 pl-6 dark:border-slate-700">
                    <div class="info text-right hidden sm:block">
                        <p class="text-sm text-slate-800 dark:text-slate-200">Hi, <b><?php echo htmlspecialchars($firstname); ?></b></p>
                        <small class="text-xs text-slate-500 dark:text-slate-400"><?php echo htmlspecialchars($position); ?></small>
                    </div>
                    <div class="profile-photo w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        <span class="material-icons-sharp text-3xl">account_circle</span>
                    </div>
                </div>
            </div>
        </header>

        <main id="main-content" class="flex-1 overflow-y-auto p-6 relative">
            
            <div id="loading-screen" class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm hidden dark:bg-slate-900/80">
                <div class="spinner"></div>
                <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Loading data...</p>
            </div>

            <div id="app" class="max-w-7xl mx-auto"></div>
            
        </main>
        
    </div>

    <script src="js/fetch_data.js"></script>
    <script src="js/employee_updates.js"></script>
    <script src="js/project_employees.js"></script>
    <script src="js/index.js"></script>
    <script src="js/router.js"></script>
    <script src="js/sidebartoggle.js"></script>
    <script src="js/role_access.js"></script>
    <script src="js/export-functions.js"></script>
    <script src="js/team_member.js"></script>
    <script src="js/collapse_menu.js"></script>

</body>
</html>