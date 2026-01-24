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
// $servername = "10.200.168.89";
// $username   = "supersu";
// $password   = "H110mds2!";
// $database   = "database_rda";

$servername = "localhost";
$username = "root";
$password = "";
$database = "database_rda";

// Connect
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => "Database connection failed: " . $conn->connect_error]));
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
                if (!$stmt->bind_param($filter_data['types'], ...$filter_data['params'])) {
                    error_log("Failed to bind parameters for key '$key': " . $stmt->error);
                    $stmt->close();
                    continue;
                }
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
    if ($stmt) {
        if (!empty($filter_data['types'])) {
            if (!$stmt->bind_param($filter_data['types'], ...$filter_data['params'])) {
                 http_response_code(500);
                 die(json_encode(['error' => "Chart Data: Failed to bind parameters. Types: {$filter_data['types']}, Params: " . json_encode($filter_data['params'])]));
            }
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        $stmt->close();
    } else {
        http_response_code(500);
        die(json_encode(['error' => "Chart Data: Failed to prepare statement: " . $conn->error]));
    }
    
    $conn->close();
    echo json_encode($data);
    exit();
}

// 3. Fetch raw data for XLSX export
if (isset($_GET['get_export_data'])) {
    $startDate = $_GET['startDate'] ?? date('Y-m-d');
    $endDate = $_GET['endDate'] ?? date('Y-m-d');
    
    $sql = "SELECT b.*, el.FULLNAME, el.SUPERVISOR, el.PROJECT
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            WHERE b.proddate BETWEEN ? AND ? AND b.site != 'OTHER SITE'";
    
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param('ss', $startDate, $endDate);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        $stmt->close();
    } else {
         http_response_code(500);
         die(json_encode(['error' => "Export Data: Failed to prepare statement: " . $conn->error]));
    }
    
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
    if($stmt) {
        if(!empty($filter_data['types'])) {
            if (!$stmt->bind_param($filter_data['types'], ...$filter_data['params'])) {
                 http_response_code(500);
                 die(json_encode(['error' => "Task Data: Failed to bind parameters. Types: {$filter_data['types']}, Params: " . json_encode($filter_data['params'])]));
            }
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        $stmt->close();
    } else {
        http_response_code(500);
        die(json_encode(['error' => "Task Data: Failed to prepare statement: " . $conn->error]));
    }
    
    $conn->close();
    echo json_encode($data);
    exit();
}


