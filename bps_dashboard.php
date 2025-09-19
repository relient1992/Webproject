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

// --- Helper function to build WHERE clauses dynamically ---
function build_where_clause($exclude_key = null) {
    $conditions = ["b.site != 'OTHER SITE'"]; 
    $params = [];
    $types = '';

    // Date Range (Always present)
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    $conditions[] = "b.proddate BETWEEN ? AND ?";
    $params[] = $startDate;
    $params[] = $endDate;
    $types .= 'ss';

    $filterMappings = [
        'site' => 'b.site',
        'tl_name' => 'el.SUPERVISOR',
        'projects' => 'b.`Primary Project`',
        'taskprojects' => 'b.`Task PROJECT`',
        'taskname' => 'b.TaskName',
        'fireflyprocess' => 'b.`Firefly Process`'
    ];
    
    // Special handling for employee EDS filter
    if(!empty($_GET['employee_eds']) && $exclude_key !== 'employee_eds') {
        $conditions[] = "b.eds = ?";
        $params[] = $_GET['employee_eds'];
        $types .= 's';
    }

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

    $conditionClause = !empty($conditions) ? " WHERE " . implode(' AND ', $conditions) : "";
    return ['clause' => $conditionClause, 'params' => $params, 'types' => $types];
}


// --- ROUTER: Decide what data to send ---

// 1. Fetch options for the filter dropdowns
if (isset($_GET['get_options'])) {
    $options = [];
    
    // REWRITTEN LOGIC FOR RELIABILITY
    $base_from_clause = "FROM bps_dashboard b LEFT JOIN employee_listings el ON b.eds = el.EDS";

    $option_selects = [
        'site' => "SELECT DISTINCT b.site as value",
        'tl_name' => 'SELECT DISTINCT el.SUPERVISOR as value',
        'projects' => 'SELECT DISTINCT b.`Primary Project` as value',
        'taskprojects' => 'SELECT DISTINCT b.`Task PROJECT` as value',
        'taskname' => 'SELECT DISTINCT b.TaskName as value',
        'fireflyprocess' => 'SELECT DISTINCT b.`Firefly Process` as value'
    ];

    foreach ($option_selects as $key => $select_clause) {
        $filter_data = build_where_clause($key);
        
        $sql = $select_clause . " " . $base_from_clause . " " . $filter_data['clause'] . " ORDER BY value";

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
            // Log error if statement fails to prepare
            error_log("Failed to prepare statement for key '$key': " . $conn->error);
            $options[$key] = [];
        }
    }
    
    $conn->close();
    echo json_encode($options);
    exit();
}


// 2. Fetch data for the performance chart
if (isset($_GET['get_chart_data'])) {
    $filter_data = build_where_clause();
    $chart_period = $_GET['chart_period'] ?? 'daily';

    $date_select_expression = "b.proddate";
    $date_group_expression = "b.proddate";

    if ($chart_period === 'weekly') {
        $date_select_expression = "STR_TO_DATE(CONCAT(YEARWEEK(b.proddate, 1),' Monday'), '%x%v %W')";
        $date_group_expression = "YEARWEEK(b.proddate, 1)";
    } elseif ($chart_period === 'monthly') {
        $date_select_expression = "DATE_FORMAT(b.proddate, '%Y-%m-01')";
        $date_group_expression = "DATE_FORMAT(b.proddate, '%Y-%m')";
    }

    $sql = "SELECT 
                {$date_select_expression} as proddate,
                SUM(b.Records) AS records,
                SUM(b.Hours) AS hours,
                SUM(b.Shipment) AS shipment,
                SUM(b.`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(b.Hours) > 0, SUM(b.shipment) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY {$date_group_expression}
            ORDER BY {$date_group_expression} ASC";

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
    
    $sql = "SELECT b.*, el.FULLNAME, el.SUPERVISOR 
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            WHERE b.proddate BETWEEN ? AND ? AND b.site != 'OTHER SITE'";
    
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

// 4. Fetch data for employee task modal
if (isset($_GET['get_employee_tasks'])) {
    $filter_data = build_where_clause();
        
    $sql = "SELECT 
                b.`Task PROJECT` as taskprojects,
                b.TaskName as taskname,
                SUM(b.Records) AS records,
                SUM(b.Hours) AS hours,
                SUM(b.Shipment) AS shipment,
                SUM(b.`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(b.Hours) > 0, SUM(b.shipment) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY b.`Task PROJECT`, b.TaskName
            ORDER BY b.`Task PROJECT`, b.TaskName";
    
    $stmt = $conn->prepare($sql);
    if($stmt && !empty($filter_data['types'])) {
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


// 5. Fetch data for the main table (default action)
$view_mode = $_GET['view_mode'] ?? 'employee';
$filter_data = build_where_clause();
$sql = '';

if ($view_mode === 'employee') {
    $sql = "SELECT 
                b.eds,
                el.FULLNAME AS employee,
                el.SUPERVISOR AS tl_name,
                SUM(b.Records) AS records,
                SUM(b.Hours) AS hours,
                SUM(b.Shipment) AS shipment,
                SUM(b.`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(b.Hours) > 0, SUM(b.shipment) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization,
                IF(SUM(b.Hours) > 0, SUM(b.records) / SUM(b.Hours), 0) AS prod_ks_tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.records) / SUM(b.`ALLOC. EDS`), 0) AS payroll_ks_tputs
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY b.eds, el.FULLNAME, el.SUPERVISOR 
            ORDER BY b.eds";
} else { // project view
    $sql = "SELECT 
                b.`Task PROJECT` as taskprojects,
                b.TaskName as taskname,
                SUM(b.Records) AS records,
                SUM(b.Hours) AS hours,
                SUM(b.Shipment) AS shipment,
                SUM(b.`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(b.Hours) > 0, SUM(b.shipment) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY b.`Task PROJECT`, b.TaskName 
            ORDER BY b.`Task PROJECT`, b.TaskName";
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