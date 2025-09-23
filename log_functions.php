<?php
// A reusable function to log user activity to the database.

// Ensure the session is started if it's not already
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

/**
 * Logs an action to the system_logs table.
 *
 * @param mysqli $conn The database connection object.
 * @param string $action The type of action being logged (e.g., 'login', 'view_page').
 * @param string|null $details Additional details about the action (e.g., page name).
 */
function logActivity($conn, $action, $details = null) {
    // Get user info from the session if available
    $employee_id = $_SESSION['employee_id'] ?? null;
    $firstname = $_SESSION['firstname'] ?? 'Guest';

    $sql = "INSERT INTO system_logs (employee_id, firstname, action, details) VALUES (?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("ssss", $employee_id, $firstname, $action, $details);
        $stmt->execute();
        $stmt->close();
    } else {
        // Optional: Log an error to the server's error log if the statement fails
        error_log("Failed to prepare statement for system_logs: " . $conn->error);
    }
}
?>

