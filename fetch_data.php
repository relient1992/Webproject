<?php

// $servername = "localhost";
// $username = "root";
// $password = "";
// $database = "businessdb";

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// Connect
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => "Connection failed: " . $conn->connect_error]));
}

// --- ROUTER: Decide what to do based on the 'action' parameter ---
if (isset($_GET['action'])) {
    $action = $_GET['action'];

    // ✅ Action for the BPS Dashboard data
    if ($action === 'get_dashboard_data') {
        $sql = "SELECT eds, `Operator name`, `TL Name`, Records, Hours, Shipment FROM bps_dashboard";
        $whereClauses = [];
        $params = [];
        $types = '';
        
        $dashboardFilters = ['Location', 'Primary Project', 'Weekending', 'Platform', 'proddate', 'Firefly Process', 'TL Name', 'Taskname', 'Operator name', 'Task PROJECT'];

        foreach ($_GET as $key => $value) {
            if (in_array($key, $dashboardFilters) && !empty($value)) {
                $values = explode(',', $value);
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $whereClauses[] = "`$key` IN ($placeholders)";
                foreach ($values as $val) {
                    $params[] = $val;
                    $types .= 's';
                }
            }
        }

        if (!empty($whereClauses)) {
            $sql .= " WHERE " . implode(' AND ', $whereClauses);
        }

        // ✅ ADDED: LIMIT to fetch a maximum of 10 records for testing
        $sql .= " LIMIT 10";

        $stmt = $conn->prepare($sql);
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
        echo json_encode($data);
        $conn->close();
        exit;
    }

    // --- ACTION: chart_data (Your existing code) ---
    if ($action === 'chart_data') {
        // ... (Your existing, working code for chart_data goes here)
        try {
            $startDate = $_GET['start_date'] ?? date('Y-m-01');
            $endDate = $_GET['end_date'] ?? date('Y-m-d');
            $sql = "SELECT site, DATE(date) as chart_date, SUM(production) as total_production FROM bps_dashboard WHERE DATE(date) BETWEEN ? AND ? GROUP BY site, DATE(date) ORDER BY chart_date ASC, site ASC";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('ss', $startDate, $endDate);
            $stmt->execute();
            $result = $stmt->get_result();
            $dateMap = [];
            $allDates = [];
            while ($row = $result->fetch_assoc()) {
                $date = $row['chart_date'];
                $site = strtolower($row['site']);
                if (!in_array($date, $allDates)) $allDates[] = $date;
                if ($site === 'subic' || $site === 'clark') {
                    $dateMap[$site][$date] = (float)$row['total_production'];
                }
            }
            sort($allDates);
            $subicData = []; $clarkData = []; $categories = [];
            foreach ($allDates as $date) {
                $categories[] = $date . 'T00:00:00.000Z';
                $subicData[] = $dateMap['subic'][$date] ?? 0;
                $clarkData[] = $dateMap['clark'][$date] ?? 0;
            }
            $response = ['success' => true, 'data' => ['series' => [['name' => 'Subic', 'data' => $subicData], ['name' => 'Clark', 'data' => $clarkData]], 'categories' => $categories], 'date_range' => ['start' => $startDate, 'end' => $endDate]];
            $stmt->close();
            echo json_encode($response);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed: ' . $e->getMessage()]);
        }
        $conn->close();
        exit;
    }

    // --- ACTION: list_names (Your existing code) ---
    if ($action === 'list_names') {
        $result = $conn->query("SELECT DISTINCT SUPERVISOR FROM employee_listings WHERE SUPERVISOR != '' AND SUPERVISOR IN (SELECT FULLNAME FROM employee_listings WHERE emp_status = 'ACTIVE') ORDER BY SUPERVISOR ASC");
        $supervisors = [];
        while ($row = $result->fetch_assoc()) {
            $supervisors[] = $row['SUPERVISOR'];
        }
        echo json_encode($supervisors);
        $conn->close();
        exit;
    }

    // --- ACTION: filter (by supervisor) (Your existing code) ---
    if ($action === 'filter' && isset($_GET['name'])) {
        $stmt = $conn->prepare("SELECT EDS, FULLNAME, PROJECT, POSITION, SITE, SUPERVISOR, emp_status, DATEHIRED FROM employee_listings WHERE emp_status = 'ACTIVE' AND SUPERVISOR = ?");
        $stmt->bind_param('s', $_GET['name']);
        $stmt->execute();
        $result = $stmt->get_result();
        $employees = [];
        while ($row = $result->fetch_assoc()) {
            $employees[] = $row;
        }
        $stmt->close();
        echo json_encode($employees);
        $conn->close();
        exit;
    }
}

