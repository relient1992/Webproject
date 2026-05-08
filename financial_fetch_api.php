<?php
header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
$servername = "10.200.168.89"; // Adjust if needed
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// Fetch all rows (You can add ORDER BY or WHERE clauses later if the dataset gets huge)
$sql = "SELECT * FROM `financial_data` ORDER BY `Dated` DESC";
$result = $conn->query($sql);

$data = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

echo json_encode(['success' => true, 'data' => $data]);
$conn->close();
?>