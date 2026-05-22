<?php
header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
$servername = "10.200.168.89"; // Adjust if testing locally
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- ADMIN SECURITY ---
// Set your secure upload password here
$ADMIN_UPLOAD_PASSWORD = "FP&A2026!"; 

$inputPassword = $_POST['password'] ?? '';
if ($inputPassword !== $ADMIN_UPLOAD_PASSWORD) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Incorrect Admin Password.']);
    exit();
}

$mode = $_POST['mode'] ?? 'append'; // 'append' or 'overwrite'
$dataset = $_POST['dataset'] ?? 'financial'; // 'financial' or 'headcount'

// --- FILE UPLOAD CHECK ---
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No valid file uploaded.']);
    exit();
}

$csvTmpPath = $_FILES['file']['tmp_name'];
$fileHandle = fopen($csvTmpPath, 'r');

if ($fileHandle === false) {
    echo json_encode(['success' => false, 'message' => 'Could not read the uploaded file.']);
    exit();
}

$conn->begin_transaction();

try {
    // ==============================================================
    // ROUTE 1: DETAILED HEADCOUNT IMPORT
    // ==============================================================
    if ($dataset === 'headcount') {
        
        $originalFileName = $_FILES['file']['name'];
        // Remove the date string and .csv from the filename (e.g. LHI_Headcount_20260521_205610.csv -> LHI_Headcount)
        $cleanFileName = preg_replace('/_\d{8}_\d{6}\.csv$/i', '', $originalFileName);
        
        $headers = fgetcsv($fileHandle); // Read and skip the first row (headers)
        
        $rowsToInsert = [];
        $uniqueMonths = [];
        
        while (($row = fgetcsv($fileHandle)) !== FALSE) {
            // Skip empty rows
            if(empty(array_filter($row))) continue;
            
            // Format Date safely for MySQL
            $dated = $row[1] ?? '';
            if (!empty($dated)) {
                $timestamp = strtotime($dated);
                if ($timestamp !== false) {
                    $row[1] = date('Y-m-d', $timestamp); // Replaces array val with strict YYYY-MM-DD
                    $monthKey = date('Y-m', $timestamp); // Track the YYYY-MM for Overwrite logic
                    $uniqueMonths[$monthKey] = true;
                }
            }
            $rowsToInsert[] = $row;
        }
        
        // --- HEADCOUNT OVERWRITE LOGIC ---
        // If overwrite, delete existing records for the months and filename found in THIS file
        if ($mode === 'overwrite' && !empty($uniqueMonths)) {
            foreach (array_keys($uniqueMonths) as $month) {
                $stmt_delete = $conn->prepare("DELETE FROM `financial_headcount_detailed` WHERE DATE_FORMAT(`dated`, '%Y-%m') = ? AND `filename` = ?");
                $stmt_delete->bind_param("ss", $month, $cleanFileName);
                $stmt_delete->execute();
                $stmt_delete->close();
            }
        }
        
        // --- HEADCOUNT INSERT LOGIC ---
        $insertSql = "INSERT INTO `financial_headcount_detailed` 
            (`filename`, `project_code`, `dated`, `empid`, `empname`, `groupname`, `type`, `site`, `location`, `efforthours`, `headcount`, `region`, `position`, `function_name`, `status`, `plm_lob`, `entity`, `plm_project_name`, `cost_pct`, `cost`, `dept_based_on_summary`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
        $stmt_insert = $conn->prepare($insertSql);
        if (!$stmt_insert) {
            throw new Exception("SQL Prepare failed: " . $conn->error);
        }
        
        $insertedRows = 0;
        foreach ($rowsToInsert as $r) {
            // Pad array to avoid undefined index notices if a row is short
            $r = array_pad($r, 20, null);
            
            // Clean numerical fields (remove $, commas, text)
            $effort = isset($r[8]) ? (float)preg_replace('/[^\d\.\-]/', '', $r[8]) : 0;
            $hc = isset($r[9]) ? (float)preg_replace('/[^\d\.\-]/', '', $r[9]) : 0;
            $costRaw = isset($r[18]) ? (float)preg_replace('/[^\d\.\-]/', '', $r[18]) : 0;

            // Bind 21 variables: 9 Strings, 2 Doubles, 8 Strings, 1 Double, 1 String
            $stmt_insert->bind_param("sssssssssddssssssssds", 
                $cleanFileName, 
                $r[0], $r[1], $r[2], $r[3], $r[4], $r[5], $r[6], $r[7], 
                $effort, $hc, 
                $r[10], $r[11], $r[12], $r[13], $r[14], $r[15], $r[16], $r[17], 
                $costRaw, $r[19]
            );
            $stmt_insert->execute();
            $insertedRows++;
        }
        $stmt_insert->close();
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => "Import successful! Processed $insertedRows headcount records."]);

    } 
    // ==============================================================
    // ROUTE 2: EXISTING FINANCIAL P&L IMPORT
    // ==============================================================
    else {
        
        $headers = fgetcsv($fileHandle);
        if ($headers === false) {
            throw new Exception("File is empty or invalid.");
        }

        // Standardize headers to match database exactly
        $dbColumns = array_map(function($col) {
            $clean = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', trim($col));
            return "`" . str_replace("`", "``", $clean) . "`";
        }, $headers);

        $insertedRows = 0;
        $deletedRows = 0;
        $uniqueDatesInFile = [];
        $rowsToInsert = [];

        // Parse all rows first to find dates for "Overwrite" logic
        while (($row = fgetcsv($fileHandle)) !== FALSE) {
            if(empty(array_filter($row))) continue;

            $rowData = [];
            for ($i = 0; $i < count($headers); $i++) {
                $val = (isset($row[$i]) && trim($row[$i]) !== '') ? trim($row[$i]) : null;
                
                if (strcasecmp(trim($headers[$i]), 'Dated') == 0 && $val !== null) {
                    $timestamp = strtotime($val);
                    if ($timestamp !== false) {
                        $val = date('Y-m-d', $timestamp);
                        $uniqueDatesInFile[$val] = true;
                    }
                }
                
                $rowData[] = $val;
            }
            $rowsToInsert[] = $rowData;
        }
        
        // --- FINANCIAL OVERWRITE LOGIC ---
        if ($mode === 'overwrite' && !empty($uniqueDatesInFile)) {
            $datesList = array_keys($uniqueDatesInFile);
            $placeholders = implode(',', array_fill(0, count($datesList), '?'));
            
            $deleteSql = "DELETE FROM `financial_data` WHERE `Dated` IN ($placeholders)";
            $stmt_delete = $conn->prepare($deleteSql);
            $stmt_delete->bind_param(str_repeat('s', count($datesList)), ...$datesList);
            $stmt_delete->execute();
            $deletedRows = $stmt_delete->affected_rows;
            $stmt_delete->close();
        }

        // --- FINANCIAL INSERT LOGIC ---
        if (!empty($rowsToInsert)) {
            $placeholders = rtrim(str_repeat('?,', count($dbColumns)), ',');
            $insertSql = "INSERT INTO `financial_data` (" . implode(',', $dbColumns) . ") VALUES ({$placeholders})";
            
            $stmt_insert = $conn->prepare($insertSql);
            if ($stmt_insert === false) {
                 throw new Exception("SQL Prepare failed. Ensure Excel headers exactly match database columns: " . $conn->error);
            }

            $paramTypes = str_repeat('s', count($dbColumns));
            foreach ($rowsToInsert as $params) {
                $stmt_insert->bind_param($paramTypes, ...$params);
                $stmt_insert->execute();
                $insertedRows++;
            }
            $stmt_insert->close();
        }

        $conn->commit();
        $msg = $mode === 'overwrite' ? 
               "Import successful! Deleted $deletedRows old records and inserted $insertedRows new records." : 
               "Import successful! Appended $insertedRows new records.";
               
        echo json_encode(['success' => true, 'message' => $msg]);
    }

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => 'Error during import: ' . $e->getMessage()]);
} finally {
    if (is_resource($fileHandle)) {
        fclose($fileHandle);
    }
}
?>