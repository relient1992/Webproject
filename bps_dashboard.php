<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
header('Content-Type: application/json');
// header("Location: ./views/bps_overall_dashboard.php");


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

// --- UPDATED Helper function to build WHERE clauses dynamically ---
function build_where_clause($exclude_key = null) {
    $conditions = ["site != 'OTHER SITE'"]; 
    $params = [];
    $types = '';

    // Date Range (Always present)
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $conditions[] = "proddate BETWEEN ? AND ?";
    $params[] = $startDate;
    $params[] = $endDate;
    $types .= 'ss';

    $filterMappings = [
        'site' => 'site',
        'tl_name' => '`TL Name`',
        'projects' => '`Primary Project`',
        'taskprojects' => '`Task PROJECT`',
        'taskname' => 'TaskName',
        'fireflyprocess' => '`Firefly Process`'
    ];

    foreach ($filterMappings as $paramName => $columnName) {
        if ($paramName === $exclude_key) continue; 

        if (!empty($_GET[$paramName])) {
            if ($paramName === 'taskprojects') {
                $taskProjects = explode(',', $_GET[$paramName]);
                if (count($taskProjects) > 0) {
                    $placeholders = implode(',', array_fill(0, count($taskProjects), '?'));
                    $conditions[] = "$columnName IN ($placeholders)";
                    foreach ($taskProjects as $project) {
                        $params[] = $project;
                        $types .= 's';
                    }
                }
            } else {
                $conditions[] = "$columnName = ?";
                $params[] = $_GET[$paramName];
                $types .= 's';
            }
        }
    }

    $conditionClause = !empty($conditions) ? implode(' AND ', $conditions) : "";
    return ['conditions' => $conditionClause, 'params' => $params, 'types' => $types];
}


// --- ROUTER: Decide what data to send ---

// 1. Fetch options for the filter dropdowns
if (isset($_GET['get_options'])) {
    $options = [];
    
    $option_queries = [
        'site' => "SELECT DISTINCT site as value FROM bps_dashboard WHERE site IN ('Subic', 'Clark')",
        'tl_name' => 'SELECT DISTINCT `TL Name` as value FROM bps_dashboard',
        'projects' => 'SELECT DISTINCT `Primary Project` as value FROM bps_dashboard',
        'taskprojects' => 'SELECT DISTINCT `Task PROJECT` as value FROM bps_dashboard',
        'taskname' => 'SELECT DISTINCT TaskName as value FROM bps_dashboard',
        'fireflyprocess' => 'SELECT DISTINCT `Firefly Process` as value FROM bps_dashboard'
    ];

    foreach ($option_queries as $key => $base_sql) {
        $filter_data = build_where_clause($key);
        $sql = $base_sql;
        
        if (strpos(strtoupper($sql), 'WHERE') !== false) {
            if (!empty($filter_data['conditions'])) {
                 $sql .= ' AND ' . $filter_data['conditions'];
            }
        } else {
            if (!empty($filter_data['conditions'])) {
                $sql .= ' WHERE ' . $filter_data['conditions'];
            }
        }
        $sql .= " ORDER BY value";

        $stmt = $conn->prepare($sql);
        if ($stmt) {
            if (!empty($filter_data['types'])) {
                $stmt->bind_param($filter_data['types'], ...$filter_data['params']);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $options[$key] = [];
            while($row = $result->fetch_assoc()){
                if(!empty($row['value'])) $options[$key][] = $row;
            }
            $stmt->close();
        } else {
            $options[$key] = ['error' => $conn->error];
        }
    }
    
    $conn->close();
    echo json_encode($options);
    exit();
}


// 2. Fetch data for the performance chart
if (isset($_GET['get_chart_data'])) {
    $filter_data = build_where_clause();
    $chart_period = $_GET['chart_period'] ?? 'daily'; // Get the aggregation period

    // --- UPDATED: Expressions for selecting and grouping dates ---
    $date_select_expression = "proddate"; // Default to daily
    $date_group_expression = "proddate";  // Default to daily

    if ($chart_period === 'weekly') {
        // Select the date of the Monday of that week for a clean label
        $date_select_expression = "STR_TO_DATE(CONCAT(YEARWEEK(proddate, 1),' Monday'), '%x%v %W')";
        // Group by the unique year-week identifier
        $date_group_expression = "YEARWEEK(proddate, 1)";
    } elseif ($chart_period === 'monthly') {
        // Select the first day of the month for a clean label
        $date_select_expression = "DATE_FORMAT(proddate, '%Y-%m-01')";
        // Group by the unique year-month identifier
        $date_group_expression = "DATE_FORMAT(proddate, '%Y-%m')";
    }

    $sql = "SELECT 
                {$date_select_expression} as proddate,
                SUM(Records) AS records,
                SUM(Hours) AS hours,
                SUM(Shipment) AS shipment,
                SUM(`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(Hours) > 0, SUM(shipment) / SUM(Hours), 0) AS tputs,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(shipment) / SUM(`ALLOC. EDS`), 0) AS vph,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(Hours) / SUM(`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard";

    if (!empty($filter_data['conditions'])) {
        $sql .= " WHERE " . $filter_data['conditions'];
    }
    $sql .= " GROUP BY {$date_group_expression} ORDER BY {$date_group_expression} ASC";

    $stmt = $conn->prepare($sql);
    if ($stmt && !empty($filter_data['types'])) {
        $stmt->bind_param($filter_data['types'], ...$filter_data['params']);
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
    exit();
}

// 3. Fetch raw data for XLSX export
if (isset($_GET['get_export_data'])) {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    
    $sql = "SELECT * FROM bps_dashboard WHERE proddate BETWEEN ? AND ? AND site != 'OTHER SITE'";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    $stmt->close();
    $conn->close();
    echo json_encode($data);
    exit();
}


// 4. Fetch data for the main table (default action)
$view_mode = $_GET['view_mode'] ?? 'employee';
$filter_data = build_where_clause();
$sql = '';

if ($view_mode === 'employee') {
    $sql = "SELECT 
                eds,
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
                IF(SUM(`ALLOC. EDS`) > 0, SUM(records) / SUM(`ALLOC. EDS`), 0) AS payroll_ks_tputs
            FROM bps_dashboard";
} else { // project view
    $sql = "SELECT 
                `Task PROJECT` as taskprojects,
                TaskName as taskname,
                SUM(Records) AS records,
                SUM(Hours) AS hours,
                SUM(Shipment) AS shipment,
                SUM(`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(Hours) > 0, SUM(shipment) / SUM(Hours), 0) AS tputs,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(shipment) / SUM(`ALLOC. EDS`), 0) AS vph,
                IF(SUM(`ALLOC. EDS`) > 0, SUM(Hours) / SUM(`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard";
}

if (!empty($filter_data['conditions'])) {
    $sql .= " WHERE " . $filter_data['conditions'];
}

if ($view_mode === 'employee') {
    $sql .= " GROUP BY eds ORDER BY eds";
} else {
    $sql .= " GROUP BY `Task PROJECT`, TaskName ORDER BY `Task PROJECT`, TaskName";
}

$stmt = $conn->prepare($sql);
if ($stmt && !empty($filter_data['types'])) {
    $stmt->bind_param($filter_data['types'], ...$filter_data['params']);
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