// 5. Fetch data for the main table (default action)
$view_mode = $_GET['view_mode'] ?? 'employee';
$filter_data = build_where_clause(); // your existing filter builder
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
                IF(SUM(b.Hours) > 0, SUM(b.Records) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization,
                IF(SUM(b.Hours) > 0, SUM(b.records) / SUM(b.Hours), 0) AS prod_ks_tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.records) / SUM(b.`ALLOC. EDS`), 0) AS payroll_ks_tputs
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY b.eds, el.FULLNAME, el.SUPERVISOR 
            ORDER BY b.eds";
} elseif ($view_mode === 'project') {
    $sql = "SELECT 
                b.`Task PROJECT` as taskprojects,
                b.TaskName as taskname,
                SUM(b.Records) AS records,
                SUM(b.Hours) AS hours,
                SUM(b.Shipment) AS shipment,
                SUM(b.`ALLOC. EDS`) AS alloc_eds,
                IF(SUM(b.Hours) > 0, SUM(b.Records) / SUM(b.Hours), 0) AS tputs,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.shipment) / SUM(b.`ALLOC. EDS`), 0) AS vph,
                IF(SUM(b.`ALLOC. EDS`) > 0, SUM(b.Hours) / SUM(b.`ALLOC. EDS`), 0) AS utilization
            FROM bps_dashboard b
            LEFT JOIN employee_listings el ON b.eds = el.EDS
            {$filter_data['clause']}
            GROUP BY b.`Task PROJECT`, b.TaskName 
            ORDER BY b.`Task PROJECT`, b.TaskName";
}elseif ($view_mode === 'efficiency') {

    $pay_filter_data = build_where_clause(); 
    $startDateParam = $_GET['startDate'] ?? date('Y-m-d');
    $endDateParam   = $_GET['endDate'] ?? date('Y-m-d');

    // FIX: sanitize dynamic filters
    $extraFilters = trim($pay_filter_data['clause']);
    if ($extraFilters !== '') {
        // Remove accidental leading WHERE
        $extraFilters = preg_replace('/^\s*WHERE\s+/i', '', $extraFilters);
        $extraFilters = " AND " . $extraFilters . " ";
    }

    // Bind params
    $pay_date_params = [$startDateParam, $endDateParam]; 
    $combined_params = array_merge($pay_date_params, $pay_filter_data['params']);
    $combined_types   = 'ss' . $pay_filter_data['types']; 

    $sql = "
        SELECT 
            b.eds,
            el.FULLNAME AS employee,
            el.SUPERVISOR AS tl_name,
            el.PROJECT AS primary_project,
            
            -- Net Pay per employee (Aggregated from DTR only)
            COALESCE(p_agg.total_net_pay, 0) AS net_pay,
            
            -- Statutory allocation per day (Aggregated from DTR only)
            COALESCE(p_agg.total_statutory_alloc, 0) AS statutory_alloc,
            
            -- Net Pay + Statutory
            COALESCE(p_agg.total_net_pay + p_agg.total_statutory_alloc, 0) AS netpay_plus_statutory

        -- Start from bps_dashboard and filter it
        FROM bps_dashboard b
        LEFT JOIN employee_listings el 
            ON b.eds = el.EDS

        -- Subquery: Calculates TOTAL Net Pay and Statutory Alloc per EDS for the report period
        INNER JOIN (
            -- 1. Get the final summed pay/statutory for the report range
            SELECT
                dtr_pay.eds,
                SUM(dtr_pay.daily_net_pay) AS total_net_pay,
                SUM(dtr_pay.daily_statutory_alloc) AS total_statutory_alloc
            FROM (
                -- 2. Calculate the Daily Pay, Rate Month, and Fiscal Working Day Count (Denominator)
                SELECT
                    dtr_with_rate_month.eds,
                    dtr_with_rate_month.Date,
                    dtr_with_rate_month.rate_month,
                    COALESCE((dtr_with_rate_month.Credited_Reg_Hours + dtr_with_rate_month.Credited_OT) * r.Hourly_Rate, 0) AS daily_net_pay,
                    
                    -- Calculate Daily Statutory Allocation: Statutory / Total Actual DTR Days in Fiscal Cycle
                    COALESCE(st.Statutory_13th_Month / NULLIF(FD.total_working_days, 0), 0) AS daily_statutory_alloc
                    
                FROM (
                    -- Subquery to get DTR rows and calculate 'rate_month' (Filtered by report range)
                    SELECT *,
                        STR_TO_DATE(
                            CASE
                                WHEN (MONTH(Date) = 1 AND DAY(Date) >= 21) OR (MONTH(Date) = 2 AND DAY(Date) <= 18) THEN CONCAT(YEAR(Date), '-02-01')
                                WHEN (MONTH(Date) = 2 AND DAY(Date) >= 19) OR (MONTH(Date) = 3 AND DAY(Date) <= 20) THEN CONCAT(YEAR(Date), '-03-01')
                                WHEN DAY(Date) >= 21 THEN DATE_FORMAT(Date + INTERVAL 1 MONTH, '%Y-%m-01')
                                ELSE DATE_FORMAT(Date, '%Y-%m-01')
                            END, '%Y-%m-%d'
                        ) AS rate_month
                    FROM bps_dtr
                    WHERE Date BETWEEN ? AND ? -- **(Binds 1 & 2: startDateParam, endDateParam)**
                ) dtr_with_rate_month
                
                INNER JOIN bps_rate r 
                    ON dtr_with_rate_month.eds = r.Employee_Code
                   AND r.Month = dtr_with_rate_month.rate_month
                   
                LEFT JOIN bps_statutory st -- Join statutory table here
                    ON st.Employee_Code = dtr_with_rate_month.eds
                   AND st.Month = dtr_with_rate_month.rate_month

                -- 3. Join the Fixed Denominator (Total DTR working days in the full fiscal cycle)
                INNER JOIN (
                    -- Calculate the total count of DTR days (7 in your example) for the full fiscal cycle
                    SELECT
                        eds,
                        rate_month,
                        COUNT(Date) AS total_working_days
                    FROM (
                        -- Inner subquery to get DTR data and calculate rate_month for the FULL range check
                        SELECT 
                            eds,
                            Date,
                            (Credited_Reg_Hours + Credited_OT) AS Credited_Hours_Total,
                            STR_TO_DATE(
                                CASE
                                    WHEN (MONTH(Date) = 1 AND DAY(Date) >= 21) OR (MONTH(Date) = 2 AND DAY(Date) <= 18) THEN CONCAT(YEAR(Date), '-02-01')
                                    WHEN (MONTH(Date) = 2 AND DAY(Date) >= 19) OR (MONTH(Date) = 3 AND DAY(Date) <= 20) THEN CONCAT(YEAR(Date), '-03-01')
                                    WHEN DAY(Date) >= 21 THEN DATE_FORMAT(Date + INTERVAL 1 MONTH, '%Y-%m-01')
                                    ELSE DATE_FORMAT(Date, '%Y-%m-01')
                                END, '%Y-%m-%d'
                            ) AS rate_month
                        FROM bps_dtr
                    ) dtr_full
                    -- Filter to ensure we only count DTR days within the fiscal pay cycle (Oct 21 to Nov 20)
                    WHERE dtr_full.Date >= DATE_ADD(DATE_SUB(dtr_full.rate_month, INTERVAL 1 MONTH), INTERVAL 20 DAY)
                      AND dtr_full.Date <= DATE_SUB(dtr_full.rate_month, INTERVAL 11 DAY)
                      AND dtr_full.Credited_Hours_Total > 0 -- **Only count days with credited hours (the 7 days)**
                    GROUP BY eds, rate_month
                    HAVING total_working_days > 0 -- Ensure we don't divide by zero
                ) FD 
                    ON FD.eds = dtr_with_rate_month.eds
                   AND FD.rate_month = dtr_with_rate_month.rate_month
            ) dtr_pay
            GROUP BY dtr_pay.eds -- Aggregate unique daily pay/statutory into a total for the report range per employee
        ) p_agg 
            ON b.eds = p_agg.eds

        -- Filter the final results based on the dashboard filters and date range
        WHERE 1=1 
        $extraFilters 

        GROUP BY b.eds, el.FULLNAME, el.SUPERVISOR, el.PROJECT
        ORDER BY b.eds
    ";
}

