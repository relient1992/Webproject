<?php
session_start(); // Start the session at the very top

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
    <title>HR Recruitment Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/litepicker/dist/css/litepicker.css" />
    <script src="https://cdn.jsdelivr.net/npm/litepicker/dist/bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/litepicker/dist/plugins/ranges.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css"/>
    <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
    <style>
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        .sortable { cursor: pointer; position: relative; }
        .sortable:after { font-family: "Font Awesome 6 Free"; font-weight: 900; content: "\f0dc"; position: absolute; right: 10px; color: #cbd5e1; }
        .sortable.asc:after { content: "\f0de"; color: #3b82f6; }
        .sortable.desc:after { content: "\f0dd"; color: #3b82f6; }
        #tableBody:empty:after { content: "Loading applicant data..."; display: block; text-align: center; padding: 2rem; color: #6b7280; }
        .table-select { background-color: transparent; border: 1px solid transparent; border-radius: 0.375rem; padding: 0.25rem 0.5rem; width: 100%; -webkit-appearance: none; -moz-appearance: none; appearance: none; }
        .table-select:hover { border-color: #d1d5db; }
        .table-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px #bfdbfe; }
        .filter-link.active { background-color: #eff6ff; color: #2563eb; font-weight: 600; }
        .view-toggle-btn.active { background-color: white; color: #2563eb; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
    </style>
</head>
<body class="bg-gray-100 font-sans text-gray-800">
    <div class="flex h-screen">
        <!-- Sidebar -->
        <aside class="w-64 bg-white shadow-md flex-shrink-0 flex flex-col">
            <div class="p-4 border-b"><h2 class="text-xl font-bold text-gray-800">Recruitment Filters</h2></div>
            <nav id="statusFilters" class="p-2 flex-1 overflow-y-auto"></nav>
            <div class="p-4 border-t">
                <h3 class="text-sm font-semibold text-gray-500 mb-2">Daily Deployed (Last 7 Days)</h3>
                <div class="relative h-40">
                    <canvas id="sidebarChart"></canvas>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden">
            <!-- Header -->
            <header class="bg-white shadow-sm p-4 flex justify-between items-center">
                <h1 class="text-2xl font-semibold text-gray-800">Applicant Dashboard</h1>
                <div class="flex items-center gap-2 flex-wrap">
                     <button id="downloadTemplateBtn" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-download mr-2"></i>Template</button>
                     <button id="bulkUploadBtn" class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700"><i class="fas fa-upload mr-2"></i>Bulk Upload</button>
                     <button id="viewLogsBtn" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"><i class="fas fa-history mr-2"></i>Logs</button>
                     <button id="newApplicantBtn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>New</button>
                </div>
            </header>

            <!-- Dashboard Content -->
            <div class="flex-1 p-6 overflow-y-auto">
                <!-- Analytics Section -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Total Applicants</p><p id="totalApplicants" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Interviewing</p><p id="interviewingCount" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Deployed (This Month)</p><p id="deployedThisMonth" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Avg. Time to Hire</p><p id="avgTimeToHire" class="text-3xl font-bold">N/A</p></div>
                </div>

                <!-- Charts Section -->
                <div class="bg-white p-4 rounded-2xl shadow-md mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-4">
                            <h3 class="text-lg font-semibold">Analytics</h3>
                            <select id="chartMetricSelect" class="p-2 border rounded-lg">
                                <option value="applicantTrend">Applicant Trend</option>
                                <option value="deploymentTrend">Deployment Trend</option>
                                <option value="topSources">Top Application Sources</option>
                            </select>
                        </div>
                        <button id="toggleChartBtn" class="text-gray-500 hover:text-gray-800"><i class="fas fa-chevron-up"></i></button>
                    </div>
                    <div id="chartContainer" class="transition-all duration-500">
                        <canvas id="mainChart"></canvas>
                    </div>
                </div>


                
                <!-- Table Controls -->
                <div class="bg-white p-4 rounded-2xl shadow-md mb-6 flex flex-wrap gap-4 justify-between items-center">
                    <!-- Bulk Status Dropdown -->
                    <select id="bulkStatusDropdown" class="p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Status</option>
                        <option value="1">Applied</option>
                        <option value="2">Failed Speedtest</option>
                        <option value="3">Initial Interview</option>
                        <option value="4">Failed L1 Interview</option>
                        <option value="5">Final Interview</option>
                        <option value="6">Failed L2 Interview</option>
                        <option value="7">For BGV</option>
                        <option value="8">Job Offer</option>
                        <option value="9">Processing Requirements</option>
                        <option value="10">Complete Requirements</option>
                        <option value="11">Onboarding</option>
                        <option value="12">Pooling</option>
                        <option value="13">Deployed</option>
                        <option value="14">Withdrawn</option>
                        <option value="15">Declined Offer</option>
                    </select>

                    <!-- Apply Button -->
                    <button id="applyBulkStatus" class="btn">Apply Selected Status to All Checked</button>

                    <!-- Search Input -->
                    <div class="relative w-full md:w-auto flex-grow">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="searchInput" class="w-full p-2 pl-10 border rounded-lg" placeholder="Search...">
                    </div>

                    <!-- Search Field Selector -->
                    <select id="searchFieldSelector" class="p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="firstname">Firstname</option>
                        <option value="surname">Surname</option>
                        <option value="street_address">Street Address</option>
                        <option value="city">City</option>
                        <option value="province">Province</option>
                        <option value="position_applied">Position Applied</option>
                        <option value="recruiter_name">Recruiter Name</option>
                        <option value="recruitment_status_text">Recruitment Status</option>
                        <option value="application_source">Application Source</option>
                        <option value="interviewers">Interviewers</option>
                        <option value="Project">Project</option>
                        <option value="education_level">Education Level</option>
                        <option value="college_degree">College Degree</option>
                    </select>

                    <!-- Date Picker and View Toggle -->
                    <div class="flex items-center gap-4 flex-wrap">
                        <div class="relative">
                            <i class="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="dateRangePicker" class="p-2 pl-10 border rounded-lg w-64" placeholder="Select date range...">
                        </div>
                        <div class="flex items-center bg-gray-200 rounded-lg p-1">
                            <button id="viewActiveBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md active">Active</button>
                            <button id="viewArchivedBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md text-gray-600">Archived</button>
                            <button id="viewRecruiterBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md text-gray-600">Recruiters</button>
                        </div>
                    </div>

                    <!-- Export and Column Toggle -->
                    <div class="flex items-center gap-4">
                        <button id="exportDataBtn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"><i class="fas fa-file-csv mr-2"></i>Export</button>
                        <button id="columnToggleBtn" class="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800"><i class="fas fa-columns mr-2"></i>Columns</button>
                    </div>
                </div>

                <!-- Main Data Display Area -->
                <div id="mainDisplayArea" class="bg-white rounded-2xl shadow-md overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead id="tableHead">
                            <tr>
                                <th class="px-4 py-2 sortable" data-key="id">ID</th>
                                <th class="px-4 py-2 sortable" data-key="firstname">Firstname</th>
                                <th class="px-4 py-2 sortable" data-key="surname">Surname</th>
                                <th class="px-4 py-2 sortable" data-key="position_applied">Position Applied</th>
                                <th class="px-4 py-2 sortable" data-key="recruiter_name">Recruiter</th>
                                <th class="px-4 py-2 sortable" data-key="recruitment_status_text">Status</th>
                                <th class="px-4 py-2 sortable" data-key="application_source">Source</th>
                                <th class="px-4 py-2 sortable" data-key="interviewers">Interviewers</th>
                                <th class="px-4 py-2 sortable" data-key="Project">Project</th>
                                <th class="px-4 py-2 sortable" data-key="education_level">Education Level</th>
                                <th class="px-4 py-2 sortable" data-key="college_degree">College Degree</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody"></tbody>
                    </table>
                    <div id="recruiterPerformanceArea" class="hidden p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>

                <!-- Pagination Controls -->
                <div id="paginationControls" class="flex justify-between items-center mt-4">
                    <div>
                        <span class="text-sm text-gray-600">Rows per page:</span>
                        <select id="rowsPerPageSelect" class="p-1 border rounded-md">
                            <option value="10" selected>10</option>
                            <option value="30">30</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="prevPageBtn" class="p-2 border rounded-md disabled:opacity-50" disabled><i class="fas fa-chevron-left"></i></button>
                        <span id="pageInfo" class="text-sm font-medium">Page 1 of 1</span>
                        <button id="nextPageBtn" class="p-2 border rounded-md disabled:opacity-50" disabled><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- All Modals -->
    <!-- Column Selector Modal -->
    <div id="columnSelector" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h2 class="text-2xl font-bold mb-4">Select Columns to Display</h2>
            <div id="columnCheckboxes" class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto"></div>
            <div class="mt-6 text-right">
                <button id="closeColumnSelector" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Done</button>
            </div>
        </div>
    </div>

    <!-- Edit Modal -->
    <div id="editModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Edit Applicant Details</h2>
            <form id="editForm" novalidate>
                <input type="hidden" id="edit_application_id" name="application_id">
                <div id="editFormContent" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
                <div class="mt-8 pt-4 border-t flex justify-between items-center">
                    <button id="deleteBtn" type="button" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">
                        <i class="fas fa-archive mr-2"></i>Archive Applicant
                    </button>
                    <div>
                        <button id="cancelEditBtn" type="button" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 mr-2">Cancel</button>
                        <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Save Changes</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Applicant Modal -->
    <div id="addApplicantModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Add New Applicant</h2>
            <form id="addApplicantForm" novalidate>
                <div id="addFormContent" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
                <div class="mt-8 pt-4 border-t flex justify-end items-center gap-4">
                    <button id="cancelAddBtn" type="button" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Submit Application</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Logs Modal -->
    <div id="logsModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">System Activity Logs</h2>
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <i class="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="logDateRangePicker" class="p-2 pl-10 border rounded-lg w-64" placeholder="Filter logs by date...">
                    </div>
                    <button id="exportLogsBtn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"><i class="fas fa-file-csv mr-2"></i>Export Logs</button>
                    <button id="closeLogsModal" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div id="logsTableContainer" class="overflow-y-auto flex-1">
                <table class="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th class="px-4 py-2">Date/Time</th>
                            <th class="px-4 py-2">User</th>
                            <th class="px-4 py-2">Action</th>
                            <th class="px-4 py-2">Details</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Bulk Upload Modal -->
    <div id="bulkUploadModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Bulk Upload Applicants</h2>
            <form id="bulkUploadForm">
                <input type="file" id="bulkFileInput" accept=".csv,.xlsx" class="mb-4">
                <div class="flex justify-end gap-4">
                    <button id="cancelBulkBtn" type="button" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                    <button type="submit" class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700">Upload</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Scripts -->
    <script src="../js/hr_dashboard.js"></script>
    <script src="../js/hr_bulk_upload.js"></script>
    <script src="../js/hr_logs.js"></script>
    <script src="../js/hr_dashboard_bulk_actions.js"></script>
</body>
</html>





