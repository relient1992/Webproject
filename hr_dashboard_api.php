<?php
// --- ERROR REPORTING ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Start session to access variables set by login
session_start();

header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
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

// --- FIX FOR Ñ (Set encoding to UTF-8) ---
// This ensures that special characters like Ñ and ñ are handled correctly.
$conn->set_charset("utf8mb4");

// --- ROLE-BASED ACCESS CONTROL ---
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
    case 'getChartData': 
        getChartData($conn); 
        break;
    case 'getRecruiterPerformance': 
        getRecruiterPerformance($conn); 
        break;
    case 'bulkInsert': 
        bulkInsertApplicants($conn, $loggedInUser); 
        break;    
    case 'bulkUpdateStatus': 
        bulkUpdateStatus($conn, $loggedInUser); 
        break; 
    case 'saveColumnPrefs': 
        saveColumnPreferences($conn, $loggedInUser); 
        break;
    case 'resetColumnPrefs': 
        resetColumnPreferences($conn, $loggedInUser); 
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
    // UPDATED query to fetch preferences
    $stmt = $conn->prepare("SELECT dashboard_preferences FROM user_accounts WHERE employee_id = ?");
    $stmt->bind_param("s", $employeeId);
    $stmt->execute();
    $result = $stmt->get_result();
    $prefs = null;
    
    if ($row = $result->fetch_assoc()) {
        $prefs = $row['dashboard_preferences'];
    }
    
    echo json_encode([
        'employee_id' => $employeeId, 
        'role' => $role,
        'preferences' => $prefs ? json_decode($prefs, true) : null // Return JSON object or null
    ]);
}

function getAllApplicants($conn) {
    $view = $_GET['view'] ?? 'active';
    $statusFilter = $_GET['status'] ?? 'all';
    $is_archived = ($view === 'archived') ? 1 : 0;

    // UPDATED SELECT: Included the new pre-screening and experience columns
    $sql = "
        SELECT 
            application_id, surname, firstname, middlename, birthday, gender,
            mobile_number, email, street_address, city, province, postcode,
            position_applied, recruiter_name, status_date, application_source,
            application_date, interview_dates, interviewers, feedback_comments,
            offer_status, offer_date, joining_date, employee_id, Project,
            facebook_account, instagram_account, twitter_account, viber_account,
            education_level, college_degree,
            experience_years, specific_skill, screening_score, screening_status,
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

    $applicants = [];
    while($row = $result->fetch_assoc()) {
        $applicants[] = $row;
    }
    echo json_encode($applicants);
}

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

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $counts = ['all' => 0];

    // NEW: Count Qualified Applicants (Score >= 70) for the Dashboard Card
    $q_res = $conn->query("SELECT COUNT(*) as qcount FROM applicants WHERE screening_score >= 70 AND is_archived = 0");
    $counts['qualified_total'] = ($q_res) ? $q_res->fetch_assoc()['qcount'] : 0;

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
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { 
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); 
        exit(); 
    }

    $stmt_select = $conn->prepare("SELECT * FROM applicants WHERE application_id = ?");
    $stmt_select->bind_param("i", $applicationId);
    $stmt_select->execute();
    $result = $stmt_select->get_result();
    $oldData = $result->fetch_assoc();
    $stmt_select->close();

    if (!$oldData) { 
        http_response_code(404); 
        echo json_encode(['status' => 'error', 'message' => 'Applicant not found.']); 
        exit(); 
    }

    $setClauses = []; $params = []; $types = '';
    // UPDATED: Added new screening and experience columns to the allowed list for updates
    $allowedColumns = [ 
        'surname', 'firstname', 'middlename', 'birthday', 'gender', 'mobile_number', 'email', 
        'street_address', 'city', 'province', 'postcode', 'position_applied', 'recruiter_name', 
        'recruitment_status', 'status_date', 'application_source', 'interview_dates', 'interviewers', 
        'feedback_comments', 'offer_status', 'offer_date', 'joining_date', 'employee_id', 'Project',
        'facebook_account', 'instagram_account', 'twitter_account', 'viber_account', 
        'education_level', 'college_degree', 'experience_years', 'specific_skill', 'screening_score', 'screening_status' 
    ];

    foreach ($data as $key => $value) { 
        if ($key === 'application_id') continue; 
        if(in_array($key, $allowedColumns)) { 
            $setClauses[] = "`{$key}` = ?"; 
            $params[] = ($value === '') ? null : $value; 
            // Use 'i' for screening_score if it's numeric
            $types .= (is_numeric($value) && $key === 'screening_score') ? 'i' : 's'; 
        } 
    }
    
    if (empty($setClauses)) { 
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'No valid fields to update.']); 
        exit(); 
    }

    $sql = "UPDATE applicants SET " . implode(', ', $setClauses) . " WHERE application_id = ?";
    $types .= 'i'; 
    $params[] = $applicationId;
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) { 
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'Prepare failed: ' . $conn->error]); 
        exit(); 
    }
    
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'UPDATE', "Updated applicant ID #{$applicationId}.");
        echo json_encode(['status' => 'success', 'message' => 'Applicant updated successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to update applicant: ' . $stmt->error]);
    }
    $stmt->close();
}


