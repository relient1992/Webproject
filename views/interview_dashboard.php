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
    <title>Interviewer Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <style>
        /* INTERVIEWER DASHBOARD SPECIFIC STYLES */
        body {
            background-color: #f3f4f6; /* Light Gray Background */
        }
        
        /* Hide the Close Button specifically on this page */
        #closeNotifModal, #dismissNotifBtn {
            display: none !important;
        }

        /* Make the modal look like a static card */
        #notificationModal {
            position: relative !important; /* Not fixed */
            display: flex !important; /* Always show */
            background-color: transparent !important; /* No dark overlay */
            height: auto !important;
            margin-top: 2rem;
            margin-bottom: 2rem;
            z-index: 1;
        }

        /* Adjust card shadow and width for main view */
        #notificationModal > div {
            width: 100% !important;
            max-width: 1000px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
    </style>
</head>
<body class="flex flex-col min-h-screen">

    <nav class="bg-purple-800 shadow-md px-6 py-4 flex justify-between items-center">
        <div class="flex items-center text-white">
            <i class="fas fa-user-clock text-2xl mr-3"></i>
            <div>
                <h1 class="font-bold text-lg tracking-wide">INTERVIEWER PORTAL</h1>
                <p class="text-xs text-purple-200">Welcome, <?php echo $_SESSION['firstname'] ?? 'User'; ?></p>
            </div>
        </div>
        <button id="logoutBtn" class="bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold py-2 px-4 rounded transition border border-purple-500">
            <i class="fas fa-sign-out-alt mr-2"></i> Logout
        </button>
    </nav>

    <main class="flex-1 flex justify-center items-start px-4">
        
        <div id="notificationModal" class="hidden"> <div class="bg-white rounded-xl shadow-2xl w-full flex flex-col h-[80vh]">
                
                <div class="p-5 border-b bg-white rounded-t-xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800"><i class="fas fa-calendar-check text-purple-600 mr-2"></i>My Schedule</h3>
                        <p class="text-sm text-gray-500">Pending interviews assigned to you.</p>
                    </div>

                    <div class="flex items-center space-x-3">
                        <div class="bg-gray-100 p-1 rounded-lg flex text-sm font-bold" id="notifTabs">
                            <!-- <button class="px-4 py-2 rounded-md bg-white text-purple-700 shadow transition" data-filter="all">All</button> -->
                            <!-- <button class="px-4 py-2 rounded-md text-gray-500 hover:text-gray-700 transition" data-filter="initial">Initial</button> -->
                            <button class="px-4 py-2 rounded-md text-gray-500 hover:text-gray-700 transition" data-filter="final">Final</button>
                        </div>
                        
                        <select id="notifSortSelect" class="text-sm border-gray-300 bg-gray-50 rounded-lg focus:ring-purple-500 p-2 border">
                            <option value="asc">📅 Oldest First (Urgent)</option>
                            <option value="desc">📅 Newest First</option>
                        </select>
                        
                        <button id="closeNotifModal"></button>
                    </div>
                </div>

                <div class="overflow-y-auto p-4 space-y-3 bg-gray-50 flex-1" id="notificationList">
                    <div class="flex flex-col items-center justify-center h-full text-gray-400">
                        <i class="fas fa-spinner fa-spin text-4xl mb-3"></i>
                        <p>Loading your schedule...</p>
                    </div>
                </div>
                
                <div class="p-4 border-t bg-white rounded-b-xl flex justify-between items-center">
                    <span class="text-sm text-gray-500" id="notifPageInfo">Loading...</span>
                    
                    <div class="flex items-center gap-2">
                        <button id="notifPrevBtn" class="px-4 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-sm disabled:opacity-50 font-medium">Previous</button>
                        <button id="notifNextBtn" class="px-4 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-sm disabled:opacity-50 font-medium">Next</button>
                        <button id="dismissNotifBtn"></button>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <div id="resumeModal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center">
        <div class="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
            
            <div class="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
                <div>
                    <h3 class="text-xl font-bold text-gray-800" id="resumeModalTitle">Applicant Resume</h3>
                    <p class="text-xs text-gray-500">View attached document.</p>
                </div>
                <button onclick="document.getElementById('resumeModal').classList.add('hidden'); document.getElementById('resumeFrame').src='';" class="text-gray-400 hover:text-gray-600 focus:outline-none">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>

            <div class="flex-1 bg-gray-200 p-4 overflow-hidden relative" id="resumeViewerContainer">
                <iframe id="resumeFrame" class="w-full h-full bg-white shadow hidden" src=""></iframe>
                <div id="noResumeState" class="flex flex-col items-center justify-center h-full text-gray-500 hidden">
                    <i class="fas fa-file-excel text-6xl mb-4 text-gray-300"></i>
                    <p class="text-lg">No resume available.</p>
                </div>
            </div>

            <div class="p-4 border-t bg-white flex flex-col gap-3">
                
                <div class="flex justify-between items-center border-b pb-3" id="resumeModalFooterRow1">
                    <form id="resumeUploadForm" class="flex items-center gap-2">
                        <input type="hidden" id="resume_app_id" name="application_id">
                        <input type="file" id="resumeFile" name="resume" accept=".pdf,.doc,.docx,.jpg,.png" class="hidden">
                        
                        <button type="button" onclick="document.getElementById('resumeFile').click()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow text-sm font-medium transition">
                            <i class="fas fa-upload mr-2"></i> Upload File
                        </button>
                        <span id="fileNameDisplay" class="text-xs text-gray-500 truncate max-w-[150px]"></span>
                    </form>

                    <!-- <a id="downloadResumeBtn" href="#" target="_blank" class="text-blue-600 hover:underline text-sm font-medium hidden">
                        <i class="fas fa-external-link-alt mr-1"></i> Open/Download
                    </a> -->
                </div>

                <div class="flex items-center gap-2" id="resumeLinkRow">
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

    <script src="../js/hr_dashboard.js"></script> 

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (logoutBtn) {
                // remove any existing listeners just in case
                const newBtn = logoutBtn.cloneNode(true);
                logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);

                newBtn.addEventListener('click', () => {
                    Swal.fire({
                        title: 'Are you sure?',
                        text: "You will be logged out.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Yes, log out'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Clear the notification flag
                            sessionStorage.removeItem('notifSeen');
                            
                            Swal.fire({ 
                                title: 'Logging out...', 
                                allowOutsideClick: false, 
                                didOpen: () => { Swal.showLoading(); } 
                            });
                            
                            // Redirect to logout
                            setTimeout(() => { 
                                window.location.href = '../logout.php'; 
                            }, 800);
                        }
                    });
                });
            }
        });
    </script>

</body>
</html>