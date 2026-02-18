<?php
require_once 'log_functions.php'; 
// session_start();

$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// $servername = "localhost";
// $username = "root";
// $password = "";
// $database = "database_rda";


$conn = new mysqli($servername, $username, $password, $database);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $employee_id = $_POST['employee_id'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("
    SELECT 
        ua.*, 
        ur.role_id,
        el.FIRSTNAME,
        el.POSITION
    FROM user_accounts ua 
    LEFT JOIN user_roles ur ON ua.employee_id = ur.employee_id 
    LEFT JOIN employee_listings el ON ua.employee_id = el.EDS
    WHERE ua.employee_id = ?
    ");
    $stmt->bind_param("s", $employee_id);
    $stmt->execute();
    $result = $stmt->get_result();

    echo "<!DOCTYPE html><html><head>";
    echo "<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>";
    echo "</head><body>";

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            session_regenerate_id(true);
            $_SESSION['employee_id'] = $user['employee_id'];
            $_SESSION['firstname'] = $user['FIRSTNAME'] ?? '';
            $_SESSION['position'] = $user['POSITION'] ?? '';

            $roleMap = [
                1 => 'super_user',
                2 => 'Manager',
                3 => 'Admin',
                4 => 'User',
                5 => 'lhi_admin',
                6 => 'lhi_manager',
                7 => 'lhi_user',
                8 => 'bps_admin',
                9 => 'bps_manager',
                10 => 'bps_user',
                11 => 'bps_quality_user',
                12 => 'hr_staff',
                13 => 'hr_manager',
                14 => 'interviewer'
            ];
            $roleName = $roleMap[$user['role_id']] ?? 'User';
            $_SESSION['user_role'] = $roleName;

            // --- UPDATED: Determine Redirect Page based on Role ---
            $redirectPage = 'main.php'; // Default for everyone else

            // HR Staff or HR Manager
            if ($roleName === 'hr_staff' || $roleName === 'hr_manager') {
                $redirectPage = 'views/hr_dashboard.php';
            }
            // Interviewer
            elseif ($roleName === 'interviewer') {
                $redirectPage = 'views/interview_dashboard.php';
            }
            // -----------------------------------------------------

            logActivity($conn, 'login', 'User logged in successfully.');

            $safeName = htmlspecialchars($user['FIRSTNAME'], ENT_QUOTES, 'UTF-8');
            $safeRole = htmlspecialchars($roleName, ENT_QUOTES, 'UTF-8');

            // 2. Now print the script using the safe variables
            echo "<script>
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    html: 'Welcome <b>$safeName</b><br>Your role: <b>$safeRole</b>',
                    timer: 2500,
                    showConfirmButton: false
                }).then(() => {
                    // Use the dynamic variable here
                    window.location.href = '$redirectPage';
                });
            </script>";
        } else {
            echo "<script>
                Swal.fire({
                    icon: 'error',
                    title: 'Incorrect Password',
                    text: 'Please try again.'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            </script>";
        }
    } else {
        echo "<script>
            Swal.fire({
                icon: 'error',
                title: 'Employee ID Not Found',
                text: 'Please register or try again.'
            }).then(() => {
                window.location.href = 'index.html';
            });
        </script>";
    }

    echo "</body></html>";
    $stmt->close();
}

$conn->close();
?>