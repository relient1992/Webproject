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
$ADMIN_UPLOAD_PASSWORD = "MySecurePassword123!"; 

$inputPassword = $_POST['password'] ?? '';
if ($inputPassword !== $ADMIN_UPLOAD_PASSWORD) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Incorrect Admin Password.']);
    exit();
}

$mode = $_POST['mode'] ?? 'append'; // 'append' or 'overwrite'

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

// Read headers
$headers = fgetcsv($fileHandle);
if ($headers === false) {
    echo json_encode(['success' => false, 'message' => 'File is empty or invalid.']);
    exit();
}

// Standardize headers to match database exactly
$dbColumns = array_map(function($col) {
    // Remove BOM or weird hidden characters Excel sometimes adds
    $clean = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', trim($col));
    return "`" . str_replace("`", "``", $clean) . "`";
}, $headers);

$conn->begin_transaction();

try {
    $insertedRows = 0;
    $deletedRows = 0;
    $uniqueDatesInFile = [];
    $rowsToInsert = [];

    // Parse all rows first to find dates for "Overwrite" logic
    while (($row = fgetcsv($fileHandle)) !== FALSE) {
        // Skip empty rows
        if(empty(array_filter($row))) continue;

        $rowData = [];
        for ($i = 0; $i < count($headers); $i++) {
            $val = (isset($row[$i]) && trim($row[$i]) !== '') ? trim($row[$i]) : null;
            
            // Format Date safely for MySQL (e.g., converts '1/01/2025' to '2025-01-01')
            if (strcasecmp(trim($headers[$i]), 'Dated') == 0 && $val !== null) {
                $val = date('Y-m-d', strtotime(str_replace('/', '-', $val)));
                $uniqueDatesInFile[$val] = true;
            }
            
            $rowData[] = $val;
        }
        $rowsToInsert[] = $rowData;
    }
    fclose($fileHandle);

    // --- OVERWRITE LOGIC ---
    // If overwrite, delete existing records that match the exact dates found in the uploaded file
    if ($mode === 'overwrite' && !empty($uniqueDatesInFile)) {
        $datesList = array_keys($uniqueDatesInFile);
        $placeholders = implode(',', array_fill(0, count($datesList), '?'));
        
        $deleteSql = "DELETE FROM `financial_data` WHERE `Dated` IN ($placeholders)";
        $stmt_delete = $conn->prepare($deleteSql);
        
        // Bind the array of dates dynamically
        $stmt_delete->bind_param(str_repeat('s', count($datesList)), ...$datesList);
        $stmt_delete->execute();
        $deletedRows = $stmt_delete->affected_rows;
        $stmt_delete->close();
    }

    // --- INSERT LOGIC ---
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

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => 'Error during import: ' . $e->getMessage()]);
}
?>