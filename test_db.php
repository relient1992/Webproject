<?php
// Turn on error reporting for this test
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h3>Diagnostic Test Starting...</h3>";

// 1. Check if MySQLi is actually loaded now
if (!function_exists('mysqli_connect')) {
    die("<p style='color:red;'><strong>FATAL ERROR:</strong> The MySQLi extension is STILL NOT loading. We need to check the Windows System Path.</p>");
}
echo "<p style='color:green;'>1. MySQLi Extension is loaded successfully!</p>";

// 2. Try to connect to the database
$servername = "10.200.168.89"; // If XAMPP is on this same PC, try "127.0.0.1" instead
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

try {
    $conn = new mysqli($servername, $username, $password, $database);
    
    if ($conn->connect_error) {
        die("<p style='color:red;'><strong>2. Connection failed:</strong> " . $conn->connect_error . "</p>");
    }
    
    echo "<p style='color:green;'><strong>2. SUCCESS:</strong> PHP via IIS successfully connected to your XAMPP MySQL Database!</p>";
    $conn->close();

} catch (Throwable $e) {
    echo "<p style='color:red;'><strong>2. CRITICAL ERROR:</strong> " . $e->getMessage() . "</p>";
}