// --- DEFAULT BEHAVIOR: Handle employee stats (Your existing, working code) ---
$startDate = $_GET['startDate'] ?? date('Y-01-01');
$endDate = $_GET['endDate'] ?? date('Y-12-31');
$entity = $_GET['entity'] ?? 'ALL';
$data = [];
$entityFilter = '';
$params = [];
$types = '';
if ($entity === 'LHI') {
    $entityFilter = " AND PROJECT IN (?, ?)";
    $params = ["ADMIN, LHI", "LHI"];
    $types = 'ss';
} elseif ($entity === 'BPS') {
    $entityFilter = " AND PROJECT NOT IN (?, ?)";
    $params = ["ADMIN, LHI", "LHI"];
    $types = 'ss';
}

// Active count
$activeSql = "SELECT COUNT(EDS) AS total_active FROM employee_listings WHERE emp_status = 'ACTIVE' $entityFilter";
$stmt = $conn->prepare($activeSql);
if ($entity !== 'ALL') $stmt->bind_param($types, ...$params);
$stmt->execute();
$data['ACTIVE'] = (int)$stmt->get_result()->fetch_assoc()["total_active"];
$stmt->close();

// Inactive count and list
$inactiveCountSql = "SELECT COUNT(EDS) AS total_inactive_year FROM employee_listings WHERE emp_status = 'INACTIVE' AND dateresigned BETWEEN ? AND ? $entityFilter";
$stmt = $conn->prepare($inactiveCountSql);
if ($entity === 'ALL') $stmt->bind_param("ss", $startDate, $endDate);
else $stmt->bind_param("ss" . $types, $startDate, $endDate, ...$params);
$stmt->execute();
$data['INACTIVE_CURRENT_YEAR'] = (int)$stmt->get_result()->fetch_assoc()['total_inactive_year'];
$stmt->close();

$inactiveListSql = "SELECT * FROM employee_listings WHERE emp_status = 'INACTIVE' AND dateresigned BETWEEN ? AND ? $entityFilter ORDER BY DATERESIGNED DESC";
$stmt = $conn->prepare($inactiveListSql);
if ($entity === 'ALL') $stmt->bind_param("ss", $startDate, $endDate);
else $stmt->bind_param("ss" . $types, $startDate, $endDate, ...$params);
$stmt->execute();
$result = $stmt->get_result();
$inactiveEmployees = [];
while ($row = $result->fetch_assoc()) {
    $inactiveEmployees[] = [
        'EDS' => $row['EDS'], 'FULLNAME' => $row['FULLNAME'], 'PROJECT' => $row['PROJECT'],
        'POSITION' => $row['POSITION'], 'SITE' => $row['SITE'], 'SUPERVISOR' => $row['SUPERVISOR'],
        'STATUS' => $row['emp_status'],
        'HIREDDATE' => isset($row['DATEHIRED']) ? date('m-d-Y', strtotime($row['DATEHIRED'])) : "",
        'RESIGNEDDATE' => isset($row['DATERESIGNED']) ? date('m-d-Y', strtotime($row['DATERESIGNED'])) : "",
    ];
}
$data['INACTIVE_EMPLOYEES'] = $inactiveEmployees;
$stmt->close();

