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
    <style>
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        /* Sortable table headers */
        .sortable { cursor: pointer; position: relative; }
        .sortable:after { font-family: "Font Awesome 6 Free"; font-weight: 900; content: "\f0dc"; position: absolute; right: 10px; color: #cbd5e1; }
        .sortable.asc:after { content: "\f0de"; color: #3b82f6; }
        .sortable.desc:after { content: "\f0dd"; color: #3b82f6; }
        /* Prevent layout shift during loading */
        #tableBody:empty:after { content: "Loading applicant data..."; display: block; text-align: center; padding: 2rem; color: #6b7280; }
        /* Styling for in-table dropdowns */
        .table-select {
            background-color: transparent;
            border: 1px solid transparent;
            border-radius: 0.375rem;
            padding: 0.25rem 0.5rem;
            width: 100%;
            transition: all 0.2s ease-in-out;
        }
        .table-select:hover {
            border-color: #d1d5db; /* gray-300 */
        }
        .table-select:focus {
            outline: none;
            border-color: #3b82f6; /* blue-500 */
            box-shadow: 0 0 0 2px #bfdbfe; /* blue-200 */
        }
         /* Sidebar active link style */
        .filter-link.active {
            background-color: #eff6ff; /* blue-50 */
            color: #2563eb; /* blue-600 */
            font-weight: 600;
        }
    </style>
</head>
<body class="bg-gray-100 font-sans text-gray-800">
    <div class="flex h-screen">
        <!-- Sidebar for Status Filtering -->
        <aside class="w-64 bg-white shadow-md flex-shrink-0 flex flex-col">
            <div class="p-4 border-b">
                <h2 class="text-xl font-bold text-gray-800">Recruitment Filters</h2>
            </div>
            <nav id="statusFilters" class="p-2 flex-1 overflow-y-auto">
                <!-- Status filters will be dynamically inserted here -->
            </nav>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 flex flex-col overflow-hidden">
            <!-- Header -->
            <header class="bg-white shadow-sm p-4 flex justify-between items-center">
                <h1 class="text-2xl font-semibold text-gray-800">Applicant Dashboard</h1>
                <!-- UPDATED: Added View Logs button -->
                <div class="flex items-center gap-4">
                     <button id="viewLogsBtn" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300">
                        <i class="fas fa-history mr-2"></i>View Logs
                    </button>
                     <button id="newApplicantBtn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">
                        <i class="fas fa-plus mr-2"></i>New Applicant
                    </button>
                </div>
            </header>

            <!-- Dashboard Content -->
            <div class="flex-1 p-6 overflow-y-auto">
                <!-- Analytics Section -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Total Applicants</p><p id="totalApplicants" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Interviewing</p><p id="interviewingCount" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Deployed</p><p id="hiredThisMonth" class="text-3xl font-bold">0</p></div>
                    <div class="bg-white p-6 rounded-2xl shadow-md"><p class="text-gray-500 text-sm">Avg. Time to Hire</p><p id="avgTimeToHire" class="text-3xl font-bold">N/A</p></div>
                </div>
                
                <!-- Table Controls -->
                <div class="bg-white p-4 rounded-2xl shadow-md mb-6 flex flex-wrap gap-4 justify-between items-center">
                    <div class="relative w-full md:w-auto flex-grow"><i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i><input type="text" id="searchInput" class="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search applicants..."></div>
                    
                    <!-- NEW: Active/Archived View Toggle -->
                    <div class="flex items-center bg-gray-200 rounded-lg p-1">
                        <button id="viewActiveBtn" class="px-4 py-1 text-sm font-semibold rounded-md bg-white text-blue-600 shadow">Active</button>
                        <button id="viewArchivedBtn" class="px-4 py-1 text-sm font-semibold rounded-md text-gray-600">Archived</button>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <label for="startDate" class="text-sm font-medium">From:</label>
                        <input type="date" id="startDate" class="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <label for="endDate" class="text-sm font-medium">To:</label>
                        <input type="date" id="endDate" class="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <button id="columnToggleBtn" class="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition duration-300"><i class="fas fa-columns mr-2"></i>Columns</button>
                </div>

                <!-- Applicant Data Table -->
                <div class="bg-white rounded-2xl shadow-md overflow-x-auto">
                    <table class="w-full text-sm text-left"><thead id="tableHead" class="bg-gray-50 text-xs uppercase"></thead><tbody id="tableBody"></tbody></table>
                </div>
            </div>
        </main>
    </div>

    <!-- Column Selector Modal -->
    <div id="columnSelector" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h2 class="text-2xl font-bold mb-4">Select Columns to Display</h2>
            <div id="columnCheckboxes" class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto"></div>
            <div class="mt-6 text-right">
                <button id="closeColumnSelector" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Done</button>
            </div>
        </div>
    </div>
    
    <!-- Edit Applicant Modal -->
    <div id="editModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 class="text-2xl font-bold mb-6">Edit Applicant Details</h2>
            <form id="editForm" novalidate>
                <input type="hidden" id="edit_application_id" name="application_id">
                <div id="editFormContent" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
                <div class="mt-8 pt-4 border-t flex justify-between items-center">
                    <!-- UPDATED: Button text changed to Archive -->
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
    <div id="addApplicantModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
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

    <!-- NEW: System Logs Modal -->
    <div id="logsModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <h2 class="text-2xl font-bold mb-4">System Activity Logs</h2>
            <div class="flex-1 overflow-y-auto border rounded-lg">
                <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-xs uppercase sticky top-0">
                        <tr>
                            <th class="px-6 py-3">Timestamp</th>
                            <th class="px-6 py-3">User (ID)</th>
                            <th class="px-6 py-3">Action</th>
                            <th class="px-6 py-3">Description</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody">
                        <!-- Log rows will be inserted here by JavaScript -->
                    </tbody>
                </table>
            </div>
            <div class="mt-6 text-right">
                <button id="closeLogsModal" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Close</button>
            </div>
        </div>
    </div>
    
    <script src="../js/hr_dashboard.js"></script>
</body>
</html>

