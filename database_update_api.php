<?php

header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// Create connection
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'create':
        createRecord($conn);
        break;
    case 'read':
        readRecords($conn);
        break;
    case 'read_single':
        readSingleRecord($conn);
        break;
    case 'update':
        updateRecord($conn);
        break;
    case 'delete':
        deleteRecord($conn);
        break;
    
    // --- MODIFIED: Renamed for clarity ---
    case 'bulk_import_csv': // For single-file BPS Dashboard
        bulkImportCsv($conn);
        break;
    
    // --- NEW: For multi-file Efficiency Update ---
    case 'bulk_import_multi_csv':
        bulkImportMultiCsv($conn);
        break;
        
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}

$conn->close();

// --- FUNCTIONS ---

// --- EXISTING CRUD FUNCTIONS (Unchanged) ---
function createRecord($conn) {
    // ... (your existing createRecord function)
    $metric_name = $_POST['metric_name'] ?? '';
    $metric_value = $_POST['metric_value'] ?? '';
    $details = $_POST['details'] ?? '';

    if (empty($metric_name) || empty($metric_value)) {
        echo json_encode(['status' => 'error', 'message' => 'Metric Name and Value are required.']);
        exit();
    }
    $stmt = $conn->prepare("INSERT INTO bps_dashboard (Taskname, Records, `Task PROJECT`) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $metric_name, $metric_value, $details);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Record added successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to add record: ' . $stmt->error]);
    }
    $stmt->close();
}

function readRecords($conn) {
    // ... (your existing readRecords function)
    $sql = "SELECT record_id, Taskname as metric_name, Records as metric_value, `Task PROJECT` as details, proddate FROM bps_dashboard ORDER BY record_id DESC";
    $result = $conn->query($sql);
    
    $records = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }
    }
    echo json_encode($records);
}