function archiveApplicant($conn, $userIdentifier, $userRole) {
    if ($userRole !== 'hr_manager' && $userRole !== 'super_user') { 
        http_response_code(403); 
        echo json_encode(['status' => 'error', 'message' => 'Access Denied.']); 
        exit(); 
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { 
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); 
        exit(); 
    }

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 1 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'ARCHIVE', "Archived applicant ID #{$applicationId}.");
        echo json_encode(['status' => 'success', 'message' => 'Applicant archived successfully.']);
    } else { 
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'Failed to archive applicant.']); 
    }
    $stmt->close();
}

function restoreApplicant($conn, $userIdentifier, $userRole) {
    if ($userRole !== 'hr_manager' && $userRole !== 'super_user') { 
        http_response_code(403); 
        echo json_encode(['status' => 'error', 'message' => 'Access Denied.']); 
        exit(); 
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) { 
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); 
        exit(); 
    }

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 0 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'RESTORE', "Restored applicant ID #{$applicationId}.");
        echo json_encode(['status' => 'success', 'message' => 'Applicant restored successfully.']);
    } else { 
        http_response_code(500); 
        echo json_encode(['status' => 'error', 'message' => 'Failed to restore applicant.']); 
    }
    $stmt->close();
}

function getSystemLogs($conn) {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $limit = $_GET['limit'] ?? '50'; 

    $sql = "SELECT log_id, username, action_type, action_description, timestamp FROM hr_system_logs";
    $params = [];
    $types = '';
    
    if ($startDate && $endDate) {
        $sql .= " WHERE DATE(timestamp) BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= 'ss';
    }
    
    $sql .= " ORDER BY timestamp DESC";

    if (is_numeric($limit)) {
        $sql .= " LIMIT ?";
        $params[] = (int)$limit;
        $types .= 'i';
    }

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $logs = [];
    while($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    $stmt->close();
    echo json_encode($logs);
}

function getChartData($conn) {
    $metric = $_GET['metric'] ?? 'applicantTrend';
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    
    $whereClause = 'WHERE is_archived = 0';
    $dateColumnForFilter = ($metric === 'deploymentTrend') ? 'status_date' : 'application_date';

    $params = [];
    $types = '';

    if($startDate && $endDate) {
        $whereClause .= " AND DATE({$dateColumnForFilter}) BETWEEN ? AND ?";
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= 'ss';
    }

    $data = [];
    switch ($metric) {
        case 'deploymentTrend':
            $sql = "SELECT DATE(joining_date) as date, COUNT(*) as count FROM applicants $whereClause AND recruitment_status = 13 GROUP BY DATE(joining_date) ORDER BY date ASC";
            break;
        case 'topSources':
            $sql = "SELECT application_source as label, COUNT(*) as count FROM applicants $whereClause GROUP BY application_source ORDER BY count DESC";
            break;
        case 'screeningPerformance':
            // NEW CHART METRIC: Breakdown of Screening Statuses
            $sql = "SELECT screening_status as label, COUNT(*) as count FROM applicants $whereClause GROUP BY screening_status ORDER BY count DESC";
            break;
        case 'applicantTrend':
        default:
            $sql = "SELECT DATE(application_date) as date, COUNT(*) as count FROM applicants $whereClause GROUP BY DATE(application_date) ORDER BY date ASC";
            break;
    }

    $stmt = $conn->prepare($sql);
    if ($stmt && !empty($params)) { 
        $stmt->bind_param($types, ...$params); 
    }
    $stmt->execute();
    $result = $stmt->get_result();
    while($row = $result->fetch_assoc()){ 
        $data[] = $row; 
    }
    $stmt->close();
    echo json_encode($data);
}

function getRecruiterPerformance($conn) {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $whereClause = 'WHERE recruiter_name IS NOT NULL AND recruiter_name != ""';
    $params = [];
    $types = '';
    if($startDate && $endDate) {
        $whereClause .= ' AND DATE(application_date) BETWEEN ? AND ?';
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= 'ss';
    }

    $sql = "
        SELECT
            recruiter_name,
            COUNT(*) as total_handled,
            SUM(CASE WHEN recruitment_status = 13 THEN 1 ELSE 0 END) as total_deployed,
            SUM(CASE WHEN offer_status = 'Accepted' THEN 1 ELSE 0 END) as offers_accepted,
            SUM(CASE WHEN offer_status = 'Declined' THEN 1 ELSE 0 END) as offers_declined,
            SUM(CASE WHEN recruitment_status = 14 THEN 1 ELSE 0 END) as withdrawn,
            AVG(CASE WHEN recruitment_status = 13 THEN DATEDIFF(joining_date, application_date) ELSE NULL END) as avg_time_to_hire
        FROM applicants
        $whereClause
        GROUP BY recruiter_name
    ";
    $stmt = $conn->prepare($sql);
    if ($stmt && !empty($params)) { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while($row = $result->fetch_assoc()){
        $totalOffers = $row['offers_accepted'] + $row['offers_declined'];
        $row['acceptance_rate'] = $totalOffers > 0 ? round(($row['offers_accepted'] / $totalOffers) * 100, 2) : 0;
        $row['withdrawal_rate'] = $row['total_handled'] > 0 ? round(($row['withdrawn'] / $row['total_handled']) * 100, 2) : 0;
        $row['avg_time_to_hire'] = $row['avg_time_to_hire'] ? round($row['avg_time_to_hire']) : null;
        $data[] = $row;
    }
    $stmt->close();
    echo json_encode($data);
}

function bulkInsertApplicants($conn, $userIdentifier) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data) || !is_array($data)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid or empty data provided.']);
        exit();
    }

    // UPDATED: Added the new screening columns to the bulk insert template
    $columns = [
        "surname", "firstname", "middlename", "birthday", "gender", "mobile_number", "email",
        "street_address", "city", "province", "postcode", "position_applied", "recruiter_name",
        "recruitment_status", "status_date", "application_source", "interview_dates", "interviewers",
        "feedback_comments", "offer_status", "offer_date", "joining_date", "employee_id", "Project",
        "facebook_account", "instagram_account", "twitter_account", "viber_account",
        "education_level", "college_degree", "experience_years", "specific_skill", "screening_score", "screening_status"
    ];
    
    $placeholders = rtrim(str_repeat('?,', count($columns)), ',');
    $sql = "INSERT INTO applicants (" . implode(', ', array_map(fn($c) => "`$c`", $columns)) . ") VALUES ({$placeholders})";
    
    $stmt = $conn->prepare($sql);
    $types = str_repeat('s', count($columns));
    
    $conn->begin_transaction();
    try {
        $insertedCount = 0;
        foreach ($data as $row) {
            $params = [];
            foreach ($columns as $col) {
                $params[] = $row[$col] ?? null;
            }
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $insertedCount++;
        }
        $conn->commit();
        logAction($conn, $userIdentifier, 'BULK_INSERT', "Successfully uploaded {$insertedCount} applicants via CSV.");
        echo json_encode(['status' => 'success', 'message' => "Successfully inserted {$insertedCount} records."]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'An error occurred: ' . $e->getMessage()]);
    }
    $stmt->close();
}

