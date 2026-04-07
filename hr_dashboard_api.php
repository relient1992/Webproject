<?php
// --- ERROR REPORTING (FIXED) ---
// Turn OFF display_errors to prevent text/warnings from breaking the JSON response
// This is the #1 cause of "stuck" loading spinners.
ini_set('display_errors', 0); 
ini_set('display_startup_errors', 0);
error_reporting(E_ALL); // Keep logging errors to file, but don't show them



// Start session
session_start();

header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
// Live Server
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// Localhost
// $servername = "localhost";
// $username = "root";
// $password = "";
// $database = "database_rda";



$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- UTF-8 SUPPORT ---
$conn->set_charset("utf8mb4");

// --- PUBLIC API ENDPOINTS (No Login Required) ---
$action = $_REQUEST['action'] ?? ''; // Safe check for action

if ($action === 'getSkills') {
    $sql = "SELECT * FROM ref_skills ORDER BY category ASC, skill_name ASC";
    $result = $conn->query($sql);
    
    $skills = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $skills[] = [
                'name' => $row['skill_name'],
                'category' => $row['category']
            ];
        }
    }
    
    echo json_encode($skills);
    $conn->close();
    exit(); // STOP here
}

// --- ROLE-BASED ACCESS CONTROL ---
$public_actions = ['getExamCategories', 'getApplicantExam'];

if (!isset($_SESSION['employee_id']) && !in_array($action, $public_actions)) {
    http_response_code(401); 
    echo json_encode(['status' => 'error', 'message' => 'Authentication required. Please log in first.']);
    exit();
}
$loggedInUser = $_SESSION['employee_id'];

// Default values
$detectedRoleName = 'hr_staff'; 
$detectedRoleId = 0;

$stmt_role = $conn->prepare(
    "SELECT rt.role_name, rt.role_id 
     FROM user_roles ur
     JOIN roles_table rt ON ur.role_id = rt.role_id
     WHERE ur.employee_id = ?"
);

if ($stmt_role) {
    $stmt_role->bind_param("s", $loggedInUser);
    $stmt_role->execute();
    $result_role = $stmt_role->get_result();
    if ($row_role = $result_role->fetch_assoc()) {
        // Normalize the name (e.g. "HR Manager" -> "hr_manager")
        $userRole = strtolower(str_replace(' ', '_', $row_role['role_name']));
    }
    $stmt_role->close();
}



// --- API ROUTER ---
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
    case 'getRequisitions':
        getRequisitions($conn);
        break;
    case 'addRequisition':
        addRequisition($conn, $loggedInUser);
        break;
    case 'updateRequisition':
        updateRequisition($conn, $loggedInUser);
        break;
    case 'uploadResume':
        uploadResume($conn, $loggedInUser);
        break;
    case 'saveResumeLink':
        saveResumeLink($conn, $loggedInUser);
        break;
    case 'checkEmployeeId':
        checkEmployeeId($conn);
    break;
    case 'log_manual_action':
        // Allows frontend to save a specific log message (e.g., "User exported data")
        $desc = $_POST['description'] ?? 'Unknown Action';
        logAction($conn, $loggedInUser, 'USER_ACTION', $desc);
        echo json_encode(['status' => 'success']);
    break;
    case 'getNotifications':
        // USE THE VALUES FETCHED FROM DB ABOVE
        // Do not rely on $_SESSION['role'] which might be missing/stale
        getNotifications($conn, $loggedInUser, $detectedRoleName, $detectedRoleId); 
        break;
    case 'getExamCategories':
        getExamCategories($conn);
        break;
    case 'getApplicantExam':
        getApplicantExam($conn);
        break;
    case 'saveExamQuestion':
        saveExamQuestion($conn, $loggedInUser);
        break;
    case 'addExamCategory':
        addExamCategory($conn, $loggedInUser);
        break;
    case 'deleteExamCategory':
        deleteExamCategory($conn, $loggedInUser);
        break;
    case 'deleteExamQuestion':
        deleteExamQuestion($conn, $loggedInUser);
        break;
    case 'getExamHistory':
        getExamHistory($conn);
        break;      
}
$conn->close();

// --- LOGGING FUNCTION ---
function logAction($conn, $userIdentifier, $actionType, $description) {
    if ($stmt = $conn->prepare("INSERT INTO hr_system_logs (username, action_type, action_description) VALUES (?, ?, ?)")) {
        $stmt->bind_param("sss", $userIdentifier, $actionType, $description);
        $stmt->execute();
        $stmt->close();
    }
}

// --- CORE FUNCTIONS ---

function getUserInfo($conn, $employeeId, $role) {
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
        'preferences' => $prefs ? json_decode($prefs, true) : null
    ]);
}

