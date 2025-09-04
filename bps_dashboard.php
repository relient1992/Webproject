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

// Connect
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => "Database connection failed."]));
}


// --- DYNAMIC WHERE CLAUSE BUILDER ---
// This function helps build the WHERE clause securely
function build_where_clause($conn, $filters, &$params, &$types) {
    $whereClauses = [];
    
    $filterMappings = [
        'site' => 'site',
        'tl_name' => '`TL Name`',
        'projects' => '`Primary Project`',
        'taskname' => 'TaskName',
        'fireflyprocess' => '`Firefly Process`'
    ];

    foreach ($filterMappings as $paramName => $columnName) {
        if (!empty($filters[$paramName])) {
            $whereClauses[] = "$columnName = ?";
            $params[] = $filters[$paramName];
            $types .= 's';
        }
    }
    
    // Handle multi-select taskprojects
    if (!empty($filters['taskprojects'])) {
        $taskProjects = explode(',', $filters['taskprojects']);
        $placeholders = implode(',', array_fill(0, count($taskProjects), '?'));
        $whereClauses[] = "`Task PROJECT` IN ($placeholders)";
        foreach ($taskProjects as $project) {
            $params[] = $project;
            $types .= 's';
        }
    }
    
    return empty($whereClauses) ? "" : "WHERE " . implode(' AND ', $whereClauses);
}


// --- LOGIC TO FETCH ALL FILTER OPTIONS ---
if (isset($_GET['get_options'])) {
    
    $filters = $_GET;
    $params = [];
    $types = '';

    // Always include date range in filter options
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $dateClause = "proddate BETWEEN ? AND ?";
    $params = [$startDate, $endDate];
    $types = 'ss';

    $options = [];
    
    $option_columns = [
        'site' => 'site',
        'tl_name' => '`TL Name`',
        'projects' => '`Primary Project`',
        'taskprojects' => '`Task PROJECT`',
        'taskname' => 'TaskName',
        'fireflyprocess' => '`Firefly Process`'
    ];

    foreach ($option_columns as $key => $column) {
        $temp_filters = $filters;
        unset($temp_filters[$key]); // Exclude the current filter from the WHERE clause for itself

        $temp_params = $params; // Start with date params
        $temp_types = $types;

        $whereClauseForOptions = build_where_clause($conn, $temp_filters, $temp_params, $temp_types);
        
        $finalWhere = $dateClause;
        if (!empty($whereClauseForOptions)) {
            $finalWhere .= " AND " . substr($whereClauseForOptions, 6); // remove 'WHERE '
        }

        $sql = "SELECT DISTINCT $column as value FROM bps_dashboard WHERE $finalWhere AND $column IS NOT NULL AND $column != '' ORDER BY value";
        
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param($temp_types, ...$temp_params);
            $stmt->execute();
            $result = $stmt->get_result();
            $options[$key] = [];
            while($row = $result->fetch_assoc()){
                $options[$key][] = ['value' => $row['value']];
            }
            $stmt->close();
        }
    }
    
    $conn->close();
    echo json_encode($options);
    exit();
}


// --- LOGIC FOR FETCHING TABLE DATA ---

$viewMode = $_GET['view_mode'] ?? 'employee';
$sql = "";
$params = [];
$types = '';

// Base WHERE clause from filters
$baseWhereClause = build_where_clause($conn, $_GET, $params, $types);

// Date range is added separately because it's always present for the main query
$startDate = $_GET['startDate'] ?? date('Y-m-d');
$endDate = $_GET['endDate'] ?? date('Y-m-d');
array_unshift($params, $endDate);
array_unshift($params, $startDate);
$types = 'ss' . $types;

$dateWhere = "WHERE proddate BETWEEN ? AND ?";
$finalWhereClause = $dateWhere;
if (!empty($baseWhereClause)) {
    $finalWhereClause .= " AND " . substr($baseWhereClause, 6); // remove 'WHERE '
}


if ($viewMode === 'employee') {
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
                bps_dashboard
            $finalWhereClause
            GROUP BY eds ORDER BY eds";
} else { // Project View
     $sql = "SELECT 
                GROUP_CONCAT(DISTINCT `Task PROJECT` SEPARATOR ', ') as taskprojects,
                GROUP_CONCAT(DISTINCT TaskName SEPARATOR ', ') AS taskname,
                SUM(Records) AS records,
                SUM(Hours) AS hours,
                SUM(Shipment) AS shipment,
                SUM(`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(Hours) > 0, SUM(shipment) / SUM(Hours), 0) AS tputs,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(shipment) / SUM(`ALLOC. EDS`), 0) AS vph,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(Hours) / SUM(`ALLOC. EDS`), 0) AS utilization
            FROM 
                bps_dashboard
            $finalWhereClause
            GROUP BY `Task PROJECT`, TaskName ORDER BY `Task PROJECT`, TaskName";
}


$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]));
}

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