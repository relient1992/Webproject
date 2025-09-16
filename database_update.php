<?php
header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
// This is the essential part you correctly pointed out was missing.
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// Create connection
$conn = new mysqli($servername, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// The router that decides which function to run based on the request
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
    // NEW case for the bulk import feature
    case 'bulk_import':
        bulkImport($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}

$conn->close();

// --- FUNCTIONS ---

// --- Original CRUD Functions (for single records) ---

function createRecord($conn) {
    $metric_name = $_POST['metric_name'] ?? '';
    $metric_value = $_POST['metric_value'] ?? '';
    $details = $_POST['details'] ?? '';

    if (empty($metric_name) || empty($metric_value)) {
        echo json_encode(['status' => 'error', 'message' => 'Metric Name and Value are required.']);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO bps_dashboard (metric_name, metric_value, details) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $metric_name, $metric_value, $details);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Record added successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to add record: ' . $stmt->error]);
    }
    $stmt->close();
}

function readRecords($conn) {
    $result = $conn->query("SELECT id, metric_name, metric_value, details, proddate, last_updated FROM bps_dashboard ORDER BY id DESC");
    $records = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $records[] = $row;
        }
    }
    echo json_encode($records);
}

function readSingleRecord($conn) {
    $id = $_GET['id'] ?? 0;
    if ($id <= 0) {
        echo json_encode(null);
        exit();
    }
    
    $stmt = $conn->prepare("SELECT id, metric_name, metric_value, details FROM bps_dashboard WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result->fetch_assoc();
    
    echo json_encode($record);
    $stmt->close();
}

function updateRecord($conn) {
    $id = $_POST['id'] ?? 0;
    $metric_name = $_POST['metric_name'] ?? '';
    $metric_value = $_POST['metric_value'] ?? '';
    $details = $_POST['details'] ?? '';

    if (empty($id) || empty($metric_name) || empty($metric_value)) {
        echo json_encode(['status' => 'error', 'message' => 'ID, Metric Name, and Value are required for update.']);
        exit();
    }

    $stmt = $conn->prepare("UPDATE bps_dashboard SET metric_name = ?, metric_value = ?, details = ? WHERE id = ?");
    $stmt->bind_param("sssi", $metric_name, $metric_value, $details, $id);

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
    $id = $_POST['id'] ?? 0;

    if (empty($id)) {
        echo json_encode(['status' => 'error', 'message' => 'Record ID is required.']);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM bps_dashboard WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Record deleted successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete record: ' . $stmt->error]);
    }
    $stmt->close();
}


// --- NEW Bulk Import Function ---

function bulkImport($conn) {
    $json = file_get_contents('php://input');
    $payload = json_decode($json, true);

    if (!$payload || !isset($payload['data']) || !isset($payload['startDate']) || !isset($payload['endDate'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request payload.']);
        exit();
    }

    $importType = $payload['importType'];
    $startDate = $payload['startDate'];
    $endDate = $payload['endDate'];
    $dataRows = $payload['data'];
    $tableName = '';

    switch ($importType) {
        case 'bps_dashboard':
            $tableName = 'bps_dashboard';
            $columns = ['metric_name', 'metric_value', 'details', 'proddate']; 
            break;
        default:
            echo json_encode(['status' => 'error', 'message' => 'Unknown import type specified.']);
            exit();
    }
    
    $conn->begin_transaction();

    try {
        $deleteSql = "DELETE FROM {$tableName} WHERE proddate BETWEEN ? AND ?";
        $stmt_delete = $conn->prepare($deleteSql);
        if ($stmt_delete === false) throw new Exception("Prepare failed (DELETE): " . $conn->error);
        $stmt_delete->bind_param("ss", $startDate, $endDate);
        $stmt_delete->execute();
        $deletedRows = $stmt_delete->affected_rows;
        $stmt_delete->close();
        
        $placeholders = rtrim(str_repeat('?,', count($columns)), ',');
        $insertSql = "INSERT INTO {$tableName} (" . implode(',', $columns) . ") VALUES ({$placeholders})";
        $stmt_insert = $conn->prepare($insertSql);
        if ($stmt_insert === false) throw new Exception("Prepare failed (INSERT): " . $conn->error);

        $insertedRows = 0;
        foreach ($dataRows as $row) {
            $params = [];
            foreach ($columns as $col) {
                $params[] = $row[$col] ?? null; 
            }
            $stmt_insert->bind_param(str_repeat('s', count($columns)), ...$params);
            $stmt_insert->execute();
            $insertedRows++;
        }
        $stmt_insert->close();

        $conn->commit();

        echo json_encode([
            'status' => 'success', 
            'message' => "Import complete. Rows deleted: {$deletedRows}. Rows inserted: {$insertedRows}."
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'A database error occurred: ' . $e->getMessage()]);
    }
}
?>