// --- Execute ---
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    die(json_encode(['error' => "Main Query: Failed to prepare statement: " . $conn->error]));
}

// Bind parameters if needed
if ($view_mode === 'efficiency') {
    // Check for parameter count mismatch
    $expected_params = substr_count($sql, '?');
    $actual_params = count($combined_params);
    if ($expected_params !== $actual_params) {
        http_response_code(500);
        die(json_encode(['error' => "Binding Error: Expected {$expected_params} parameters, got {$actual_params}. Types: {$combined_types}, Params: " . json_encode($combined_params)]));
    }

    // The parameters are: DTR dates (2) + all filters from build_where_clause()
    // The types are: 'ss' for DTR dates + all types from build_where_clause()
    if (!$stmt->bind_param($combined_types, ...$combined_params)) {
        http_response_code(500);
        die(json_encode(['error' => "Binding Error: Failed to bind parameters for efficiency view: " . $stmt->error]));
    }
} elseif (!empty($filter_data['types'])) {
    if (!$stmt->bind_param($filter_data['types'], ...$filter_data['params'])) {
        http_response_code(500);
        die(json_encode(['error' => "Binding Error: Failed to bind parameters for view '$view_mode': " . $stmt->error]));
    }
}

// Handle execution failure gracefully
if (!$stmt->execute()) {
    http_response_code(500);
    die(json_encode(['error' => "Execution Error: Main query failed to execute: " . $stmt->error]));
}

$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    // NULL-safe numeric conversion
    $row['net_pay']             = isset($row['net_pay']) ? (float)$row['net_pay'] : 0;
    $row['statutory_alloc']     = isset($row['statutory_alloc']) ? (float)$row['statutory_alloc'] : 0;
    $row['netpay_plus_statutory'] = isset($row['netpay_plus_statutory']) ? (float)$row['netpay_plus_statutory'] : 0;
    $row['records']             = isset($row['records']) ? (float)$row['records'] : 0;
    $row['hours']               = isset($row['hours']) ? (float)$row['hours'] : 0;
    $row['shipment']            = isset($row['shipment']) ? (float)$row['shipment'] : 0;
    $row['alloc_eds']           = isset($row['alloc_eds']) ? (float)$row['alloc_eds'] : 0;
    $data[] = $row;
}

$stmt->close();
$conn->close();

// JSON encode safely with numeric and UTF-8 handling
echo json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE | JSON_NUMERIC_CHECK);
?>