function readSingleRecord($conn) {
    // ... (your existing readSingleRecord function)
    $record_id = $_GET['record_id'] ?? 0;
    if ($record_id <= 0) {
        echo json_encode(null);
        exit();
    }
    $stmt = $conn->prepare("SELECT record_id, Taskname as metric_name, Records as metric_value, `Task PROJECT` as details FROM bps_dashboard WHERE record_id = ?");
    $stmt->bind_param("i", $record_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result->fetch_assoc();
    echo json_encode($record);
    $stmt->close();
}

function updateRecord($conn) {
    // ... (your existing updateRecord function)
    $record_id = $_POST['record_id'] ?? 0;
    $metric_name = $_POST['metric_name'] ?? '';
    $metric_value = $_POST['metric_value'] ?? '';
    $details = $_POST['details'] ?? '';

    if (empty($record_id) || empty($metric_name) || empty($metric_value)) {
        echo json_encode(['status' => 'error', 'message' => 'Record ID, Metric Name, and Value are required for update.']);
        exit();
    }
    $stmt = $conn->prepare("UPDATE bps_dashboard SET Taskname = ?, Records = ?, `Task PROJECT` = ? WHERE record_id = ?");
    $stmt->bind_param("sssi", $metric_name, $metric_value, $details, $record_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Record updated successfully.']);
        } else {
            echo json_encode(['status' => 'success', 'message' => 'No changes were made to the record.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update record: ' . $stmt->error]);
    }
    $stmt->close();
}

function deleteRecord($conn) {
    // ... (your existing deleteRecord function)
    $record_id = $_POST['record_id'] ?? 0;
    if (empty($record_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Record ID is required.']);
        exit();
    }
    $stmt = $conn->prepare("DELETE FROM bps_dashboard WHERE record_id = ?");
    $stmt->bind_param("i", $record_id);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Record deleted successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete record: ' . $stmt->error]);
    }
    $stmt->close();
}

// --- MODIFIED: Your original function, now named *Csv ---
// This handles the JSON payload from PapaParse for 'BPS Dashboard'
function bulkImportCsv($conn) {
    $json = file_get_contents('php://input');
    $payload = json_decode($json, true);

    if (!$payload || !isset($payload['data']) || empty($payload['data']) || !isset($payload['startDate']) || !isset($payload['endDate'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or empty request payload.']);
        exit();
    }
    
    $startDate = $payload['startDate'];
    $endDate = $payload['endDate'];
    $importMode = $payload['importMode'] ?? 'overwrite';
    $dataRows = $payload['data'];
    $tableName = 'bps_dashboard'; // Table is fixed
    
    $conn->begin_transaction();
    try {
        $deletedRows = 0;
        if ($importMode === 'overwrite') {
            $deleteSql = "DELETE FROM {$tableName} WHERE proddate BETWEEN ? AND ?";
            $stmt_delete = $conn->prepare($deleteSql);
            if ($stmt_delete === false) throw new Exception("Prepare failed (DELETE): " . $conn->error);
            $stmt_delete->bind_param("ss", $startDate, $endDate);
            $stmt_delete->execute();
            $deletedRows = $stmt_delete->affected_rows;
            $stmt_delete->close();
        }
        
        $csvHeaders = array_keys($dataRows[0]);
        $dbColumns = array_map(fn($col) => "`" . str_replace("`", "``", $col) . "`", $csvHeaders);
        
        $placeholders = rtrim(str_repeat('?,', count($dbColumns)), ',');
        $insertSql = "INSERT INTO {$tableName} (" . implode(',', $dbColumns) . ") VALUES ({$placeholders})";
        $stmt_insert = $conn->prepare($insertSql);
        if ($stmt_insert === false) throw new Exception("Prepare failed (INSERT): " . $conn->error);

        $insertedRows = 0;
        foreach ($dataRows as $row) {
            $params = array_values($row);
            $stmt_insert->bind_param(str_repeat('s', count($dbColumns)), ...$params);
            $stmt_insert->execute();
            $insertedRows++;
        }
        $stmt_insert->close();

        $conn->commit();
        $message = $importMode === 'overwrite' ? "Import complete. Rows deleted: {$deletedRows}. Rows inserted: {$insertedRows}." : "Append complete. Rows inserted: {$insertedRows}.";
        echo json_encode(['status' => 'success', 'message' => $message]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'A database error occurred: ' . $e->getMessage()]);
    }
}


// --- NEW FUNCTION: Handles multi-CSV upload ---
function bulkImportMultiCsv($conn) {
    // Data comes from $_POST and $_FILES (FormData)
    $importMode = $_POST['importMode'] ?? 'overwrite';
    $startDate = $_POST['startDate'] ?? '';
    $endDate = $_POST['endDate'] ?? '';

    if (empty($startDate) || empty($endDate)) {
        echo json_encode(['status' => 'error', 'message' => 'Start Date and End Date are required.']);
        exit();
    }
    
    // Check if the 'csvFiles' array was sent and is not empty
    if (!isset($_FILES['csvFiles']) || empty($_FILES['csvFiles']['name'][0])) {
         echo json_encode(['status' => 'error', 'message' => 'No files were uploaded.']);
         exit();
    }
    
    $files = $_FILES['csvFiles'];
    $processedFiles = [];
    $totalInserted = 0;
    $totalDeleted = 0;

    $conn->begin_transaction();
    try {
        // Loop through each uploaded file
        for ($i = 0; $i < count($files['name']); $i++) {
            $fileName = $files['name'][$i];
            $tmpPath  = $files['tmp_name'][$i];
            $error    = $files['error'][$i];

            if ($error !== UPLOAD_ERR_OK) {
                $processedFiles[] = "Skipped '{$fileName}': Upload error.";
                continue;
            }

            // Get table name from file name (e.g., "BPS_DTR.csv" -> "BPS_DTR")
            $tableName = pathinfo($fileName, PATHINFO_FILENAME);
            
            // --- Process this single CSV file ---
            $result = processSingleCsvFile($conn, $tableName, $tmpPath, $importMode, $startDate, $endDate);
            
            $totalDeleted += $result['deleted'];
            $totalInserted += $result['inserted'];
            $processedFiles[] = "Processed '{$tableName}': {$result['message']}";
        }

        $conn->commit();
        echo json_encode([
            'status' => 'success',
            'message' => "Multi-file import complete. Total Deleted: {$totalDeleted}. Total Inserted: {$totalInserted}.",
            'details' => $processedFiles
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Error during import: ' . $e->getMessage()]);
    }
}


// --- NEW HELPER FUNCTION: Imports a single CSV file ---
function processSingleCsvFile($conn, $tableName, $csvTmpPath, $importMode, $startDate, $endDate) {
    $fileHandle = fopen($csvTmpPath, 'r');
    if ($fileHandle === false) {
        throw new Exception("Could not open file: {$tableName}.csv");
    }

    // Read header row
    $headers = fgetcsv($fileHandle);
    if ($headers === false) {
        throw new Exception("Could not read header from: {$tableName}.csv");
    }
    
    // --- Find the date column for filtering ---
    $dateColumn = ''; 
    $headerLower = array_map('strtolower', $headers);
    
    // Find the first matching date column based on your tables
    if (in_array('month', $headerLower)) $dateColumn = 'Month';
    elseif (in_array('date', $headerLower)) $dateColumn = 'Date';
    elseif (in_array('date_transferred', $headerLower)) $dateColumn = 'DATE_TRANSFERRED';
    
    // --- Overwrite logic ---
    $deletedRows = 0;
    if ($importMode === 'overwrite') {
        if (empty($dateColumn)) {
            // If no date column, we can't overwrite by date.
            // As a safety, we'll skip delete. Or you could TRUNCATE.
            // For now, we'll throw an error.
            throw new Exception("Cannot overwrite '{$tableName}': No valid date column (Month, Date) found.");
        }
        
        // Sanitize table and column names
        $safeTable = "`" . str_replace("`", "``", $tableName) . "`";
        $safeDateCol = "`" . str_replace("`", "``", $dateColumn) . "`";

        $deleteSql = "DELETE FROM {$safeTable} WHERE {$safeDateCol} BETWEEN ? AND ?";
        $stmt_delete = $conn->prepare($deleteSql);
        if ($stmt_delete === false) {
             throw new Exception("Prepare failed (DELETE) on table '{$tableName}': " . $conn->error);
        }
        $stmt_delete->bind_param("ss", $startDate, $endDate);
        $stmt_delete->execute();
        $deletedRows = $stmt_delete->affected_rows;
        $stmt_delete->close();
    }

    // --- Dynamic INSERT ---
    $dbColumns = array_map(fn($col) => "`" . trim(str_replace("`", "``", $col)) . "`", $headers);
    $placeholders = rtrim(str_repeat('?,', count($dbColumns)), ',');
    $insertSql = "INSERT INTO `{$tableName}` (" . implode(',', $dbColumns) . ") VALUES ({$placeholders})";
    
    $stmt_insert = $conn->prepare($insertSql);
    if ($stmt_insert === false) {
         throw new Exception("Prepare failed (INSERT) on table '{$tableName}': " . $conn->error . ". Do CSV headers match table columns?");
    }

    $insertedRows = 0;
    $paramTypes = str_repeat('s', count($dbColumns)); // Bind all as strings

    // Read and insert data rows
    while (($row = fgetcsv($fileHandle)) !== FALSE) {
        // Handle rows with empty values, fgetcsv provides them as null or empty string
        $params = [];
        for ($i=0; $i < count($headers); $i++) {
            $params[] = (isset($row[$i]) && $row[$i] !== '') ? $row[$i] : null;
        }

        $stmt_insert->bind_param($paramTypes, ...$params);
        $stmt_insert->execute();
        $insertedRows++;
    }
    
    fclose($fileHandle);
    $stmt_insert->close();

    $message = ($importMode === 'overwrite') ? "Deleted: {$deletedRows}, Inserted: {$insertedRows}" : "Appended: {$insertedRows}";
    return ['deleted' => $deletedRows, 'inserted' => $insertedRows, 'message' => $message];
}
?>