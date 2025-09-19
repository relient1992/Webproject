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

<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/paparse.min.js"></script>
</head>
<body>

<div class="container">
        <h1>BPS Dashboard Manager</h1>
        <div class="main-actions">
            <!-- <button class="btn-add" id="addNewBtn">Add New Record</button> -->
            <button class="btn-import" id="importBtn">Advanced Import</button>
        </div>
        <div id="table-container">
            <!-- <p>Loading data...</p> -->
        </div>
    </div>

    <!-- Add/Edit Modal -->
    <div id="dataModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add Record</h2>
            </div>
            <form id="dataForm">
                <!-- UPDATED: The name attribute is now 'record_id' -->
                <input type="hidden" id="recordId" name="record_id">
                
                <div class="form-group">
                    <label for="metric_name">Metric Name</label>
                    <input type="text" id="metric_name" name="metric_name" required>
                </div>
                <div class="form-group">
                    <label for="metric_value">Metric Value</label>
                    <input type="text" id="metric_value" name="metric_value" required>
                </div>
                <div class="form-group">
                    <label for="details">Details</label>
                    <textarea id="details" name="details" rows="4"></textarea>
                </div>
                <button type="submit" class="btn-save">Save</button>
                <button type="button" class="btn-cancel" data-modal-id="dataModal">Cancel</button>
            </form>
        </div>
    </div>


    <!-- Advanced Import Modal -->
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
                
                <div class="form-group">
                    <label>Import Mode:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="importMode" value="overwrite" checked> Overwrite</label>
                        <label><input type="radio" name="importMode" value="append"> Append</label>
                    </div>
                </div>

                <p>Select the date range to apply this action to:</p>
                <div class="form-group">
                    <label for="startDate">Start Date</label>
                    <input type="date" id="startDate" name="startDate">
                </div>
                <div class="form-group">
                    <label for="endDate">End Date</label>
                    <input type="date" id="endDate" name="endDate">
                </div>
                <button type="button" class="btn-save" id="processImportBtn">Process Import</button>
            </div>

            <div id="import-feedback" style="display: none;">
                <div class="loader"></div>
                <p id="feedbackText">Processing... Please wait.</p>
            </div>

            <button type="button" class="btn-cancel" data-modal-id="importModal">Cancel</button>
        </div>
    </div>

    <script src="../js/database_update.js"></script>
</body>
</html>