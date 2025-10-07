<?php
// --- ERROR REPORTING (Good for development, remove in production) ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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

// --- API ROUTER ---
$action = $_REQUEST['action'] ?? '';

switch ($action) {
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
        updateApplicant($conn);
        break;
    case 'deleteApplicant':
        deleteApplicant($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action specified.']);
        break;
}
$conn->close();

// --- FUNCTIONS ---

function getAllApplicants($conn) {
    $statusFilter = $_GET['status'] ?? 'all';

    // CORRECTED: Replaced the placeholder comment with all necessary columns.
    $sql = "
        SELECT 
            application_id, surname, firstname, middlename, birthday, gender,
            mobile_number, email, street_address, city, province, postcode,
            position_applied, recruiter_name, status_date, application_source,
            application_date, interview_dates, interviewers, feedback_comments,
            offer_status, offer_date, joining_date, employee_id,
            CASE recruitment_status
                WHEN 1 THEN 'Applied' WHEN 2 THEN 'Screening' WHEN 3 THEN 'Interview Scheduled'
                WHEN 4 THEN 'Interview Completed' WHEN 5 THEN 'Offer Made' WHEN 6 THEN 'Hired'
                WHEN 7 THEN 'Rejected' WHEN 8 THEN 'Onboarding' ELSE 'Unknown'
            END AS recruitment_status_text,
            recruitment_status as recruitment_status_id
        FROM applicants
    ";

    if ($statusFilter !== 'all' && is_numeric($statusFilter)) {
        $sql .= " WHERE recruitment_status = " . intval($statusFilter);
    }
    $sql .= " ORDER BY application_date DESC";

    $result = $conn->query($sql);

    // CORRECTED: Added the missing logic to fetch results and send the JSON response.
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Query failed: ' . $conn->error]);
        exit();
    }
    
    $applicants = [];
    while($row = $result->fetch_assoc()) {
        $applicants[] = $row;
    }
    echo json_encode($applicants);
}

function getStatusCounts($conn) {
    $sql = "SELECT recruitment_status, COUNT(*) as count FROM applicants GROUP BY recruitment_status";
    $result = $conn->query($sql);
    $counts = ['all' => 0];
    $statusMap = [1 => 'Applied', 2 => 'Screening', 3 => 'Interview Scheduled', 4 => 'Interview Completed', 5 => 'Offer Made', 6 => 'Hired', 7 => 'Rejected', 8 => 'Onboarding'];
    
    if ($result) {
        while($row = $result->fetch_assoc()) {
            $statusName = $statusMap[$row['recruitment_status']] ?? 'Unknown';
            $counts[$row['recruitment_status']] = ['name' => $statusName, 'count' => $row['count']];
            $counts['all'] += $row['count'];
        }
    }
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
        1 => 'Applied', 2 => 'Screening', 3 => 'Interview Scheduled', 4 => 'Interview Completed',
        5 => 'Offer Made', 6 => 'Hired', 7 => 'Rejected', 8 => 'Onboarding'
    ];
    echo json_encode(['recruiters' => $recruiters, 'statuses' => $statuses]);
}

function updateApplicant($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']);
        exit();
    }

    $setClauses = [];
    $params = [];
    $types = '';

    // CORRECTED: Completed the whitelist with all editable columns from your table.
    $allowedColumns = [
        'surname', 'firstname', 'middlename', 'birthday', 'gender', 'mobile_number',
        'email', 'street_address', 'city', 'province', 'postcode', 'position_applied',
        'recruiter_name', 'recruitment_status', 'status_date', 'application_source',
        'interview_dates', 'interviewers', 'feedback_comments', 'offer_status',
        'offer_date', 'joining_date', 'employee_id'
    ];

    foreach ($data as $key => $value) {
        if ($key === 'application_id') continue;
        if(in_array($key, $allowedColumns)) {
            $setClauses[] = "`{$key}` = ?";
            // Use null for empty strings to clear fields in the database
            $params[] = ($value === '') ? null : $value;
            $types .= 's';
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
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Applicant updated successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to update applicant: ' . $stmt->error]);
    }
    $stmt->close();
}

function deleteApplicant($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    if ($applicationId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']);
        exit();
    }
    
    $stmt = $conn->prepare("DELETE FROM applicants WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Applicant deleted successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete applicant: ' . $stmt->error]);
    }
    $stmt->close();
}
?>