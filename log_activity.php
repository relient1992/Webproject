<?php
// This script receives requests from the frontend (router.js) to log SPA view changes.

// Include the reusable logging function
require_once 'log_functions.php';

// Security check: only logged-in users can log activity.
// The session is started by log_functions.php.
if (!isset($_SESSION['employee_id'])) {
    http_response_code(403); // Forbidden
    echo json_encode(['error' => 'User not authenticated.']);
    exit();
}

// --- DATABASE CONNECTION ---
// Make sure these credentials match your database setup
// $servername = "10.200.168.89";
// $username   = "supersu";
// $password   = "H110mds2!";
// $database   = "database_rda";

$servername = "localhost";
$username = "root";
$password = "";
$database = "database_rda";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    // Log the actual error to the server's log for debugging
    error_log("Database connection failed: " . $conn->connect_error);
    // Send a generic error to the client
    die(json_encode(['error' => "Database connection failed."]));
}

// Get the data sent from the JavaScript POST request
$action = $_POST['action'] ?? null;
$details = $_POST['details'] ?? null;

// Ensure we have the required data before logging
if ($action && $details) {
    logActivity($conn, $action, $details);
    echo json_encode(['success' => true, 'message' => "Logged view: $details"]);
} else {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Missing action or details for logging.']);
}

$conn->close();
?>
