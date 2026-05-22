<?php
// --- DATABASE CONNECTION ---
$servername = "10.200.168.89"; // Adjust if necessary
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Retrieve POST variables
$colsRaw = $_POST['cols'] ?? '';
$labelsRaw = $_POST['labels'] ?? '';
$start = $_POST['start'] ?? '';
$end = $_POST['end'] ?? '';
$filename = $_POST['filename'] ?? '';
$inputPassword = $_POST['password'] ?? '';

if (empty($colsRaw) || empty($start) || empty($end) || empty($filename) || empty($inputPassword)) {
    die("Missing required export parameters.");
}

// --- PROJECT LEVEL SECURITY AUTHENTICATION ---
// Map the exact filenames to their required manager passwords
$authMap = [
    'Other P&L(finance)' => 'FinanceXBP2026!',
    'LHI_Headcount'      => 'LhiXBP2026!@#',
    'Scorp_Headcount'    => 'ScorpXBP2026!@#$'
];

if (!array_key_exists($filename, $authMap)) {
    die("Invalid dataset selected.");
}

if ($authMap[$filename] !== $inputPassword) {
    // If the password is wrong, echo a script to alert them and close the blank tab
    echo "<script>
        alert('Unauthorized: Incorrect Manager Password for " . addslashes($filename) . "');
        window.close();
    </script>";
    exit();
}

// Security: Enforce safe column names to prevent SQL Injection
$allowedColumns = [
    'dated', 'empid', 'empname', 'groupname', 'headcount', 
    'position', 'plm_project_name', 'cost_pct', 'cost', 'dept_based_on_summary'
];

$requestedCols = explode(',', $colsRaw);
$safeCols = [];
foreach ($requestedCols as $col) {
    $col = trim($col);
    if (in_array($col, $allowedColumns)) {
        $safeCols[] = "`$col`";
    }
}

if (empty($safeCols)) {
    die("No valid columns selected.");
}

$selectString = implode(', ', $safeCols);
$headers = explode(',', $labelsRaw);

// Prepare the SQL Query (Now filtering strictly by filename!)
$sql = "SELECT $selectString FROM `financial_headcount_detailed` 
        WHERE DATE_FORMAT(`dated`, '%Y-%m') BETWEEN ? AND ?
        AND `filename` = ?
        ORDER BY `dated` DESC, `empname` ASC";

$stmt = $conn->prepare($sql);
// Bind 3 strings: Start Date, End Date, Filename
$stmt->bind_param("sss", $start, $end, $filename);
$stmt->execute();
$result = $stmt->get_result();

// --- GENERATE AND STREAM CSV ---
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . str_replace(' ', '_', $filename) . '_Export_' . date('Ymd') . '.csv"');
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

fputcsv($output, $headers);

while ($row = $result->fetch_assoc()) {
    fputcsv($output, $row);
}

fclose($output);
$stmt->close();
$conn->close();
exit();
?>