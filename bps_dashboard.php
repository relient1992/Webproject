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

// --- DATA FETCHING LOGIC ---
$startDate = isset($_GET['startDate']) ? $_GET['startDate'] : date('Y-m-d');
$endDate = isset($_GET['endDate']) ? $_GET['endDate'] : date('Y-m-d');

$sql = "";

// --- UPDATED AGGREGATION LOGIC ---
// This block checks if a date range is selected and chooses the correct SQL query.
if ($startDate === $endDate) {
    // If it's a single day, get all individual records using your original query structure.
    $sql = "SELECT 
                eds, 
                OperatorName AS employee,
                `TL Name` AS tl_name, 
                Taskname as taskname,
                Records AS records, 
                Hours AS hours, 
                Shipment AS shipment, 
                `ALLOC. EDS` AS alloc_eds,
                fieldcount AS tputs,
                fieldcount AS vph,
                fieldcount AS utilization,
                fieldcount as prod_ks_tputs,
                fieldcount as payroll_ks_tputs,
                site,
                `Primary Project` as projects
            FROM 
                bps_dashboard 
            WHERE 
                proddate = ?";
} else {
    // If it's a date range, aggregate the data by eds and taskname.
    $sql = "SELECT 
                eds,
                TaskName AS taskname,
                GROUP_CONCAT(DISTINCT OperatorName SEPARATOR ', ') AS employee,
                GROUP_CONCAT(DISTINCT `TL Name` SEPARATOR ', ') AS tl_name,
                SUM(Records) AS records,
                SUM(Hours) AS hours,
                SUM(Shipment) AS shipment,
                SUM(`ALLOC. EDS`) AS alloc_eds,
                SUM(fieldcount) AS tputs,
                IF(SUM(Hours) > 0, SUM(Records) / SUM(Hours), 0) AS vph, /* Recalculate VPH for accuracy */
                AVG(fieldcount) AS utilization, /* Average Utilization */
                SUM(fieldcount) AS prod_ks_tputs,
                SUM(fieldcount) AS payroll_ks_tputs,
                GROUP_CONCAT(DISTINCT site SEPARATOR ', ') AS site,
                GROUP_CONCAT(DISTINCT `Primary Project` SEPARATOR ', ') AS projects
            FROM 
                bps_dashboard 
            WHERE 
                proddate BETWEEN ? AND ?
            GROUP BY
                eds, TaskName
            ORDER BY
                eds, TaskName";
}

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]));
}

// Bind parameters based on which query was selected
if ($startDate === $endDate) {
    $stmt->bind_param('s', $startDate);
} else {
    $stmt->bind_param('ss', $startDate, $endDate);
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