function getAllApplicants($conn) {
    $view = $_GET['view'] ?? 'active';
    $statusFilter = $_GET['status'] ?? 'all';
    
    // --- VIEW LOGIC SETUP ---
    $is_archived = 0;
    $extraWhere = "";

    if ($view === 'archived') {
        $is_archived = 1;
    } 
    elseif ($view === 'deployed') {
      
        $is_archived = 0;
        $extraWhere = " AND a.recruitment_status = 13";
    } 
    else {
        $is_archived = 0;
        $extraWhere = " AND a.recruitment_status != 13";
    }

    $sql = "
        SELECT 
            a.application_id, a.surname, a.firstname, a.middlename, a.birthday, a.age, a.gender,
            a.mobile_number, a.email, a.street_address, a.city, a.province, a.postcode,
            a.position_applied, a.recruiter_name, a.status_date, a.application_source,
            a.application_date, a.interview_dates, a.interviewers, a.feedback_comments,
            a.offer_status, a.offer_date, a.joining_date, a.employee_id, a.Project,
            a.facebook_account, a.instagram_account, a.twitter_account, a.viber_account,
            a.education_level, a.college_degree,
            a.experience_years, a.specific_skill, a.screening_score, a.screening_status, a.requirements_checklist,
            a.entity, a.hdmf_id, a.sss_no, a.philhealth_no, a.tin_no, a.talento_id, a.requisition_status, a.requisition_id, a.initial_interviewer_id, a.final_interviewer_id, 
            a.resume_path, a.location, a.marital_status, a.relatives_at_xbp, a.relatives_at_xbp_details,
            a.worked_at_xbp, a.worked_at_xbp_details, a.father_name, a.father_address,
            a.mother_name, a.mother_address, a.spouse_name, a.spouse_address,
            a.children_info, a.employment_history, a.character_references, a.numeric_score, a.alphanumeric_score, a.written_exam_score, a.interview_rating,
            
            COALESCE(rs.status_name, 'Unknown') AS recruitment_status_text,
            a.recruitment_status as recruitment_status_id
            
        FROM applicants a
        LEFT JOIN ref_statuses rs ON a.recruitment_status = rs.id
        WHERE a.is_archived = ? $extraWhere
    ";
    
    $params = [$is_archived];
    $types = 'i';

    if ($statusFilter !== 'all' && is_numeric($statusFilter)) {
        $sql .= " AND a.recruitment_status = ?";
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

    // --- VIEW LOGIC SETUP ---
    $is_archived = 0;
    $extraWhere = "";

    if ($view === 'archived') {
        $is_archived = 1;
    } 
    elseif ($view === 'deployed') {
        $is_archived = 0;
        $extraWhere = " AND recruitment_status = 13";
    } 
    else {
        // Active View
        $is_archived = 0;
        $extraWhere = " AND recruitment_status != 13";
    }

    $sql = "SELECT recruitment_status, COUNT(*) as count FROM applicants WHERE is_archived = ? $extraWhere";
    $params = [$is_archived];
    $types = 'i';

    if ($startDate && $endDate) {
        $sql .= " AND DATE(COALESCE(NULLIF(NULLIF(application_date, ''), '0000-00-00'), status_date)) BETWEEN ? AND ?";
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

    // Qualified Count
    $q_res = $conn->query("SELECT COUNT(*) as qcount FROM applicants WHERE screening_score >= 70 AND is_archived = 0");
    $counts['qualified_total'] = ($q_res) ? $q_res->fetch_assoc()['qcount'] : 0;

    $statusMap = [];
    $mapResult = $conn->query("SELECT id, status_name FROM ref_statuses");
    if ($mapResult) {
        while($m = $mapResult->fetch_assoc()) {
            $statusMap[$m['id']] = $m['status_name'];
        }
    }
    
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
    // 1. Initialize Default Arrays
    $data = [
        'recruiters' => [],
        'statuses' => [],
        'interviewers' => [],
        'projects' => [] 
    ];

    // 2. GET RECRUITERS
    $recSql = "SELECT DISTINCT FULLNAME FROM employee_listings WHERE DEPARTMENT = 'HUMAN RESOURCE' AND emp_status = 'ACTIVE' ORDER BY FULLNAME ASC";
    $recResult = $conn->query($recSql);
    
    if ($recResult) {
        while ($row = $recResult->fetch_assoc()) {
            $fullName = trim($row['FULLNAME']);
            if (!empty($fullName)) {
                $data['recruiters'][] = $fullName;
            }
        }
    }

    // 3. GET STATUSES
    $statusSql = "SELECT id, status_name FROM ref_statuses ORDER BY id ASC";
    $statusResult = $conn->query($statusSql);
    if ($statusResult) {
        while ($row = $statusResult->fetch_assoc()) {
            $data['statuses'][$row['id']] = $row['status_name'];
        }
    }

    // 4. GET INTERVIEWERS (Active Employees)
    $empSql = "SELECT EDS, FULLNAME FROM employee_listings WHERE emp_status = 'ACTIVE' AND PROJECT IN ('ADMIN','ADMIN, LHI') ORDER BY FULLNAME ASC";
    $empResult = $conn->query($empSql);
    
    if ($empResult) {
        while ($e = $empResult->fetch_assoc()) {
            $safeName = mb_convert_encoding($e['FULLNAME'], 'UTF-8', 'UTF-8');
            $data['interviewers'][] = [
                'id' => $e['EDS'],
                'label' => strtoupper($safeName) . ' - ' . $e['EDS']
            ];
        }
    }

    // 5. GET PROJECTS (Merged Source)
    $projects = [];
        
    // Source A: Employee Listings (Existing)
    $projSql = "SELECT DISTINCT PROJECT FROM employee_listings WHERE PROJECT IS NOT NULL AND PROJECT != ''";
    $projResult = $conn->query($projSql);
    if ($projResult) {
        while ($row = $projResult->fetch_assoc()) {
            $projects[] = strtoupper(trim($row['PROJECT']));
        }
    }

    // Source B: Ref Projects (New Custom Projects)
    $refSql = "SELECT project_name FROM ref_projects";
    $refResult = $conn->query($refSql);
    if ($refResult) {
        while ($row = $refResult->fetch_assoc()) {
            $projects[] = strtoupper(trim($row['project_name']));
        }
    }

    // Merge, Unique, and Sort
    $uniqueProjects = array_unique($projects);
    sort($uniqueProjects);
    $data['projects'] = array_values($uniqueProjects);

    // 6. OUTPUT JSON (Only Once!)
    $json = json_encode($data);
    if ($json === false) {
        echo json_encode([
            'recruiters' => [], 
            'statuses' => $data['statuses'], 
            'interviewers' => [],
            'projects' => [],
            'error' => 'JSON Encoding Error: ' . json_last_error_msg()
        ]);
    } else {
        echo $json;
    }
}

function updateApplicant($conn, $userIdentifier) {

    // 1. SECURITY: ROLE CHECK
    // Fetch role from DB again to be sure, or pass it from the main router
    $roleCheck = $conn->query("SELECT rt.role_name FROM user_roles ur JOIN roles_table rt ON ur.role_id = rt.role_id WHERE ur.employee_id = '$userIdentifier'");
    $userRole = 'user';
    if ($r = $roleCheck->fetch_assoc()) {
        $userRole = strtolower(str_replace(' ', '_', $r['role_name']));
    }

    // Define who is allowed to edit
    $allowedRoles = ['hr_manager', 'hr_staff', 'super_user', 'admin', 'interviewer']; 
    
    if (!in_array($userRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
        exit();
    }

    // 2. EXTRA SECURITY: Interviewers can only update specific fields
    if ($userRole === 'interviewer') {
        $data = json_decode(file_get_contents('php://input'), true);
        // If they try to change something strictly for HR (like "Salary" or "Offer Status"), block it.
        // For now, allow them, but logging (which you have) is a good fallback.
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $applicationId = $data['application_id'] ?? 0;
    
    if ($applicationId <= 0) { 
        http_response_code(400); 
        echo json_encode(['status' => 'error', 'message' => 'Invalid Application ID.']); 
        exit(); 
    }

    // --- 1. FETCH CURRENT DATA (BEFORE UPDATE) ---
    // We need this to compare "Old Value" vs "New Value"
    $sql = "SELECT * FROM applicants WHERE application_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $applicationId);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentData = $result->fetch_assoc();
    $stmt->close();

    if (!$currentData) {
        echo json_encode(['status' => 'error', 'message' => 'Applicant not found.']);
        exit();
    }
    
    $applicantName = strtoupper(($currentData['surname'] ?? '') . ", " . ($currentData['firstname'] ?? ''));

    // Custom Logic: Handle "Add New" Project
    if (isset($data['Project']) && $data['Project'] === 'Add New' && !empty($data['project_new'])) {
        $newProjectName = strtoupper(trim($data['project_new']));
        
        // 1. Insert into ref_projects (Ignore duplicates safely)
        $insertProj = $conn->prepare("INSERT IGNORE INTO ref_projects (project_name) VALUES (?)");
        if ($insertProj) {
            $insertProj->bind_param("s", $newProjectName);
            $insertProj->execute();
            $insertProj->close();
        }
        
        // 2. Set the value for the applicant update
        $data['Project'] = $newProjectName;
    }

    // Custom Logic: Handle "Other" Degree
    if (isset($data['college_degree']) && $data['college_degree'] === 'Other' && !empty($data['college_degree_other'])) {
        $data['college_degree'] = $data['college_degree_other'];
    }

    $setClauses = []; 
    $params = []; 
    $types = '';
    $changesLog = [];

    $allowedColumns = [ 
        'surname', 'firstname', 'middlename', 'birthday', 'age', 'gender', 'mobile_number', 'email', 
        'street_address', 'city', 'province', 'postcode', 'position_applied', 'recruiter_name', 
        'recruitment_status', 'status_date', 'application_source', 'interview_dates', 'interviewers', 
        'feedback_comments', 'offer_status', 'offer_date', 'joining_date', 'employee_id', 'Project',
        'facebook_account', 'instagram_account', 'twitter_account', 'viber_account', 
        'education_level', 'college_degree', 'experience_years', 'specific_skill', 'screening_score', 'screening_status' , 'requirements_checklist',
        'entity', 'hdmf_id', 'sss_no', 'philhealth_no', 'tin_no', 'talento_id', 'requisition_status',"requisition_id","initial_interviewer_id","final_interviewer_id",
        'application_date','numeric_score', 'alphanumeric_score', 'written_exam_score',
        'location', 'marital_status','father_name', 'father_address','mother_name', 'mother_address',
        'spouse_name', 'spouse_address','relatives_at_xbp', 'relatives_at_xbp_details','worked_at_xbp', 'worked_at_xbp_details',
        'children_info', 'employment_history', 'character_references', 'interview_rating'
    ];

    foreach ($data as $key => $value) { 
        if ($key === 'application_id') continue; 
        
        if(in_array($key, $allowedColumns)) { 
            $newValue = ($value === '') ? null : $value;
            $oldValue = $currentData[$key];

            // --- SMART COMPARISON START ---
            
            // Normalize values for comparison (treat null and empty string as same)
            $strNew = (string)$newValue;
            $strOld = (string)$oldValue;

            // SPECIAL DATE CHECK:
            // If the input is YYYY-MM-DD (10 chars) and the DB has YYYY-MM-DD HH:MM:SS
            // We check if the DB string STARTS with the Input string.
            // If yes, we consider them "Equal" and skip the update to preserve the original time.
            if (strlen($strNew) === 10 && strpos($strOld, $strNew) === 0 && ($key === 'application_date' || $key === 'status_date')) {
                continue; 
            }

            // Skip if values are identical
            if ($strNew === $strOld) {
                continue;
            }
            // --- SMART COMPARISON END ---

            // If we are here, the value has actually changed. Add to update list.
            $setClauses[] = "`{$key}` = ?"; 
            $params[] = $newValue; 
            $types .= (is_numeric($newValue) && $key === 'screening_score') ? 'i' : 's';

            // Log the specific change (Logic preserved from your previous file)
            if ($key === 'recruitment_status') {
                // Fetch dynamic names for logging
                $map = [];
                $res = $conn->query("SELECT id, status_name FROM ref_statuses WHERE id IN ('$oldValue', '$newValue')");
                while($r = $res->fetch_assoc()) $map[$r['id']] = $r['status_name'];
                
                $oldTxt = $map[$oldValue] ?? $oldValue;
                $newTxt = $map[$newValue] ?? $newValue;
                $changesLog[] = "Status: {$oldTxt} -> {$newTxt}";
            }
            elseif ($key !== 'feedback_comments' && $key !== 'status_date') {
                $label = str_replace('_', ' ', ucfirst($key));
                $dispOld = strlen($strOld) > 20 ? substr($strOld, 0, 20).'...' : ($strOld ?: 'Empty');
                $dispNew = strlen($strNew) > 20 ? substr($strNew, 0, 20).'...' : ($strNew ?: 'Empty');
                $changesLog[] = "{$label}: {$dispOld} -> {$dispNew}";
            }
        } 
    }
    
    // If nothing changed, return success immediately without touching the DB
    if (empty($setClauses)) { 
        echo json_encode(['status' => 'success', 'message' => 'No changes detected.']); 
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
        $logDesc = "Updated #{$applicationId} ({$applicantName}).";
        
        if (!empty($data['feedback_comments']) && trim($data['feedback_comments']) !== trim($currentData['feedback_comments'])) {
            $changesLog[] = "Added/Updated Feedback";
        }

        if (!empty($changesLog)) {
            $logDesc .= " Changes: " . implode(', ', $changesLog) . ".";
            logAction($conn, $userIdentifier, 'UPDATE', $logDesc);
        } else {
             // Fallback log if something updated but wasn't caught in the readable log loop
             logAction($conn, $userIdentifier, 'UPDATE', $logDesc . " Updated details.");
        }

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

    // --- 1. NEW: FETCH NAME FOR LOGGING ---
    $nameSql = "SELECT surname, firstname FROM applicants WHERE application_id = ?";
    $nameStmt = $conn->prepare($nameSql);
    $nameStmt->bind_param("i", $applicationId);
    $nameStmt->execute();
    $nameResult = $nameStmt->get_result();
    $applicantName = "Unknown";
    
    if ($row = $nameResult->fetch_assoc()) {
        $applicantName = strtoupper($row['surname'] . ", " . $row['firstname']);
    }
    $nameStmt->close();
    // ----------------------------------------

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 1 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        // --- 2. UPDATED LOG MESSAGE ---
        logAction($conn, $userIdentifier, 'ARCHIVE', "Archived applicant ID #{$applicationId} - {$applicantName}.");
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

    // --- 1. NEW: FETCH NAME FOR LOGGING ---
    $nameSql = "SELECT surname, firstname FROM applicants WHERE application_id = ?";
    $nameStmt = $conn->prepare($nameSql);
    $nameStmt->bind_param("i", $applicationId);
    $nameStmt->execute();
    $nameResult = $nameStmt->get_result();
    $applicantName = "Unknown";
    
    if ($row = $nameResult->fetch_assoc()) {
        $applicantName = strtoupper($row['surname'] . ", " . $row['firstname']);
    }
    $nameStmt->close();
    // ----------------------------------------

    $stmt = $conn->prepare("UPDATE applicants SET is_archived = 0 WHERE application_id = ?");
    $stmt->bind_param('i', $applicationId);

    if ($stmt->execute()) {
        // --- 2. UPDATED LOG MESSAGE ---
        logAction($conn, $userIdentifier, 'RESTORE', "Restored applicant ID #{$applicationId} - {$applicantName}.");
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

    // 1. ADD 'application_date' TO THIS LIST
    $columns = [
        "surname", "firstname", "middlename", "birthday", "age", "gender", "mobile_number", "email",
        "street_address", "city", "province", "postcode", "position_applied", "recruiter_name",
        "recruitment_status", "status_date", "application_date", "application_source", "interview_dates", "interviewers", // Added application_date
        "feedback_comments", "offer_status", "offer_date", "joining_date", "employee_id", "Project",
        "facebook_account", "instagram_account", "twitter_account", "viber_account",
        "education_level", "college_degree", "experience_years", "specific_skill", "screening_score", "screening_status",
        "entity", "hdmf_id", "sss_no", "philhealth_no", "tin_no", "talento_id", "requisition_status",
        "requisition_id", "initial_interviewer_id", "final_interviewer_id",
        "numeric_score", "alphanumeric_score", "written_exam_score",
        "location", "marital_status", 
        "father_name", "father_address", 
        "mother_name", "mother_address", 
        "spouse_name", "spouse_address",
        "relatives_at_xbp", "relatives_at_xbp_details",
        "worked_at_xbp", "worked_at_xbp_details", 
        "children_info", "employment_history", "character_references"
    ];
    
    $placeholders = rtrim(str_repeat('?,', count($columns)), ',');
    $sql = "INSERT INTO applicants (" . implode(', ', array_map(function($c) { return "`$c`"; }, $columns)) . ") VALUES ({$placeholders})";
    
    $stmt = $conn->prepare($sql);
    $types = str_repeat('s', count($columns));
    
    $conn->begin_transaction();
    try {
        $insertedCount = 0;
        foreach ($data as $row) {
            
            // --- DATA SANITIZATION ---
            if (!empty($row['Project'])) $row['Project'] = strtoupper(trim($row['Project']));
            
            // Validate IDs
            if (empty($row['initial_interviewer_id'])) $row['initial_interviewer_id'] = null;
            if (empty($row['final_interviewer_id'])) $row['final_interviewer_id'] = null;
            if (empty($row['employee_id'])) $row['employee_id'] = null;

            $params = [];
            foreach ($columns as $col) {
                // 2. CRITICAL FIX: Convert empty strings to NULL
                // This prevents '0000-00-00' or empty text in Date fields
                $val = $row[$col] ?? null;
                if ($val === '') $val = null; 
                
                $params[] = $val;
            }
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $insertedCount++;
        }
        $conn->commit();
        
        logAction($conn, $userIdentifier, 'BULK_UPLOAD', "Successfully uploaded {$insertedCount} applicants via CSV Template.");
        
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

function getRequisitions($conn) {
    // 1. Enable error reporting locally for debugging this specific function
    ini_set('display_errors', 0); // Keep off for HTTP protocol safety
    
    $data = [];

    try {
        // 2. The Complex Query (Calculates counts)
        $sql = "
            SELECT 
                r.id, 
                r.requisition_id, 
                r.project_name, 
                r.headcount_approved, 
                r.date_approved, 
                r.status,
                
                -- Subquery 1: Joined Count (Deployed)
                (SELECT COUNT(*) FROM applicants a WHERE a.requisition_id = r.requisition_id AND a.recruitment_status = 13) as joined_count,
                
                -- Subquery 2: NEW 'OFFERED' COUNT (Accepted + Job Offer Status + Date exists)
                (SELECT COUNT(*) FROM applicants a 
                 WHERE a.requisition_id = r.requisition_id 
                 AND a.recruitment_status = 8 
                 AND a.offer_status = 'Accepted' 
                 AND a.offer_date IS NOT NULL 
                 AND a.offer_date != '0000-00-00') as accepted_offer_count,
                
                -- Calculation: Aging
                DATEDIFF(NOW(), r.date_approved) as aging_days

            FROM requisition_form r
            ORDER BY r.created_at DESC
        ";

        // 3. Execute Query
        $result = $conn->query($sql);

        // 4. Check for Failure (If Exception wasn't thrown but query failed)
        if (!$result) {
            throw new Exception($conn->error);
        }

        // 5. Process Data
        while ($row = $result->fetch_assoc()) {
            $approved = intval($row['headcount_approved']);
            $joined = intval($row['joined_count']);
            $offered = intval($row['accepted_offer_count']); // New Variable
            
            // Usually Balance = Approved - Joined. If you want to subtract offers too, change this line:
            $row['balance'] = $approved - ( $joined + $offered); 
            
            $data[] = $row;
        }
        
        // 6. Return JSON
        echo json_encode($data);

    } catch (Exception $e) {
        // 7. CATCH THE CRASH
        // This ensures you see the error instead of 'Empty Response'
        http_response_code(500); // Optional: Signal server error
        echo json_encode(['error' => 'SQL CRASH: ' . $e->getMessage()]);
    }
}

function addRequisition($conn, $userIdentifier) {
    // 1. Get Input Data
    $data = json_decode(file_get_contents('php://input'), true);
    
    $reqId = $data['requisition_id'] ?? '';
    $project = $data['project_name'] ?? '';
    $headcount = intval($data['headcount_approved'] ?? 0);
    $dateApproved = $data['date_approved'] ?? date('Y-m-d');

    // 2. Validate Input
    if (empty($reqId) || empty($project)) {
        echo json_encode(['status' => 'error', 'message' => 'Requisition ID and Project Name are required.']);
        exit();
    }

    // 3. Check for Duplicates
    $check = $conn->query("SELECT id FROM requisition_form WHERE requisition_id = '$reqId'");
    if ($check && $check->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Requisition ID already exists.']);
        exit();
    }

    // 4. Prepare Insert (WITH ERROR CHECKING)
    $stmt = $conn->prepare("INSERT INTO requisition_form (requisition_id, project_name, headcount_approved, date_approved) VALUES (?, ?, ?, ?)");
    
    // --- THIS IS THE FIX ---
    if ($stmt === false) {
        // This will tell you exactly why it failed (e.g., "Table doesn't exist")
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $conn->error]);
        exit();
    }
    // -----------------------

    $stmt->bind_param("ssis", $reqId, $project, $headcount, $dateApproved);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'ADD_REQ', "Added Requisition $reqId for $project");
        echo json_encode(['status' => 'success', 'message' => 'Requisition added successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Execute error: ' . $stmt->error]);
    }
    $stmt->close();
}

function updateRequisition($conn, $userIdentifier) {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'] ?? 0; // The Database Primary Key (Hidden ID)
    $reqId = $data['requisition_id'] ?? '';
    $project = $data['project_name'] ?? '';
    $headcount = intval($data['headcount_approved'] ?? 0);
    $dateApproved = $data['date_approved'] ?? date('Y-m-d');
    $status = $data['status'] ?? 'Open';

    if ($id <= 0 || empty($reqId)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid ID or Requisition ID.']);
        exit();
    }

    // Update Query
    // Note: We update requisition_id too, but ensure your DB has ON UPDATE CASCADE if you want applicants to update automatically.
    $stmt = $conn->prepare("UPDATE requisition_form SET requisition_id=?, project_name=?, headcount_approved=?, date_approved=?, status=? WHERE id=?");

    if ($stmt === false) {
        echo json_encode(['status' => 'error', 'message' => 'DB Error: ' . $conn->error]);
        exit();
    }

    $stmt->bind_param("ssissi", $reqId, $project, $headcount, $dateApproved, $status, $id);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'UPDATE_REQ', "Updated Requisition #$reqId");
        echo json_encode(['status' => 'success', 'message' => 'Requisition updated successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Update failed: ' . $stmt->error]);
    }
    $stmt->close();
}


function getNotifications($conn, $userIdentifier, $roleName, $roleId) {
    ini_set('display_errors', 0); 

    // 1. ROBUST PERMISSION CHECK
    // A. Clean the name
    $cleanName = str_replace(' ', '_', strtolower(trim($roleName)));
    
    // B. Allowed IDs (12=HR Staff, 13=HR Manager, etc)
    $allowedIds = [1, 2, 3, 5, 6, 8, 9, 12, 13];

    // C. Allowed Names
    $allowedNames = [
        'super_user', 'manager', 'admin', 'administrator',
        'lhi_admin', 'lhi_manager', 
        'bps_admin', 'bps_manager', 
        'hr_staff', 'hr_manager'
    ];

    // D. HR/Admin Check
    $isHrOrAdmin = in_array((int)$roleId, $allowedIds) || in_array($cleanName, $allowedNames);

    // 2. QUERY BUILDING
    $employeeTable = 'employee_listings'; 
    $sql = "
        SELECT 
            a.application_id, a.surname, a.firstname, a.mobile_number, a.email,
            a.education_level, a.screening_score, a.screening_status, a.college_degree,
            a.position_applied, a.recruitment_status, a.interview_dates, a.feedback_comments,
            a.initial_interviewer_id, a.final_interviewer_id, a.resume_path, a.experience_years, a.specific_skill,
            
            e1.FULLNAME as initial_interviewer_name,
            e2.FULLNAME as final_interviewer_name

        FROM applicants a
        LEFT JOIN $employeeTable e1 ON a.initial_interviewer_id = e1.EDS
        LEFT JOIN $employeeTable e2 ON a.final_interviewer_id = e2.EDS
        
        WHERE a.is_archived = 0 
        AND a.recruitment_status IN (3, 5) 
        AND a.interview_dates IS NOT NULL
    ";

    // 3. APPLY FILTER (Only if NOT HR)
    $params = [];
    $types = "";

    if ($isHrOrAdmin) {
        // --- HR MODE: See Everything ---
        // (No WHERE clause added)
    } else {
        // --- INTERVIEWER MODE: FUZZY SEARCH FIX ---
        // This ensures that user ID "2373" matches "ALUAGUE - 2373"
        $sql .= " AND (
            (a.recruitment_status = 3 AND a.initial_interviewer_id LIKE CONCAT('%', ?, '%')) 
            OR 
            (a.recruitment_status = 5 AND a.final_interviewer_id LIKE CONCAT('%', ?, '%'))
        ) ";
        $params[] = $userIdentifier; 
        $params[] = $userIdentifier;
        $types = "ss";
    }

    $sql .= " ORDER BY a.interview_dates ASC";

    // 4. EXECUTE
    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        if(!$stmt) { echo json_encode(['error' => 'SQL Error: ' . $conn->error]); exit(); }
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
    } else {
        $result = $conn->query($sql);
        if(!$result) { echo json_encode(['error' => 'SQL Error: ' . $conn->error]); exit(); }
    }

    // 5. PROCESS
    $data = [];
    $now = new DateTime();

    while ($row = $result->fetch_assoc()) {
        try { $interviewDate = new DateTime($row['interview_dates']); } 
        catch (Exception $e) { $interviewDate = $now; }
        
        $row['time_status'] = ($interviewDate < $now) ? 'Due' : 'Upcoming';
        $row['interview_type'] = ($row['recruitment_status'] == 3) ? 'Initial Interview' : 'Final Interview';
        
        // Name Logic
        if ($row['recruitment_status'] == 3) {
             $row['interviewer_name'] = $row['initial_interviewer_name'] ?? 'Unassigned';
             $row['interviewer_id'] = $row['initial_interviewer_id'];
        } else {
             $row['interviewer_name'] = $row['final_interviewer_name'] ?? 'Unassigned';
             $row['interviewer_id'] = $row['final_interviewer_id'];
        }

        $data[] = $row;
    }

    echo json_encode($data);
}

