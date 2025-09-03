<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
header('Content-Type: application/json');


// --- DATABASE CONNECTION ---
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

/// Connect
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => "Database connection failed."]));
}


// --- MODIFIED: LOGIC TO FETCH DYNAMIC FILTER OPTIONS ---
if (isset($_GET['get_options'])) {
    
    // Build a WHERE clause based on the currently selected filters
    $whereClauses = [];
    $params = [];
    $types = '';
    $filterMappings = [
        'site' => 'site',
        'tl_name' => '`TL Name`',
        'projects' => '`Primary Project`',
        'taskprojects' => '`Task PROJECT`',
        'taskname' => 'TaskName',
        'fireflyprocess' => '`Firefly Process`'
    ];

    foreach ($filterMappings as $paramName => $columnName) {
        if (!empty($_GET[$paramName])) {
            // MODIFIED: Handle multi-select for taskprojects
            if ($paramName === 'taskprojects') {
                $values = explode(',', $_GET[$paramName]);
                if (count($values) > 0) {
                    $placeholders = implode(',', array_fill(0, count($values), '?'));
                    $whereClauses[] = "$columnName IN ($placeholders)";
                    foreach ($values as $value) {
                        $params[] = $value;
                        $types .= 's';
                    }
                }
            } else {
                $whereClauses[] = "$columnName = ?";
                $params[] = $_GET[$paramName];
                $types .= 's';
            }
        }
    }
    $whereSql = !empty($whereClauses) ? " WHERE " . implode(' AND ', $whereClauses) : "";

    // Queries to get the unique available options based on the WHERE clause above
    $options = [];
    $option_queries = [
        'site' => "SELECT DISTINCT site as value FROM bps_dashboard $whereSql ORDER BY value",
        'tl_name' => "SELECT DISTINCT `TL Name` as value FROM bps_dashboard $whereSql ORDER BY value",
        'projects' => "SELECT DISTINCT `Primary Project` as value FROM bps_dashboard $whereSql ORDER BY value",
        'taskprojects' => "SELECT DISTINCT `Task PROJECT` as value FROM bps_dashboard $whereSql ORDER BY value",
        'taskname' => "SELECT DISTINCT TaskName as value FROM bps_dashboard $whereSql ORDER BY value",
        'fireflyprocess' => "SELECT DISTINCT `Firefly Process` as value FROM bps_dashboard $whereSql ORDER BY value"
    ];

    foreach ($option_queries as $key => $sql) {
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $options[$key] = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }
    }
    
    $conn->close();
    echo json_encode($options);
    exit();
}


// --- DYNAMIC FILTERING LOGIC FOR TABLE DATA ---

// Base SQL query
$sql = "SELECT 
            eds,
            GROUP_CONCAT(DISTINCT TaskName SEPARATOR ', ') AS taskname,
            GROUP_CONCAT(DISTINCT `Task PROJECT` SEPARATOR ', ') as taskprojects,
            GROUP_CONCAT(DISTINCT `Firefly Process` SEPARATOR ', ') as fireflyprocess,
            GROUP_CONCAT(DISTINCT OperatorName SEPARATOR ', ') AS employee,
            GROUP_CONCAT(DISTINCT `TL Name` SEPARATOR ', ') AS tl_name,
            SUM(Records) AS records,
            SUM(Hours) AS hours,
            SUM(Shipment) AS shipment,
            SUM(`ALLOC. EDS`) AS alloc_eds,
            IF(SUM(Hours) > 0, SUM(shipment) / SUM(Hours), 0) AS tputs,
            IF(SUM(`ALLOC. EDS`) > 0, SUM(shipment) / SUM(`ALLOC. EDS`), 0) AS vph,
            IF(SUM(`ALLOC. EDS`) > 0, SUM(Hours) / SUM(`ALLOC. EDS`), 0) AS utilization,
            IF(SUM(Hours) > 0, SUM(records) / SUM(Hours), 0) AS prod_ks_tputs,
            IF(SUM(`ALLOC. EDS`) > 0, SUM(records) / SUM(`ALLOC. EDS`), 0) AS payroll_ks_tputs,
            GROUP_CONCAT(DISTINCT site SEPARATOR ', ') AS site,
            GROUP_CONCAT(DISTINCT `Primary Project` SEPARATOR ', ') AS projects
        FROM 
            bps_dashboard";

// --- Build WHERE clause dynamically ---
$whereClauses = [];
$params = [];
$types = '';

// Date Range (Always present)
$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$whereClauses[] = "proddate BETWEEN ? AND ?";
$params[] = $startDate;
$params[] = $endDate;
$types .= 'ss';

// Other filters (check if they are set and not empty)
$filterMappings = [
    'site' => 'site',
    'tl_name' => '`TL Name`',
    'projects' => '`Primary Project`',
    'taskprojects' => '`Task PROJECT`',
    'taskname' => 'TaskName',
    'fireflyprocess' => '`Firefly Process`'
];

foreach ($filterMappings as $paramName => $columnName) {
    if (!empty($_GET[$paramName])) {
         // MODIFIED: Handle multi-select for taskprojects
        if ($paramName === 'taskprojects' && !empty($_GET[$paramName])) {
            $values = explode(',', $_GET[$paramName]);
            if(count($values) > 0){
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $whereClauses[] = "$columnName IN ($placeholders)";
                foreach ($values as $value) {
                    $params[] = $value;
                    $types .= 's';
                }
            }
        } else {
            $whereClauses[] = "$columnName = ?";
            $params[] = $_GET[$paramName];
            $types .= 's';
        }
    }
}

// Append WHERE clauses to the main SQL query
if (!empty($whereClauses)) {
    $sql .= " WHERE " . implode(' AND ', $whereClauses);
}

// Group only by EDS
$sql .= " GROUP BY eds ORDER BY eds";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]));
}

// Bind parameters if any exist
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode($data);

?>