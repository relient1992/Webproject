<?php

// --- DATABASE CONNECTION ---
// $servername = "10.200.168.89";
// $username   = "supersu";
// $password   = "H110mds2!";
// $database   = "database_rda";

$servername = "localhost";
$username = "root";
$password = "";
$database = "database_rda";

// Create connection
$conn = new mysqli($servername, $username, $password, $database);
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// NOTE: In SQL, the proper GROUP BY syntax for multiple columns is "GROUP BY PROJECT, SITE"
$sql = "SELECT PROJECT, SITE, COUNT(EDS) AS count 
        FROM EMPLOYEE_LISTINGS 
        WHERE EMP_STATUS = 'ACTIVE'
        GROUP BY PROJECT, SITE";
$result = $conn->query($sql);

$data = array();
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Each row contains: PROJECT, SITE, count
        $data[] = $row;
    }
}

echo json_encode($data);
$conn->close();
?>