function uploadResume($conn, $userIdentifier) {
    if (!isset($_FILES['resume']) || !isset($_POST['application_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'No file or ID provided.']);
        exit();
    }

    $appId = intval($_POST['application_id']);
    $file = $_FILES['resume'];
    
    // Validation
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $realMimeType = $finfo->file($file['tmp_name']);

    $allowedMimes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'image/jpeg', 
        'image/png'
    ];

    if (!in_array($realMimeType, $allowedMimes)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid file content. Real type: ' . $realMimeType]);
        exit();
    }

    if ($file['size'] > 5 * 1024 * 1024) { // 5MB Limit
        echo json_encode(['status' => 'error', 'message' => 'File too large. Max 5MB.']);
        exit();
    }

    // Generate Filename: resume_101_timestamp.pdf
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = "resume_{$appId}_" . time() . "." . $ext;
    $targetPath = "uploads/resumes/" . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Update DB
        $stmt = $conn->prepare("UPDATE applicants SET resume_path = ? WHERE application_id = ?");
        $stmt->bind_param("si", $targetPath, $appId);
        
        if ($stmt->execute()) {
            logAction($conn, $userIdentifier, 'UPLOAD_RESUME', "Uploaded resume for ID $appId");
            echo json_encode(['status' => 'success', 'message' => 'Resume uploaded!', 'path' => $targetPath]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database update failed.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'File upload failed. Check folder permissions.']);
    }
}