function bulkUpdateStatus($conn, $userIdentifier) {
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationIds = $data['application_ids'] ?? [];
    $newStatus = intval($data['new_status'] ?? 0);

    if (empty($applicationIds) || $newStatus <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid data provided.']);
        exit();
    }

    $ids = implode(',', array_map('intval', $applicationIds)); 
    $sql = "UPDATE applicants SET recruitment_status = ?, status_date = CURDATE() WHERE application_id IN ($ids)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $newStatus);

    if ($stmt->execute()) {
        $affectedRows = $stmt->affected_rows;
        logAction($conn, $userIdentifier, 'BULK_UPDATE', "Updated status for {$affectedRows} applicants to ID {$newStatus}.");
        echo json_encode(['status' => 'success', 'message' => "Successfully updated {$affectedRows} applicants."]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
    }
    $stmt->close();
}

function saveColumnPreferences($conn, $userIdentifier) {
    $data = json_decode(file_get_contents('php://input'), true);
    $columns = $data['columns'] ?? [];
    
    if (empty($columns)) {
        echo json_encode(['status' => 'error', 'message' => 'No columns provided.']);
        exit();
    }

    // Save as JSON
    $jsonPrefs = json_encode(['visibleColumns' => $columns]);
    
    $stmt = $conn->prepare("UPDATE user_accounts SET dashboard_preferences = ? WHERE employee_id = ?");
    $stmt->bind_param("ss", $jsonPrefs, $userIdentifier);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Column order saved as default!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save preferences.']);
    }
}

function resetColumnPreferences($conn, $userIdentifier) {
    $stmt = $conn->prepare("UPDATE user_accounts SET dashboard_preferences = NULL WHERE employee_id = ?");
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Columns reset to system default.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to reset preferences.']);
    }
}

?>