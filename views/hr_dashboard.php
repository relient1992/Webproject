<?php
session_start(); // Start the session at the very top

// Prevent browser caching
header("Cache-Control: no-cache, no-store, must-revalidate"); // HTTP 1.1
header("Pragma: no-cache"); // HTTP 1.0
header("Expires: 0"); // Proxies

// Check if user is logged in (session variable exists)
if (!isset($_SESSION['employee_id'])) {
    // Redirect to login page if not logged in.
    header('Location: ../../index.html'); 
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
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css"/>
    <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
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
        
        /* --- NEW STYLES FOR PRE-SCREENING --- */
        .score-high { color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 8px; border-radius: 12px; }
        .score-mid { color: #d97706; font-weight: bold; background: #fffbeb; padding: 2px 8px; border-radius: 12px; }
        .score-low { color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 8px; border-radius: 12px; }

        /* --- COLUMN RESIZER STYLES --- */
        th {
            position: relative; /* Required for resizer positioning */
        }

        .resizer {
            /* The clickable area on the right edge */
            position: absolute;
            top: 0;
            right: 0;
            width: 5px;
            height: 100%;
            cursor: col-resize;
            user-select: none;
            touch-action: none;
            z-index: 20;
        }

        .resizer:hover, 
        .resizing {
            /* Highlight blue when hovering or dragging */
            background-color: #3b82f6; 
            border-right: 2px solid #3b82f6;
        }

    </style>
</head>
<body class="bg-gray-100 font-sans text-gray-800">
    <div class="flex h-screen">
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

        <main class="flex-1 flex flex-col overflow-hidden">
            <header class="bg-white shadow-sm p-4 flex justify-between items-center">
                <h1 class="text-2xl font-semibold text-gray-800">Applicant Dashboard</h1>
                <div class="flex items-center gap-2 flex-wrap">
                    <button id="btnOpenRequisition" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"><i class="fas fa-clipboard-list mr-2"></i> Requisitions</button>
                    <button id="openAnalyticsBtn" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-md transition">
                        <i class="fas fa-chart-pie mr-2"></i> Analytics
                    </button>
                     <button id="downloadTemplateBtn" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-download mr-2"></i>Template</button>
                     <button id="bulkUploadBtn" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-upload mr-2"></i>Bulk Upload</button>
                     <div class="relative mr-4 cursor-pointer" id="btnNotification">
                        <i class="fas fa-bell text-gray-600 text-2xl hover:text-purple-600 transition"></i>
                        <span id="notifBadge" class="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden">0</span>
                     </div>
                     <button id="viewLogsBtn" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"><i class="fas fa-history mr-2"></i>Logs</button>
                     <button id="newApplicantBtn" class="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>New</button>
                     <button id="logoutBtn" class="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 border border-red-600 shadow-sm ml-2">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout</button>  
                </div>
            </header>

            <div class="flex-1 p-6 overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="bg-white p-6 rounded-2xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-gray-500 text-sm font-medium">Total Applicants</p>
                            <span id="dateBadge_total" class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">All Time</span>
                        </div>
                        <p id="totalApplicants" class="text-3xl font-bold text-gray-800">0</p>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-gray-500 text-sm font-medium">Qualified (Score 70+)</p>
                            <span id="dateBadge_qualified" class="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-full">All Time</span>
                        </div>
                        <p id="qualifiedCount" class="text-3xl font-bold text-green-600">0</p>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-gray-500 text-sm font-medium">Interviewing</p>
                            <span id="dateBadge_interviewing" class="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">All Time</span>
                        </div>
                        <p id="interviewingCount" class="text-3xl font-bold text-gray-800">0</p>
                    </div>

                    <div class="bg-white p-6 rounded-2xl shadow-md border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-gray-500 text-sm font-medium">Deployed</p> <span id="dateBadge_deployed" class="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">All Time</span>
                        </div>
                        <p id="deployedThisMonth" class="text-3xl font-bold text-gray-800">0</p>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl shadow-md mb-6">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-4">
                            <h3 class="text-lg font-semibold">Analytics</h3>
                            <select id="chartMetricSelect" class="p-2 border rounded-lg">
                                <option value="applicantTrend">Applicant Trend</option>
                                <option value="deploymentTrend">Deployment Trend</option>
                                <option value="topSources">Top Application Sources</option>
                                <option value="screeningPerformance">Screening Outcomes</option>
                            </select>
                        </div>
                        <button id="toggleChartBtn" class="text-gray-500 hover:text-gray-800"><i class="fas fa-chevron-up"></i></button>
                    </div>
                    <div id="chartContainer" class="transition-all duration-500">
                        <canvas id="mainChart"></canvas>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl shadow-md mb-6 flex flex-wrap gap-4 justify-between items-center">
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

                    <button id="applyBulkStatus" class="bg-blue-50 text-blue-600 font-semibold py-2 px-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition">Apply Selected Status</button>

                    <div class="relative w-full md:w-auto flex-grow">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="searchInput" class="w-full p-2 pl-10 border rounded-lg" placeholder="Search...">
                    </div>

                    <select id="searchFieldSelector" class="p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="requisition_id">Requisition ID</option>
                        <option value="firstname">Firstname</option>
                        <option value="surname">Surname</option>
                        <option value="location">Location</option>
                        <option value="entity">Entity</option>
                        <option value="position_applied">Position Applied</option>
                        <option value="screening_status">Screening Status</option>
                        <option value="specific_skill">Expertise</option>
                        <option value="street_address">Street Address</option>
                        <option value="city">City</option>
                        <option value="province">Province</option>
                        <option value="recruiter_name">Recruiter Name</option>
                        <option value="recruitment_status_text">Recruitment Status</option>
                        <option value="application_source">Application Source</option>
                        <option value="interviewers">Interviewers</option>
                        <option value="Project">Project</option>
                        <option value="education_level">Education Level</option>
                        <option value="college_degree">College Degree</option>
                    </select>

                    <div class="flex items-center gap-4 flex-wrap">
                        <div class="relative">
                            <i class="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="dateRangePicker" class="p-2 pl-10 border rounded-lg w-64" placeholder="(Applied) Select date range...">
                        </div>
                        <div class="flex items-center bg-gray-200 rounded-lg p-1">
                            <button id="viewActiveBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md active">Active</button>
                            <button id="viewDeployedBtn" class="px-4 py-2 text-gray-600 hover:text-green-600 font-semibold border-b-2 border-transparent        hover:border-green-500 transition">
                                <i class="fas fa-check-circle mr-1"></i> Deployed
                            </button>
                            <button id="viewArchivedBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md text-gray-600">Archived</button>
                            <button id="viewRecruiterBtn" class="view-toggle-btn px-4 py-1 text-sm font-semibold rounded-md text-gray-600">Recruiters</button>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <button id="exportDataBtn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"><i class="fas fa-file-csv mr-2"></i>Export</button>
                        <div class="flex items-center bg-gray-100 rounded-lg p-1 border">
                            <!-- <button id="resetViewBtn" class="text-xs font-semibold text-gray-600 px-3 py-2 hover:text-red-600 hover:bg-gray-200 rounded" title="Reset to Default"><i class="fas fa-undo"></i></button> -->
                            <button id="saveViewBtn" class="text-xs font-semibold text-blue-600 px-3 py-2 hover:bg-blue-100 rounded" title="Save Current Order as Default"><i class="fas fa-save"></i> Save</button>
                            <div class="w-px h-6 bg-gray-300 mx-1"></div>
                            <button id="columnToggleBtn" class="text-sm font-bold text-gray-700 px-3 py-2 hover:text-black"><i class="fas fa-columns mr-2"></i>Columns</button>
                        </div>
                    </div>
                </div>

                <div id="mainDisplayArea" class="bg-white rounded-2xl shadow-md overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead id="tableHead">
                            <tr>
                                <th class="px-4 py-2 sortable" data-key="id">ID</th>
                                <th class="px-4 py-2 sortable" data-key="firstname">Firstname</th>
                                <th class="px-4 py-2 sortable" data-key="surname">Surname</th>
                                <th class="px-4 py-2 sortable" data-key="position_applied">Position</th>
                                <th class="px-4 py-2 sortable" data-key="screening_score">Score</th>
                                <th class="px-4 py-2 sortable" data-key="screening_status">Pre-Screen</th>
                                <th class="px-4 py-2 sortable" data-key="experience_years">Exp (Yrs)</th>
                                <th class="px-4 py-2 sortable" data-key="specific_skill">Expertise</th>
                                
                                <th class="px-4 py-2 sortable" data-key="recruiter_name">Recruiter</th>
                                <th class="px-4 py-2 sortable" data-key="recruitment_status_text">Status</th>
                                <th class="px-4 py-2 sortable" data-key="application_source">Source</th>
                                <th class="px-4 py-2 sortable" data-key="interviewers">Interviewers</th>
                                <th class="px-4 py-2 sortable" data-key="Project">Project</th>
                                <th class="px-4 py-2 sortable" data-key="education_level">Education</th>
                                <th class="px-4 py-2 sortable" data-key="college_degree">Degree</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody"></tbody>
                    </table>
                    <div id="recruiterPerformanceArea" class="hidden p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>

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

    <div id="columnSelector" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h2 class="text-2xl font-bold mb-4">Select Columns to Display</h2>
            <div id="columnCheckboxes" class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto"></div>
            <div class="mt-6 text-right">
                <button id="closeColumnSelector" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Done</button>
            </div>
        </div>
    </div>

    <div id="editModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Edit Applicant Details</h2>
                <button onclick="document.getElementById('editModal').classList.add('hidden')" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i></button>
            </div>
            
            <form id="editForm" novalidate>
                <input type="hidden" id="edit_application_id" name="application_id">
                <div id="editFormContent" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
                
                <div class="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between border">
                    <div>
                        <span class="text-sm text-gray-500">Auto-calculated Score:</span>
                        <span id="edit_screening_score_display" class="ml-2 text-lg font-bold text-gray-800">0</span>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Screening Status:</span>
                        <span id="edit_screening_status_display" class="ml-2 font-semibold text-gray-800">Pending</span>
                    </div>
                </div>

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

    <div id="requirementsModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-blue-50 rounded-t-lg">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Requirements Checklist</h3>
                    <p class="text-sm text-gray-600">Mark the documents submitted by <span id="reqApplicantName" class="font-bold text-blue-700">the applicant</span>.</p>
                </div>
                <button id="closeRequirementsModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <div class="p-6 overflow-y-auto">
                <form id="requirementsForm">
                    <input type="hidden" id="req_application_id">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Resume" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">Resumé with 2x2 picture with signature and 3 character reference</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="NBI Clearance" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">5 photocopy of updated NBI clearance</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Birth Certificate" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">5 photocopy of PSA or NSO Birth Certificate</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Marriage Certificate" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">Marriage Certificate (if married)</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="School Records" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">School Records (TOR & DIPLOMA or School Certification)</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="2x2 Picture" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">2x2 picture – 1 pc</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Valid IDs" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">2 valid government IDs</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="SSS Form" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">SSS E1 Form or any proof of SSS number with full name</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="TIN ID" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">TIN ID or any proof of TIN with full name</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="PhilHealth ID" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">PHILHEALTH ID or any proof of PHILHEALTH number with full name</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Pag-IBIG" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">PAG IBIG NUMBER (MID Number)</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="BIR Form" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">BIR Form (if any)</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="2316 Form" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">2316 Form of current year</span>
                        </label>

                        <label class="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                            <input type="checkbox" name="req_item" value="Medical Result" class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="text-sm text-gray-700">Medical and Drug Test result</span>
                        </label>
                    </div>

                    <div class="mt-6">
                        <div class="flex justify-between text-sm font-medium text-gray-700 mb-1">
                            <span>Completion Status</span>
                            <span id="reqProgressText">0 / 14</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div id="reqProgressBar" class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style="width: 0%"></div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <button type="button" id="cancelRequirementsBtn" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition">
                    Cancel
                </button>
                <button type="button" id="saveRequirementsBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition flex items-center">
                    <i class="fas fa-save mr-2"></i> Save Checklist
                </button>
            </div>
        </div>
    </div>


    <!-- <div id="addApplicantModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
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
    </div> -->

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
                <table class="w-full text-sm text-left border-collapse">
                    <thead class="bg-gray-100 sticky top-0">
                        <tr>
                            <th class="px-6 py-3 font-semibold text-gray-600">Date/Time</th>
                            <th class="px-6 py-3 font-semibold text-gray-600">User</th>
                            <th class="px-6 py-3 font-semibold text-gray-600">Action</th>
                            <th class="px-6 py-3 font-semibold text-gray-600">Target Applicant</th>
                            <th class="px-6 py-3 font-semibold text-gray-600">Details</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody" class="divide-y divide-gray-200"></tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="bulkUploadModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Bulk Upload Applicants</h2>
            <form id="bulkUploadForm">
                <input type="file" id="bulkFileInput" accept=".csv,.xlsx" class="mb-4">
                <div class="flex justify-end gap-4">
                    <button id="cancelBulkBtn" type="button" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Cancel</button>
                    <button type="button" id="processUploadBtn" class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700">Upload
                    </button>
                </div>
            </form>
        </div>
    </div>

    

    <div id="requisitionModal" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div class="relative w-11/12 xl:w-4/5 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col" style="max-height: 90vh;">
            
            <div class="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
                <div>
                    <h3 class="text-xl font-bold text-gray-800"><i class="fas fa-briefcase text-purple-600 mr-2"></i>Requisition Management</h3>
                    <p class="text-xs text-gray-500 mt-1">Manage job orders, headcount, and status.</p>
                </div>
                <button id="closeRequisitionModal" class="text-gray-400 hover:text-red-500 transition-colors">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>

            <div class="flex flex-col lg:flex-row h-full overflow-hidden">
                
                <div class="w-full lg:w-1/4 bg-gray-50 p-5 border-r border-gray-200 overflow-y-auto">
                    <h4 id="reqFormTitle" class="font-bold text-sm uppercase text-gray-700 mb-4 border-b pb-2">Create New Requisition</h4>
                    
                    <form id="requisitionForm" class="space-y-4">
                        <input type="hidden" name="id" id="req_db_id"> <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-1">Requisition ID</label>
                            <input type="text" name="requisition_id" id="req_id_input" required class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none uppercase" placeholder="REQ-2025-001">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-1">Project Name</label>
                            <input type="text" name="project_name" id="req_project_input" required class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. CSR Wave 1">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs font-semibold text-gray-600 mb-1">Headcount</label>
                                <input type="number" name="headcount_approved" id="req_headcount_input" required class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                <select name="status" id="req_status_input" class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="Open">Open</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Hold">Hold</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-1">Date Approved</label>
                            <input type="date" name="date_approved" id="req_date_input" required class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>

                        <div class="flex gap-2 mt-4">
                            <button type="submit" id="btnSaveReq" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-sm transition shadow-md">
                                <i class="fas fa-plus-circle mr-1"></i> <span id="btnSaveReqText">Add</span>
                            </button>
                            <button type="button" id="btnCancelReqEdit" class="hidden flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded text-sm transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                <div class="w-full lg:w-3/4 p-5 flex flex-col h-full">
                    
                    <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
                        <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg" id="reqStatusTabs">
                            <button class="px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow text-purple-700" data-status="All">All</button>
                            <button class="px-4 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-700" data-status="Open">Open</button>
                            <button class="px-4 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-700" data-status="Closed">Closed</button>
                            <button class="px-4 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-700" data-status="Hold">Hold</button>
                        </div>

                        <div class="relative w-full md:w-64">
                            <input type="text" id="reqSearchInput" class="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Search ID or Project...">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                        </div>
                    </div>

                    <div class="flex-1 overflow-auto border rounded-lg shadow-inner relative">
                        <table class="min-w-full leading-normal">
                            <thead class="bg-gray-100 sticky top-0 z-10">
                                <tr class="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-200 req-sort" data-key="requisition_id">Req ID <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-200 req-sort" data-key="project_name">Project <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-center cursor-pointer hover:bg-gray-200 req-sort" data-key="status">Status <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-center cursor-pointer hover:bg-gray-200 req-sort" data-key="headcount_approved">Approved <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-center text-blue-600 cursor-pointer hover:bg-gray-200 req-sort" data-key="joined_count">Joined <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-center text-orange-600 cursor-pointer hover:bg-gray-200 req-sort" data-key="accepted_offer_count">Offered <i class="fas fa-sort ml-1"></i></th>
                                    <th class="px-4 py-3 text-center text-red-600 cursor-pointer hover:bg-gray-200 req-sort" data-key="balance">Balance <i class="fas fa-sort ml-1"></i></th>
                                    
                                    <th class="px-4 py-3 text-center cursor-pointer hover:bg-gray-200 req-sort" data-key="aging_days">Aging <i class="fas fa-sort ml-1"></i></th>
                                    
                                    <th class="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="requisitionTableBody" class="bg-white text-sm">
                                </tbody>
                        </table>
                    </div>

                    <div class="flex justify-between items-center mt-4 pt-2 border-t text-sm text-gray-600">
                        <span id="reqPageInfo">Showing 0 to 0 of 0 entries</span>
                        <div class="flex space-x-2">
                            <button id="reqPrevBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Previous</button>
                            <button id="reqNextBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Next</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <div id="notificationModal" class="fixed inset-0 bg-gray-900 bg-opacity-50 hidden z-50 flex items-center justify-center">
        <div class="bg-white rounded-xl shadow-2xl w-11/12 xl:w-3/4 max-h-[90vh] flex flex-col">
            
            <div class="p-4 border-b bg-gray-50 rounded-t-xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-800"><i class="fas fa-calendar-alt text-blue-500 mr-2"></i>Interview Schedule</h3>
                    <p class="text-xs text-gray-500">Manage your upcoming and pending interviews.</p>
                </div>

                <div class="flex items-center space-x-2">
                    <div class="bg-gray-200 p-1 rounded-lg flex text-xs font-bold" id="notifTabs">
                        <button class="px-3 py-1.5 rounded-md bg-white text-purple-700 shadow" data-filter="all">All</button>
                        <button class="px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700" data-filter="initial">Initial</button>
                        <button class="px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-700" data-filter="final">Final</button>
                    </div>
                    
                    <select id="notifSortSelect" class="text-xs border-gray-300 rounded-lg focus:ring-purple-500">
                        <option value="asc">📅 Oldest First (Urgent)</option>
                        <option value="desc">📅 Newest First</option>
                    </select>

                    <button id="closeNotifModal" class="text-gray-400 hover:text-red-500 ml-2">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="overflow-y-auto p-3 space-y-2 bg-gray-100 flex-1" id="notificationList">
                </div>
            
            <div class="p-3 border-t bg-white rounded-b-xl flex justify-between items-center">
                <span class="text-xs text-gray-500" id="notifPageInfo">Showing 0-0 of 0</span>
                
                <div class="flex items-center gap-2">
                    <button id="notifPrevBtn" class="px-3 py-1 rounded border hover:bg-gray-100 text-xs disabled:opacity-50">Previous</button>
                    <button id="notifNextBtn" class="px-3 py-1 rounded border hover:bg-gray-100 text-xs disabled:opacity-50">Next</button>
                    <button id="dismissNotifBtn" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-4 rounded text-xs ml-4">Close</button>
                </div>
            </div>
        </div>
    </div>    

    <div id="resumeModal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center">
        <div class="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
            
            <div class="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
                <div>
                    <h3 class="text-xl font-bold text-gray-800" id="resumeModalTitle">Applicant Resume</h3>
                    <p class="text-xs text-gray-500">View attached document or paste a Google Drive link.</p>
                </div>
                <button id="closeResumeModal" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>

            <div class="flex-1 bg-gray-200 p-4 overflow-hidden relative" id="resumeViewerContainer">
                <iframe id="resumeFrame" class="w-full h-full bg-white shadow hidden" src=""></iframe>
                
                <div id="noResumeState" class="flex flex-col items-center justify-center h-full text-gray-500 hidden">
                    <i class="fas fa-file-upload text-6xl mb-4 text-gray-300"></i>
                    <p class="text-lg">No resume uploaded yet.</p>
                </div>
            </div>

            <div class="p-4 border-t bg-white flex flex-col gap-3">
                
                <div class="flex justify-between items-center border-b pb-3">
                    <form id="resumeUploadForm" class="flex items-center gap-2">
                        <input type="hidden" id="resume_app_id" name="application_id">
                        <input type="file" id="resumeFile" name="resume" accept=".pdf,.doc,.docx,.jpg,.png" class="hidden">
                        
                        <!-- <button type="button" onclick="document.getElementById('resumeFile').click()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow text-sm font-medium transition">
                            <i class="fas fa-upload mr-2"></i> Upload File
                        </button> -->
                        <span id="fileNameDisplay" class="text-xs text-gray-500 truncate max-w-[150px]"></span>
                    </form>

                    <a id="downloadResumeBtn" href="#" target="_blank" class="text-blue-600 hover:underline text-sm font-medium hidden">
                        <i class="fas fa-external-link-alt mr-1"></i> Open/Download
                    </a>
                </div>

                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <i class="fab fa-google-drive absolute left-3 top-2.5 text-gray-500"></i>
                        <input type="text" id="resumeLinkInput" placeholder="Paste Google Drive / Docs Link here..." 
                            class="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 pl-9 border">
                    </div>
                    
                    <button type="button" id="btnSaveLink" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium transition">
                        <i class="fas fa-link mr-1"></i> Save Link
                    </button>
                </div>
            </div>

        </div>
    </div>

    <div id="exportModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center hidden z-[70] p-4 transition-opacity duration-300">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-800 flex items-center">
                    <i class="fas fa-file-export text-blue-600 mr-2"></i> Export Data
                </h2>
                <button id="closeExportModal" class="text-gray-400 hover:text-gray-600 transition">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto">
                
                <div class="mb-8 p-4 border border-blue-100 bg-blue-50 rounded-lg hover:shadow-md transition">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 bg-blue-100 rounded-full p-2 text-blue-600">
                            <i class="fas fa-table fa-lg"></i>
                        </div>
                        <div class="ml-4 flex-1">
                            <h3 class="text-lg font-bold text-gray-800">Quick Export (Current View)</h3>
                            <p class="text-sm text-gray-600 mt-1">
                                Download exactly what you see on the screen. This respects your current filters, hidden columns, and sort order.
                            </p>
                            <button id="btnQuickExport" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 transition">
                                Download Now
                            </button>
                        </div>
                    </div>
                </div>

                <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-gray-300"></div>
                    <span class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">OR USE A TEMPLATE</span>
                    <div class="flex-grow border-t border-gray-300"></div>
                </div>

                <div class="mt-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Custom Template Export</h3>
                    <p class="text-sm text-gray-500 mb-4">
                        Need a specific format for Payroll or Gov't? Upload a CSV file with <strong>just the headers</strong> (e.g., "Worker Name", "Hired Date") and map them to our system fields.
                    </p>
                    
                    <div class="flex items-center gap-3 mb-4">
                        <input type="file" id="templateFileInput" accept=".csv" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>


                    <div id="mappingContainer" class="hidden border rounded-lg overflow-hidden mt-4 shadow-sm">
                                        
                        <div class="bg-blue-50 p-3 border-b flex justify-between items-center gap-4">
                            <div class="flex items-center gap-2 flex-1">
                                <label class="text-xs font-bold text-blue-800 uppercase whitespace-nowrap"><i class="fas fa-bookmark mr-1"></i> Saved Templates:</label>
                                <select id="savedTemplatesSelect" class="text-xs border-blue-200 rounded w-full focus:ring-blue-500 bg-white">
                                    <option value="">- Select a template to apply -</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="btnSaveTemplate" class="text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 font-semibold transition">
                                    <i class="fas fa-save"></i> Save Map
                                </button>
                                <button id="btnDeleteTemplate" class="text-xs bg-white border border-red-200 text-red-500 px-2 py-1.5 rounded hover:bg-red-50 transition" title="Delete Selected Template">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div class="bg-gray-100 px-4 py-2 border-b flex justify-between font-bold text-xs text-gray-600 uppercase">
                            <div class="w-1/2">CSV Header (From File)</div>
                            <div class="w-1/2">Map to System Field</div>
                        </div>
                        
                        <div id="mappingList" class="max-h-60 overflow-y-auto bg-white p-2 space-y-2">
                            </div>
                        
                        <div class="p-3 bg-gray-50 border-t text-right">
                            <button id="btnExecuteCustomExport" class="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition">
                                Export Custom CSV
                            </button>
                        </div>
                    </div>



                </div>

            </div>
        </div>
    </div>

    <div id="analyticsModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 z-[9999] flex items-center justify-center">
        <div class="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            
            <div class="bg-indigo-500 text-white p-4 flex justify-between items-center shadow-md">
                <div>
                    <h2 class="text-xl font-bold"><i class="fas fa-chart-bar mr-2"></i> Custom Analytics Report</h2>
                    <p class="text-xs text-indigo-200">Generate real-time reports based on current applicant data.</p>
                </div>
                <button id="closeAnalyticsBtn" class="text-indigo-200 hover:text-white transition">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>

            <div class="flex flex-1 overflow-hidden">
                
                <div class="w-1/4 bg-gray-50 border-r border-gray-200 p-5 flex flex-col gap-6 overflow-y-auto">
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">1. Group By (Categories)</label>
                        <select id="an_groupBy" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                            <option value="recruitment_status_text">Recruitment Status</option>
                            <option value="position_applied">Position Applied</option>
                            <option value="recruiter_name">Recruiter</option>
                            <option value="application_source">Source</option>
                            <option value="gender">Gender</option>
                            <option value="education_level">Education Level</option>
                            <option value="screening_status">Screening Status</option>
                            <option value="city">City</option>
                            <option value="final_interviewer_id">Final Interviewer</option>
                            <option value="initial_interviewer_id">Initial Interviewer</option>
                            <option value="interview_year_month">Interview Date (Month)</option>
                        </select>
                    </div>

                    

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">2. Metric (Values)</label>
                        <select id="an_metric" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                            <option value="count">Count of Applicants</option>
                            <option value="avg_score">Average Screening Score</option>
                            <option value="avg_age">Average Age</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Location</label>
                        <select id="an_location" class="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            <option value="All">All Locations</option>
                            <option value="Subic">Subic</option>
                            <option value="Clark">Clark</option>
                        </select>
                    </div>

                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <label class="block text-xs font-bold text-blue-800 uppercase mb-2">3. Data Scope</label>
                        
                        <label class="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer mb-3">
                            <input type="checkbox" id="an_exclude_archived" class="rounded text-indigo-600 focus:ring-indigo-500" checked>
                            <span>Exclude Archived</span>
                        </label>

                        <div class="pt-2 border-t border-blue-200">
                            <label class="block text-[10px] font-bold text-blue-600 uppercase mb-1">Filter by Date:</label>
                            
                            <select id="an_dateField" class="w-full mb-2 p-1.5 text-xs border border-blue-300 rounded text-blue-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none">
                                <option value="">(None) Use All Data</option>
                                <option value="application_date">Application Date</option>
                                <option value="interview_dates">Interview Date</option>
                                <option value="offer_date">Offer Date</option>
                                <option value="joining_date">Joining Date</option>
                                <option value="status_date">Last Status Update</option>
                            </select>

                            <div class="relative">
                                <i class="fas fa-calendar-alt absolute left-2 top-2 text-gray-400"></i>
                                <input type="text" id="an_dateRange" class="w-full p-1.5 pl-7 text-xs border border-blue-300 rounded bg-white disabled:bg-gray-100 disabled:text-gray-400 transition" placeholder="Select date range..." disabled>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-2">4. Visualization</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button class="an-view-btn active bg-indigo-100 text-indigo-700 border border-indigo-300 p-2 rounded text-center text-sm font-bold hover:bg-indigo-200 transition" data-view="bar">
                                <i class="fas fa-chart-bar"></i><br>Bar
                            </button>
                            <button class="an-view-btn bg-white text-gray-600 border border-gray-300 p-2 rounded text-center text-sm font-bold hover:bg-gray-50 transition" data-view="pie">
                                <i class="fas fa-chart-pie"></i><br>Pie
                            </button>
                            <button class="an-view-btn bg-white text-gray-600 border border-gray-300 p-2 rounded text-center text-sm font-bold hover:bg-gray-50 transition" data-view="table">
                                <i class="fas fa-table"></i><br>Data
                            </button>
                        </div>
                    </div>

                    <div class="mt-auto">
                        <button id="an_generateBtn" class="w-full bg-indigo-500 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 shadow-lg transition transform active:scale-95">
                            <i class="fas fa-sync-alt mr-2"></i> Generate Report
                        </button>
                    </div>
                </div>

                <div class="w-3/4 bg-white p-6 flex flex-col relative">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 id="an_reportTitle" class="text-lg font-bold text-gray-800">Applicant Distribution by Status</h3>
                        <button id="an_exportBtn" class="text-sm text-green-600 hover:text-green-800 font-bold">
                            <i class="fas fa-file-csv mr-1"></i> Export Data
                        </button>
                    </div>

                    <div id="an_chartContainer" class="flex-1 relative w-full h-full min-h-[300px]">
                        <canvas id="an_chartCanvas"></canvas>
                    </div>

                    <div id="an_tableContainer" class="hidden flex-1 overflow-auto border rounded-lg">
                        <table class="min-w-full leading-normal">
                            <thead class="bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Category</th>
                                    <th class="px-5 py-3 border-b-2 border-gray-200 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Value</th>
                                    <th class="px-5 py-3 border-b-2 border-gray-200 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Percentage</th>
                                </tr>
                            </thead>
                            <tbody id="an_tableBody"></tbody>
                        </table>
                    </div>

                    <div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex gap-6">
                        <p><strong>Total Records:</strong> <span id="an_totalRecords">0</span></p>
                        <p><strong>Top Category:</strong> <span id="an_topCategory">-</span></p>
                    </div>
                </div>
            </div>
        </div>
    </div>


</div>
    

    <script src="../js/hr_dashboard.js"></script>
    <script src="../js/hr_bulk_upload.js"></script>
    <script src="../js/hr_logs.js"></script>
    <script src="../js/hr_dashboard_bulk_actions.js"></script>
</body>
</html>