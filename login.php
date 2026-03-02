<?php
require_once 'log_functions.php';
//session_start();

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

            // --- ADVANCED TECH LOADING SCREEN ---
            echo "
            <style>
                body {
                    margin: 0; padding: 0; 
                    background-color: #223562; /* Dark sleek slate background */
                    display: flex; justify-content: center; align-items: center; 
                    height: 100vh; overflow: hidden;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .tech-loader-container {
                    text-align: center;
                    display: flex; flex-direction: column; align-items: center;
                }
                .spinner-wrapper {
                    position: relative; width: 80px; height: 80px; margin-bottom: 30px;
                }
                .spinner-outer {
                    width: 80px; height: 80px;
                    border: 3px solid transparent;
                    border-top: 3px solid #06b6d4; /* Cyan glow */
                    border-right: 3px solid #06b6d4;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
                }
                .spinner-inner {
                    width: 56px; height: 56px;
                    border: 3px solid transparent;
                    border-bottom: 3px solid #6366f1; /* Indigo glow */
                    border-left: 3px solid #6366f1;
                    border-radius: 50%;
                    position: absolute; top: 12px; left: 12px;
                    animation: spin-reverse 0.75s linear infinite;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
                }
                .tech-text {
                    color: #06b6d4; font-family: monospace; font-size: 1.2rem;
                    letter-spacing: 3px; text-transform: uppercase;
                    animation: pulse 1.5s ease-in-out infinite;
                    margin-bottom: 10px;
                }
                .sub-text {
                    color: #94a3b8; font-family: monospace; font-size: 0.85rem;
                    letter-spacing: 1px;
                }
                .user-highlight { color: #f8fafc; font-weight: bold; }
                
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes spin-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            </style>

            <div class='tech-loader-container'>
                <div class='spinner-wrapper'>
                    <div class='spinner-outer'></div>
                    <div class='spinner-inner'></div>
                </div>
                <div class='tech-text' id='status-text'>AUTHENTICATING...</div>
                <div class='sub-text'>USER: <span class='user-highlight'>$safeName</span> | ROLE: <span class='user-highlight'>$safeRole</span></div>
            </div>

            <script>
                // Terminal-style loading sequence
                const sequences = [
                    'AUTHENTICATING...',
                    'VERIFYING CLEARANCE...',
                    'ESTABLISHING SECURE CONNECTION...',
                    'ACCESS GRANTED'
                ];
                
                let step = 0;
                const textEl = document.getElementById('status-text');
                
                const loadInterval = setInterval(() => {
                    step++;
                    if (step < sequences.length) {
                        textEl.innerText = sequences[step];
                        // Turn green on final step
                        if (step === sequences.length - 1) {
                            textEl.style.color = '#10b981'; 
                            textEl.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
                        }
                    } else {
                        clearInterval(loadInterval);
                        window.location.href = '$redirectPage';
                    }
                }, 700); // Transitions every 700ms
            </script>
            ";
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