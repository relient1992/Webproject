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
    <title>BPS Dashboard Manager</title>
    <link rel="stylesheet" href="../database_update.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
</head>
<body>

    <div class="container">
        <h1>BPS Dashboard Manager</h1>
        <div class="main-actions">
            <button class="btn-add" id="addNewBtn">Add New Record</button>
            <button class="btn-import" id="importBtn">Advanced Import</button>
        </div>
        <div id="table-container">
            <p>Loading data...</p>
        </div>
    </div>

    <div id="dataModal" class="modal">
        </div>


    <div id="importModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Advanced CSV Import</h2>
            </div>
            
            <div id="import-stage-1">
                <div class="form-group">
                    <label for="importType">Import For:</label>
                    <select id="importType" name="importType">
                        <option value="bps_dashboard" selected>BPS Dashboard</option>
                        <option value="sales_data">Sales Data (Example)</option>
                        <option value="inventory_log">Inventory Log (Example)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="csvFile">Select CSV File</label>
                    <input type="file" id="csvFile" name="csvFile" accept=".csv">
                </div>
                <button type="button" class="btn-analyze" id="analyzeBtn">Analyze CSV</button>
            </div>

            <div id="import-stage-2" style="display: none;">
                <p><strong>Analysis Complete.</strong></p>
                <p id="analysisResult"></p>
                <p>Select the date range you wish to overwrite in the database:</p>
                <div class="form-group">
                    <label for="startDate">Start Date</label>
                    <input type="date" id="startDate" name="startDate">
                </div>
                <div class="form-group">
                    <label for="endDate">End Date</label>
                    <input type="date" id="endDate" name="endDate">
                </div>
                <button type="button" class="btn-save" id="processImportBtn">Import & Overwrite</button>
            </div>

            <div id="import-feedback" style="display: none;">
                <div class="loader"></div>
                <p id="feedbackText">Processing... Please wait.</p>
            </div>

            <button type="button" class="btn-cancel" id="cancelImportBtn">Cancel</button>
        </div>
    </div>

    <script src="../js/database_update.js"></script>
</body>
</html>