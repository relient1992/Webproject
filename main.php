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
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Sharp"
    rel="stylesheet">
    <link rel="stylesheet" href="./style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <script>
        const USER_ROLE = <?php echo json_encode($role); ?>;
        sessionStorage.setItem("user_role", USER_ROLE);
        console.log("USER_ROLE set to:", USER_ROLE);
    </script>
</head>
<body>
    <div class="container">
        <aside>
            <div class="top">
                <div class="logo">
                    <!-- <img id="logo" src="./images/ExelaTech_logo.png" alt="logo"> -->
                </div>
                <div class="close" id="close-btn">
                    <span class="material-icons-sharp">close</span>
                </div>
            </div>

            <div class="sidebar">
                <a href="#" class="Active" data-view="active_attrition">
                    <span class="material-icons-sharp">group</span>
                    <h3>Active & Attrition</h3>
                </a>

                <a href="#" data-view="team_member">
                    <span class="material-icons-sharp">supervised_user_circle</span>
                    <h3>Team Member</h3>
                </a>

                <a href="http://10.200.168.112:3001/" target="_blank"
                        rel="noopener noreferrer"
                        onclick="event.stopPropagation(); window.open(this.href, '_blank'); return false;">
                    <span class="material-icons-sharp">punch_clock</span>
                    <h3>ESS</h3>
                </a>

                <!-- <a href="#" data-view="bps_dashboard">
                    <span class="material-icons-sharp">grid_view</span>
                    <h3>BPS Dashboard</h3>
                </a> -->

                <!-- <a href="#" data-view="bps_bfp">
                    <span class="material-icons-sharp">money</span>
                    <h3>BPS BFP</h3>
                </a> -->

                <div class="dropdown">
                    <a href="#" class="parent">
                        <span class="material-icons-sharp">money</span>
                        <h3>BPS Production Reports</h3>
                        <span class="dropdown-indicator">&#9662;</span>
                    </a>
                    <div class="child-dropdown">
                        <a href="#" data-view="bps_dashboard"><h3>BPS Dashboard</h3></a>
                        <a href="#" data-view="bps_bfp"><h3>BPS BFP</h3></a>
                        <a href="#" data-view="project_efficiency"><h3>Project Efficiency</h3></a>
                        <a href="#" data-view="quality_scores"><h3>Quality Scores</h3></a>
                        <a href="#" data-view="fedex_manifest_conso_data"><h3>Fedex Manifest Conso Data</h3></a>
                    </div>
                </div>



                <!-- <a href="#" data-view="project_efficiency">
                    <span class="material-icons-sharp">query_stats</span>
                    <h3>Project Efficiency</h3>
                </a> -->

                <!-- <a href="#" data-view="quality_scores">
                    <span class="material-icons-sharp">grading</span>
                    <h3>Quality Scores</h3>
                </a> -->

                <div class="dropdown">
                    <a href="#" class="parent">
                        <span class="material-icons-sharp">calendar_month</span>
                        <h3>Attendance & Absenteeism</h3>
                        <span class="dropdown-indicator">&#9662;</span>
                    </a>
                    <div class="child-dropdown">
                        <a href="#" data-view="lhi_absenteeism"><h3>LHI Absenteeism</h3></a>
                        <a href="#" data-view="bps_absenteeism"><h3>BPS Absenteeism</h3></a>
                        <a href="#" data-view="bps_attendance_db"><h3>BPS Attendance DB</h3></a>
                    </div>
                </div>

                <hr class="menu-divider">

                <div class="dropdown">
                    <a href="#" class="parent">
                        <span class="material-icons-sharp">grid_view</span>
                        <h3>LHI Production Reports</h3>
                        <span class="dropdown-indicator">&#9662;</span>
                    </a>
                    <div class="child-dropdown">
                        <a href="#" data-view="lhi_dashboard"><h3>LHI Dashboard</h3></a>
                        <a href="#" data-view="lhi_bfp"><h3>LHI BFP</h3></a>
                        <a href="#" data-view="lhi_weekly_efficiency"><h3>LHI Weekly Efficiency</h3></a>
                        <a href="#" data-view="lhi_scorecard"><h3>LHI Scorecard</h3></a>
                        <a href="#" data-view="lhi_inventory"><h3>LHI Inventory</h3></a>
                    </div>
                </div>

                <!-- <a href="#" data-view="lhi_dashboard">
                    <span class="material-icons-sharp">grid_view</span>
                    <h3>LHI Dashboard</h3>
                </a>

                <a href="#" data-view="lhi_bfp">
                    <span class="material-icons-sharp">money</span>
                    <h3>LHI BFP</h3>
                </a> -->

                <hr class="menu-divider">

                <a href="#" data-view="bps_financial">
                    <span class="material-icons-sharp">bar_chart</span>
                    <h3>BPS Financial</h3>
                </a>

                <a href="#" data-view="lhi_financial">
                    <span class="material-icons-sharp">insert_chart</span>
                    <h3>LHI Financial</h3>
                </a>

                <div class="dropdown">
                    <a href="#" class="parent">
                        <span class="material-icons-sharp">query_stats</span>
                        <h3>BU Review Reports</h3>
                        <span class="dropdown-indicator">&#9662;</span>
                    </a>
                    <div class="child-dropdown">
                        <a href="#" data-view="bu_bps"><h3>BU BPS</h3></a>
                        <a href="#" data-view="bu_lhi"><h3>BU LHI</h3></a>
                        
                    </div>
                </div>
                <!-- <a href="#">
                    <span class="material-icons-sharp">settings</span>
                    <h3>Settings</h3>
                </a> -->

                <a href="#" id="logout-link">
                    <span class="material-icons-sharp">logout</span>
                    <h3>Log Out</h3>
                </a>

            </div>


        </aside>


        <!-- END OF ASIDE -->

            <div id="loading-screen">
                <div class="spinner"></div>
                <p>loading...</p>
            </div>

        <main id="main-content">

        

            <div id="app"></div>
            
            
        </main>
        <!-- END OF MAIN -->

        <!-- RIGHT SECTION: now contains top bar and dynamic insert area -->
        <div class="right-container">

            
            <div class="right-top">
                <div class="top">
                    <button id="menu-btn">
                        <span class="material-icons-sharp">dehaze</span>
                    </button>
                    <div class="theme-toggler">
                        <span class="material-icons-sharp active">light_mode</span>
                        <span class="material-icons-sharp">dark_mode</span>
                    </div>
                    <div class="profile">
                        <div class="info">
                            <p>Hi, <b><?php echo htmlspecialchars($firstname); ?></b></p>
                            <small class="text-muted"><?php echo htmlspecialchars($position); ?></small>
                        </div>
                        <div class="profile-photo">
                            <span class="material-icons-sharp">account_circle</span>
                        </div>
                    </div>
                </div>
            </div>

           
            <!-- <div id="right-bottom-section">
               
            </div> -->

        </div>
        <!-- END OF RIGHT SECTION -->

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
    

    

</body>
</html>