function saveResumeLink($conn, $userIdentifier) {
    $data = json_decode(file_get_contents('php://input'), true);
    $appId = intval($data['application_id'] ?? 0);
    $link = trim($data['resume_link'] ?? '');

    if ($appId <= 0 || empty($link)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid ID or Link.']);
        exit();
    }

    // Basic URL validation
    if (!filter_var($link, FILTER_VALIDATE_URL)) {
        echo json_encode(['status' => 'error', 'message' => 'Please enter a valid URL (starting with http:// or https://).']);
        exit();
    }

    $stmt = $conn->prepare("UPDATE applicants SET resume_path = ? WHERE application_id = ?");
    $stmt->bind_param("si", $link, $appId);

    if ($stmt->execute()) {
        logAction($conn, $userIdentifier, 'UPDATE_RESUME_LINK', "Updated resume link for ID $appId");
        echo json_encode(['status' => 'success', 'message' => 'Link saved successfully!', 'path' => $link]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database update failed.']);
    }
    $stmt->close();
}

function checkEmployeeId($conn) {
    $id = $_GET['id'] ?? '';
    if (!$id) { echo json_encode(['exists' => false]); exit(); }

    // Check in employee_listings (The main employee database)
    $stmt = $conn->prepare("SELECT FULLNAME FROM employee_listings WHERE EDS = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['exists' => true, 'name' => $row['FULLNAME']]);
    } else {
        echo json_encode(['exists' => false]);
    }
    $stmt->close();
}

function getExamCategories($conn) {
    $sql = "SELECT id, category_name, passing_score, time_limit_minutes FROM exam_categories";
    $result = $conn->query($sql);
    
    $categories = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
    }
    
    echo json_encode($categories);
}

