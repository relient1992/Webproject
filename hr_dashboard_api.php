<?php
// --- ERROR REPORTING (Good for development, remove in production) ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Start session to access variables set by your login.php
session_start();

header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
// Using the credentials you provided for the recruitment system.
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";


$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- REAL ROLE-BASED ACCESS CONTROL ---
if (!isset($_SESSION['employee_id'])) {
    http_response_code(401); 
    echo json_encode(['status' => 'error', 'message' => 'Authentication required. Please log in first.']);
    exit();
}
$loggedInUser = $_SESSION['employee_id'];
$userRole = 'hr_staff'; 

$stmt_role = $conn->prepare(
    "SELECT rt.role_name 
     FROM user_roles ur
     JOIN roles_table rt ON ur.role_id = rt.role_id
     WHERE ur.employee_id = ?"
);

if ($stmt_role === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Role check query failed: ' . $conn->error]);
    exit();
}

$stmt_role->bind_param("s", $loggedInUser);
$stmt_role->execute();
$result_role = $stmt_role->get_result();
if ($row_role = $result_role->fetch_assoc()) {
    $userRole = strtolower(str_replace(' ', '_', $row_role['role_name']));
}
$stmt_role->close();


// --- API ROUTER ---
$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'getUserInfo':
        getUserInfo($conn, $loggedInUser, $userRole);
        break;
    case 'readAll':
        getAllApplicants($conn);
        break;
    case 'getStatusCounts':
        getStatusCounts($conn);
        break;
    case 'getDropdownData':
        getDropdownData($conn);
        break;
    case 'updateApplicant':
        updateApplicant($conn, $loggedInUser);
        break;
    case 'archiveApplicant':
        archiveApplicant($conn, $loggedInUser, $userRole);
        break;
    case 'restoreApplicant':
        restoreApplicant($conn, $loggedInUser, $userRole);
        break;
    case 'getSystemLogs':
        getSystemLogs($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}
$conn->close();

// --- LOGGING FUNCTION ---
function logAction($conn, $userIdentifier, $actionType, $description) {
    $stmt = $conn->prepare("INSERT INTO hr_system_logs (username, action_type, action_description) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $userIdentifier, $actionType, $description);
    $stmt->execute();
    $stmt->close();
}


// --- CORE FUNCTIONS ---

function getUserInfo($conn, $employeeId, $role) {
    echo json_encode(['employee_id' => $employeeId, 'role' => $role]);
}

// CORRECTED: This function now properly builds the query with multiple placeholders
function getAllApplicants($conn) {
    $view = $_GET['view'] ?? 'active';
    $statusFilter = $_GET['status'] ?? 'all';
    $is_archived = ($view === 'archived') ? 1 : 0;

    $sql = "
        SELECT 
            application_id, surname, firstname, middlename, birthday, gender,
            mobile_number, email, street_address, city, province, postcode,
            position_applied, recruiter_name, status_date, application_source,
            application_date, interview_dates, interviewers, feedback_comments,
            offer_status, offer_date, joining_date, employee_id,
            facebook_account, instagram_account, twitter_account, viber_account,
            education_level, college_degree,
            CASE recruitment_status
                WHEN 1 THEN 'Applied' WHEN 2 THEN 'Failed Speedtest' WHEN 3 THEN 'Initial Interview'
                WHEN 4 THEN 'Failed L1 Interview' WHEN 5 THEN 'Final Interview' WHEN 6 THEN 'Failed L2 Interview'
                WHEN 7 THEN 'For BGV' WHEN 8 THEN 'Job Offer' WHEN 9 THEN 'Processing Requirements'
                WHEN 10 THEN 'Complete Requirements' WHEN 11 THEN 'Onboarding' WHEN 12 THEN 'Pooling'
                WHEN 13 THEN 'Deployed' WHEN 14 THEN 'Withdrawn' WHEN 15 THEN 'Declined Offer'
                ELSE 'Unknown'
            END AS recruitment_status_text,
            recruitment_status as recruitment_status_id
        FROM applicants
        WHERE is_archived = ?
    ";
    
    $params = [$is_archived];
    $types = 'i';

    if ($statusFilter !== 'all' && is_numeric($statusFilter)) {
        $sql .= " AND recruitment_status = ?";
        $params[] = intval($statusFilter);
        $types .= 'i';
    }
    $sql .= " ORDER BY application_date DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed: ' . $conn->error]);
        exit();
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Query execution failed: ' . $stmt->error]);
        exit();
    }
    $applicants = [];
    while($row = $result->fetch_assoc()) {
        $applicants[] = $row;
    }
    echo json_encode($applicants);
}

