<?php

// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
// This is the essential part you correctly pointed out was missing.
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
    case 'bulk_import':
        bulkImport($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}

$conn->close();

// --- FUNCTIONS ---

// NOTE: The CRUD functions below use a simplified mapping for individual record editing.
// This is separate from the dynamic bulk import.
function createRecord($conn) {
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

function bulkImport($conn) {
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
        
        // --- NEW: DYNAMIC COLUMN HANDLING ---
        // 1. Get column headers from the first row of the CSV data
        $csvHeaders = array_keys($dataRows[0]);
        
        // 2. Sanitize and quote column names for the SQL query (handles spaces, special chars)
        $dbColumns = array_map(fn($col) => "`" . str_replace("`", "``", $col) . "`", $csvHeaders);
        
        // 3. Build the dynamic INSERT statement
        $placeholders = rtrim(str_repeat('?,', count($dbColumns)), ',');
        $insertSql = "INSERT INTO {$tableName} (" . implode(',', $dbColumns) . ") VALUES ({$placeholders})";
        $stmt_insert = $conn->prepare($insertSql);
        if ($stmt_insert === false) throw new Exception("Prepare failed (INSERT): " . $conn->error);

        $insertedRows = 0;
        foreach ($dataRows as $row) {
            // 4. Get values from the current row in the correct order
            $params = array_values($row);
            
            // 5. Bind the dynamic parameters
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
?>