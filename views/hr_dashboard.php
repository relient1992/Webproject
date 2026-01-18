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
                     <button id="downloadTemplateBtn" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-download mr-2"></i>Template</button>
                     <button id="bulkUploadBtn" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600"><i class="fas fa-upload mr-2"></i>Bulk Upload</button>
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
                        <option value="firstname">Firstname</option>
                        <option value="surname">Surname</option>
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
                    <button type="submit" class="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700">Upload</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../js/hr_dashboard.js"></script>
    <script src="../js/hr_bulk_upload.js"></script>
    <script src="../js/hr_logs.js"></script>
    <script src="../js/hr_dashboard_bulk_actions.js"></script>
</body>
</html>