// CORRECTED: Fixed variable name and return structure
function getStatusCounts($conn) {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $view = $_GET['view'] ?? 'active';
    $is_archived = ($view === 'archived') ? 1 : 0;

    $sql = "SELECT recruitment_status, COUNT(*) as count FROM applicants WHERE is_archived = ?";
    $params = [$is_archived];
    $types = 'i';

    if ($startDate && $endDate) {
        $sql .= " AND DATE(application_date) BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= 'ss';
    }

    $sql .= " GROUP BY recruitment_status";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]);
        exit();
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $counts = ['all' => 0];
    $statusMap = [
        1 => 'Applied', 2 => 'Failed Speedtest', 3 => 'Initial Interview', 4 => 'Failed L1 Interview', 5 => 'Final Interview', 6 => 'Failed L2 Interview', 7 => 'For BGV', 8 => 'Job Offer', 9 => 'Processing Requirements', 10 => 'Complete Requirements', 11 => 'Onboarding', 12 => 'Pooling', 13 => 'Deployed', 14 => 'Withdrawn', 15 => 'Declined Offer'
    ];
    
    if ($result) {
        while($row = $result->fetch_assoc()) {
            if (isset($statusMap[$row['recruitment_status']])) {
                $statusName = $statusMap[$row['recruitment_status']];
                $counts[$row['recruitment_status']] = ['name' => $statusName, 'count' => $row['count']];
                $counts['all'] += $row['count'];
            }
        }
    }
    $stmt->close();
    echo json_encode($counts);
}

function getDropdownData($conn) {
    $recruiters = [];
    $result = $conn->query("SHOW COLUMNS FROM applicants WHERE Field = 'recruiter_name'");
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        preg_match_all("/'([^']+)'/", $row['Type'], $matches);
        $recruiters = $matches[1];
    }
    $statuses = [
        1 => 'Applied', 2 => 'Failed Speedtest', 3 => 'Initial Interview', 4 => 'Failed L1 Interview',
        5 => 'Final Interview', 6 => 'Failed L2 Interview', 7 => 'For BGV', 8 => 'Job Offer',
        9 => 'Processing Requirements', 10 => 'Complete Requirements', 11 => 'Onboarding', 12 => 'Pooling',
        13 => 'Deployed', 14 => 'Withdrawn', 15 => 'Declined Offer'
    ];
    echo json_encode(['recruiters' => $recruiters, 'statuses' => $statuses]);
}