function getApplicantExam($conn) {
    $category_id = $_GET['category_id'] ?? 1;
    
    // ORDER BY RAND() ensures questions are shuffled at the database level!
    $sql = "SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option 
            FROM exam_questions 
            WHERE category_id = ? AND is_active = 1 
            ORDER BY RAND() LIMIT 20";
            
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("i", $category_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $questions = [];
        while ($row = $result->fetch_assoc()) {
            $questions[] = $row;
        }
        
        echo json_encode($questions);
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare exam query.']);
    }
}

function saveExamQuestion($conn, $userIdentifier) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $qId = intval($data['question_id'] ?? 0); // Check if we are updating
    $categoryId = intval($data['category_id'] ?? 0);
    $qText = $data['question_text'] ?? '';
    $optA = $data['option_a'] ?? '';
    $optB = $data['option_b'] ?? '';
    $optC = $data['option_c'] ?? '';
    $optD = $data['option_d'] ?? '';
    $correct = $data['correct_option'] ?? 'A';

    if ($categoryId <= 0 || empty($qText)) {
        echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
        exit();
    }

    if ($qId > 0) {
        // UPDATE EXISTING QUESTION
        $sql = "UPDATE exam_questions SET category_id=?, question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=? WHERE id=?";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("issssssi", $categoryId, $qText, $optA, $optB, $optC, $optD, $correct, $qId);
            if ($stmt->execute()) {
                logAction($conn, $userIdentifier, 'UPDATE_EXAM_Q', "Updated exam question ID {$qId}.");
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database execution failed.']);
            }
            $stmt->close();
        }
    } else {
        // INSERT NEW QUESTION
        $sql = "INSERT INTO exam_questions (category_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("issssss", $categoryId, $qText, $optA, $optB, $optC, $optD, $correct);
            if ($stmt->execute()) {
                logAction($conn, $userIdentifier, 'ADD_EXAM_Q', "Added new exam question for category ID {$categoryId}.");
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Database execution failed.']);
            }
            $stmt->close();
        }
    }
}

