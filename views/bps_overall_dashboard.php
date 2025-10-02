<?php
session_start();

// Prevent browser caching
header("Cache-Control: no-cache, no-store, must-revalidate"); // HTTP 1.1
header("Pragma: no-cache"); // HTTP 1.0
header("Expires: 0"); // Proxies

// Check if user is logged in (session variable exists)
if (!isset($_SESSION['employee_id'])) {
    // Redirect to login page if not logged in.
    // IMPORTANT: Adjust the path to your login page if it's not 'index.html' in the main directory.
    header('Location: ../../index.html'); // Assuming login is two levels up from /views/
    exit();
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BPS Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <script type="text/javascript" src="https://cdn.jsdelivr.net/jquery/latest/jquery.min.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/momentjs/latest/moment.min.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css" />
    <!-- This should point to your actual CSS file -->
    <link rel="stylesheet" href="../bps_dashboard.css">
</head>
<body>

    <div class="dashboard-wrapper">
        <header class="header">
            <div class="header-left">
                <img src="../images/xbp-global.png" alt="XBP Global Logo" class="header-logo">
                <span>BPS Overall Dashboard</span>
            </div>
            <div class="header-center">
                <nav>
                    <a href="#" class="active">BPS Overall Dashboard</a>
                    <!-- <a href="#">Project and Operator Efficiency</a>
                    <a href="#">BFP Data</a>
                    <a href="#">Operator Scorecard</a> -->
                </nav>
            </div>
            <div class="header-right">
                <i class="fas fa-bell"></i>
            </div>
        </header>
        
        <main class="main-content">
            <div id="chart-section" class="chart-section">
                <div class="chart-header">
                    <h2 class="chart-title">Performance Metrics</h2>
                    <div class="chart-controls">
                        <!-- ADDED: Chart period switcher buttons -->
                        <div class="chart-period-switcher">
                            <button class="view-btn active" data-period="daily">Daily</button>
                            <button class="view-btn" data-period="weekly">Weekly</button>
                            <button class="view-btn" data-period="monthly">Monthly</button>
                        </div>
                        <div class="metric-selector">
                            <label for="primary-metric-select">Primary Metric:</label>
                            <select id="primary-metric-select"></select>
                        </div>
                        <div class="metric-selector">
                            <label for="secondary-metric-select">Secondary Metric:</label>
                            <select id="secondary-metric-select"></select>
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="performance-chart"></canvas>
                </div>
            </div>

            <div class="controls-bar">
                <div class="left-controls">
                    <button id="filter-toggle-btn" class="control-btn"><i class="fas fa-filter"></i> Filters</button>
                    <div class="date-range">
                        <i class="fas fa-calendar-alt"></i>
                        <input type="text" id="date-range-picker" readonly>
                    </div>
                    <div class="view-switcher">
                        <button id="employee-view-btn" class="view-btn active">Employee View</button>
                        <button id="project-view-btn" class="view-btn">Project View</button>
                    </div>
                    <div class="pillbox-container">
                        <!-- Pills will be populated by JS -->
                    </div>
                </div>
                <div class="right-controls">
                    <button id="toggle-chart-btn" class="control-btn"><i class="fas fa-eye-slash"></i> Hide Chart</button>
                    <button id="csv-export-btn" class="control-btn"><i class="fas fa-file-csv"></i> Table Export</button>
                    <button id="xlsx-export-btn" class="control-btn"><i class="fas fa-file-excel"></i> Detailed Export</button>
                </div>
            </div>

            <div class="filter-panel" id="filter-panel">
                <div class="filter-grid">
                    <div class="filter-group">
                        <label for="filter-site">Site</label>
                        <select id="filter-site">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-tl">Team Leader</label>
                        <select id="filter-tl">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-projects">Primary Project</label>
                        <select id="filter-projects">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Task Project</label>
                        <div class="multiselect-container" id="taskprojects-multiselect-container">
                            <button type="button" class="multiselect-button">
                                <span class="multiselect-label">Select Projects</span>
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="multiselect-dropdown">
                                <div class="multiselect-options-container">
                                    <!-- Checkbox options will be inserted here by JS -->
                                </div>
                                <div class="multiselect-actions">
                                    <button type="button" class="multiselect-cancel-btn">Cancel</button>
                                    <button type="button" class="multiselect-apply-btn">Apply</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label for="filter-taskname">Task Name</label>
                        <select id="filter-taskname">
                            <option value="">All</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-fireflyprocess">Firefly Process</label>
                        <select id="filter-fireflyprocess">
                            <option value="">All</option>
                        </select>
                    </div>
                </div>
                <div class="filter-actions">
                    <button class="apply-filters-btn">Apply Filters</button>
                    <button class="clear-filters-btn">Clear All</button>
                </div>
            </div>

            <div class="table-container" id="main-table-container">
                <div id="loading" class="loading-overlay">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading data...</p>
                </div>
                <table class="data-table">
                    <thead>
                        <!-- Table headers will be populated by JS -->
                    </thead>
                    <tbody>
                        <!-- Table body will be populated by JS -->
                    </tbody>
                </table>
            </div>

            <div class="table-footer">
                <div class="footer-left">
                    <i id="prev-page-btn" class="fas fa-chevron-left"></i>
                    <span id="page-number">1</span>
                    <i id="next-page-btn" class="fas fa-chevron-right"></i>
                    <span class="entry-info"></span>
                </div>
                <div class="footer-right">
                    <span class="rows-label">Rows</span>
                    <select name="rows" id="rows-per-page">
                        <option value="10">10</option>
                        <option value="30" selected>30</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="all">All</option>
                    </select>
                </div>
            </div>
        </main>
    </div>

    <!-- Employee Task Detail Modal -->
    <div id="employee-task-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title">Task Details</h2>
                <button id="modal-close-btn" class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                 <div class="table-container">
                    <div id="modal-loading" class="loading-overlay">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading tasks...</p>
                    </div>
                    <table class="data-table">
                        <thead id="modal-table-head">
                           <!-- Modal headers will be set by JS -->
                        </thead>
                        <tbody id="modal-table-body">
                            <!-- Data will be inserted here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>


    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <!-- This should point to your actual JS file -->
    <script src="../js/bps_dashboard.js"></script>
</body>
</html>