function updateApplicant($conn, $userIdentifier) {
    // This function remains the same
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); exit(); }

    $stmt_select = $conn->prepare("SELECT * FROM applicants WHERE application_id = ?");
    $stmt_select->bind_param("i", $applicationId);
    $stmt_select->execute();
    $result = $stmt_select->get_result();
    $oldData = $result->fetch_assoc();
    $stmt_select->close();

    if (!$oldData) { http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'Applicant not found.']); exit(); }

    $setClauses = []; $params = []; $types = '';
    $allowedColumns = [ 'surname', 'firstname', 'middlename', 'birthday', 'gender', 'mobile_number', 'email', 'street_address', 'city', 'province', 'postcode', 'position_applied', 'recruiter_name', 'recruitment_status', 'status_date', 'application_source', 'interview_dates', 'interviewers', 'feedback_comments', 'offer_status', 'offer_date', 'joining_date', 'employee_id', 'facebook_account', 'instagram_account', 'twitter_account', 'viber_account', 'education_level', 'college_degree' ];

    foreach ($data as $key => $value) { if ($key === 'application_id') continue; if(in_array($key, $allowedColumns)) { $setClauses[] = "`{$key}` = ?"; $params[] = ($value === '') ? null : $value; $types .= 's'; } }
    if (empty($setClauses)) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'No valid fields to update.']); exit(); }

    $sql = "UPDATE applicants SET " . implode(', ', $setClauses) . " WHERE application_id = ?";
    $types .= 'i'; $params[] = $applicationId;
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]); exit(); }
    
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $changesDescription = "";
        $statusMap = [ 1 => 'Applied', 2 => 'Failed Speedtest', 3 => 'Initial Interview', 4 => 'Failed L1 Interview', 5 => 'Final Interview', 6 => 'Failed L2 Interview', 7 => 'For BGV', 8 => 'Job Offer', 9 => 'Processing Requirements', 10 => 'Complete Requirements', 11 => 'Onboarding', 12 => 'Pooling', 13 => 'Deployed', 14 => 'Withdrawn', 15 => 'Declined Offer' ];
        
        foreach ($data as $key => $newValue) {
            if ($key === 'application_id') continue;
            if (isset($oldData[$key]) && $oldData[$key] != $newValue) {
                $oldValue = $oldData[$key] ?? 'NULL';
                $newValue = $newValue ?? 'NULL';
                if ($key === 'recruitment_status') { $oldValueText = $statusMap[$oldValue] ?? 'Unknown'; $newValueText = $statusMap[$newValue] ?? 'Unknown'; $changesDescription .= "[Status: '{$oldValueText}' -> '{$newValueText}'] "; } else { $changesDescription .= "[{$key}: '{$oldValue}' -> '{$newValue}'] "; }
            }
        }
        if (empty($changesDescription)) { $changesDescription = "No values were changed."; }
        logAction($conn, $userIdentifier, 'UPDATE', "Updated applicant ID #{$applicationId}. Changes: " . trim($changesDescription));
        
        echo json_encode(['status' => 'success', 'message' => 'Applicant updated successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to update applicant: ' . $stmt->error]);
    }
    $stmt->close();
}


function archiveApplicant($conn, $userIdentifier, $userRole) {
    if ($userRole !== 'hr_manager' && $userRole !== 'super_user') { http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'Access Denied.']); exit(); }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); exit(); }

    $stmt_select = $conn->prepare("SELECT surname, firstname FROM applicants WHERE application_id = ?");
    $stmt_select->bind_param("i", $applicationId); $stmt_select->execute();
    $applicantNameResult = $stmt_select->get_result()->fetch_assoc();
    $applicantName = $applicantNameResult ? "({$applicantNameResult['surname']}, {$applicantNameResult['firstname']})" : "";
    $stmt_select->close();

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 1 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'ARCHIVE', "Archived applicant ID #{$applicationId} {$applicantName}.");
        echo json_encode(['status' => 'success', 'message' => 'Applicant archived successfully.']);
    } else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Failed to archive applicant.']); }
    $stmt->close();
}

function restoreApplicant($conn, $userIdentifier, $userRole) {
    if ($userRole !== 'hr_manager' && $userRole !== 'super_user') { http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'Access Denied.']); exit(); }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); exit(); }

    $stmt_select = $conn->prepare("SELECT surname, firstname FROM applicants WHERE application_id = ?");
    $stmt_select->bind_param("i", $applicationId); $stmt_select->execute();
    $applicantNameResult = $stmt_select->get_result()->fetch_assoc();
    $applicantName = $applicantNameResult ? "({$applicantNameResult['surname']}, {$applicantNameResult['firstname']})" : "";
    $stmt_select->close();

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 0 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'RESTORE', "Restored applicant ID #{$applicationId} {$applicantName}.");
        echo json_encode(['status' => 'success', 'message' => 'Applicant restored successfully.']);
    } else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Failed to restore applicant.']); }
    $stmt->close();
}

function getSystemLogs($conn) {
    $result = $conn->query("SELECT log_id, username, action_type, action_description, timestamp FROM hr_system_logs ORDER BY timestamp DESC LIMIT 200");
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch logs: ' . $conn->error]);
        exit();
    }
    $logs = [];
    while($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    echo json_encode($logs);
}
?>