// New hires count and list
$newHireCountSql = "SELECT COUNT(EDS) AS total_newhires FROM employee_listings WHERE emp_status = 'ACTIVE' AND datehired BETWEEN ? AND ? $entityFilter";
$stmt = $conn->prepare($newHireCountSql);
if ($entity === 'ALL') $stmt->bind_param("ss", $startDate, $endDate);
else $stmt->bind_param("ss" . $types, $startDate, $endDate, ...$params);
$stmt->execute();
$data['NEWHIRES_CURRENT_YEAR'] = (int)$stmt->get_result()->fetch_assoc()['total_newhires'];
$stmt->close();

$newHireListSql = "SELECT * FROM employee_listings WHERE emp_status = 'ACTIVE' AND datehired BETWEEN ? AND ? $entityFilter ORDER BY DATEHIRED DESC";
$stmt = $conn->prepare($newHireListSql);
if ($entity === 'ALL') $stmt->bind_param("ss", $startDate, $endDate);
else $stmt->bind_param("ss" . $types, $startDate, $endDate, ...$params);
$stmt->execute();
$result = $stmt->get_result();
$newHireEmployees = [];
while ($row = $result->fetch_assoc()) {
    $newHireEmployees[] = [
        'EDS' => $row['EDS'], 'FULLNAME' => $row['FULLNAME'], 'PROJECT' => $row['PROJECT'],
        'POSITION' => $row['POSITION'], 'SITE' => $row['SITE'], 'SUPERVISOR' => $row['SUPERVISOR'],
        'STATUS' => $row['emp_status'],
        'HIREDDATE' => isset($row['DATEHIRED']) ? date('m-d-Y', strtotime($row['DATEHIRED'])) : "",
        'RESIGNEDDATE' => isset($row['DATERESIGNED']) ? date('m-d-Y', strtotime($row['DATERESIGNED'])) : "",
    ];
}
$data['NEWHIRE_EMPLOYEES'] = $newHireEmployees;
$stmt->close();

// Latest employees (last 3 months)
$threeMonthsAgo = (new DateTime())->modify('-3 months')->format('Y-m-d');
$latestSql = "SELECT * FROM employee_listings WHERE DATEHIRED >= ? OR DATERESIGNED >= ? ORDER BY GREATEST(IFNULL(DATEHIRED, '1900-01-01'), IFNULL(DATERESIGNED, '1900-01-01')) DESC";
$stmt = $conn->prepare($latestSql);
$stmt->bind_param("ss", $threeMonthsAgo, $threeMonthsAgo);
$stmt->execute();
$result = $stmt->get_result();
$latestEmployees = [];
while ($row = $result->fetch_assoc()) {
    $latestEmployees[] = [
        'EDS' => $row['EDS'], 'FULLNAME' => $row['FULLNAME'], 'PROJECT' => $row['PROJECT'],
        'POSITION' => $row['POSITION'], 'SITE' => $row['SITE'], 'SUPERVISOR' => $row['SUPERVISOR'],
        'STATUS' => $row['emp_status'],
        'HIREDDATE' => isset($row['DATEHIRED']) ? date('m-d-Y', strtotime($row['DATEHIRED'])) : "",
        'RESIGNEDDATE' => isset($row['DATERESIGNED']) ? date('m-d-Y', strtotime($row['DATERESIGNED'])) : "",
    ];
}
$data['LATEST_EMPLOYEES'] = $latestEmployees;
$stmt->close();

// Project summary
$summarySql = "SELECT PROJECT, SITE, COUNT(*) AS EMPLOYEECOUNT FROM employee_listings WHERE emp_status = 'ACTIVE' GROUP BY PROJECT, SITE ORDER BY SITE, PROJECT";
$result = $conn->query($summarySql);
$projectSummary = [];
while ($row = $result->fetch_assoc()) $projectSummary[] = $row;
$data['PROJECT_EMPLOYEE_SUMMARY'] = $projectSummary;

echo json_encode($data);

$conn->close();
?>