function deleteExamQuestion($conn, $userIdentifier) {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = intval($data['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Question ID.']);
        exit();
    }

    // Permanently delete the question from the bank
    $sql = "DELETE FROM exam_questions WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            logAction($conn, $userIdentifier, 'DEL_EXAM_Q', "Deleted exam question ID: {$id}");
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete question.']);
        }
        $stmt->close();
    }
}

function addExamCategory($conn, $userIdentifier) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $catName = strtoupper(trim($data['category_name'] ?? ''));
    $passing = intval($data['passing_score'] ?? 70);
    $timeLimit = intval($data['time_limit_minutes'] ?? 10);

    if (empty($catName)) {
        echo json_encode(['status' => 'error', 'message' => 'Category name is required.']);
        exit();
    }

    $sql = "INSERT INTO exam_categories (category_name, passing_score, time_limit_minutes) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("sii", $catName, $passing, $timeLimit);
        if ($stmt->execute()) {
            logAction($conn, $userIdentifier, 'ADD_EXAM_CAT', "Created new exam role: {$catName}");
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to add category.']);
        }
        $stmt->close();
    }
}

function deleteExamCategory($conn, $userIdentifier) {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = intval($data['id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid ID.']);
        exit();
    }

    $sql = "DELETE FROM exam_categories WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            logAction($conn, $userIdentifier, 'DEL_EXAM_CAT', "Deleted exam category ID: {$id}");
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to delete category.']);
        }
        $stmt->close();
    }
}

function getExamHistory($conn) {
    $appId = intval($_GET['application_id'] ?? 0);
    $stmt = $conn->prepare("SELECT exam_data FROM applicant_exam_results WHERE application_id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $appId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            echo $row['exam_data']; // Already JSON string
        } else {
            echo json_encode(['error' => 'No exam history found.']);
        }
        $stmt->close();
    }
}

