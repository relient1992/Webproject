<?php
// --- 1. FATAL ERROR HANDLER (Catches "Invisible" Crashes) ---
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR)) {
        // Clear any half-written HTML
        if (ob_get_length()) ob_clean(); 
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Fatal System Error: ' . $error['message'] . ' on line ' . $error['line']]);
        exit();
    }
});

// Start Output Buffering
ob_start();

// Disable HTML error printing (we handle it above)
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // --- DATABASE CONNECTION ---
    $servername = "10.200.168.89";
    $username   = "supersu";
    $password   = "H110mds2!";
    $database   = "database_rda";

    // $servername = "localhost";
    // $username = "root";
    // $password = "";
    // $database = "database_rda";


    $conn = new mysqli($servername, $username, $password, $database);
    if ($conn->connect_error) throw new Exception('Database connection failed: ' . $conn->connect_error);
    $conn->set_charset("utf8mb4");

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Invalid request method.');

    // --- 3. DATA PROCESSING (With Null Safety) ---
    // Helper function to ensure empty strings become NULL for optional fields
    function getPost($key) {
        $val = $_POST[$key] ?? '';
        return trim($val) === '' ? null : trim($val);
    }

    $surname = getPost('surname');
    $firstname = getPost('firstname');
    $middlename = getPost('middlename');
    $gender = getPost('gender');
    $age = getPost('age'); 
    $mobile_number = getPost('mobile');
    $entity = getPost('entity');
    $sss_no = getPost('sss_no');
    $tin_no = getPost('tin_no');
    $philhealth_no = getPost('philhealth_no');
    $hdmf_id = getPost('hdmf_id');
    $email = getPost('email');
    $street_address = getPost('street');
    $city = getPost('city');
    $province = getPost('province');
    $postcode = getPost('zipcode');
    $position_applied = getPost('position_applied');
    $application_source = getPost('application_source');
    
    // NEW FIELDS
    $location = getPost('location');
    $marital_status = getPost('marital_status');
    $relatives_xbp = getPost('relatives_at_xbp') ?? 'No';
    $relatives_details = getPost('relatives_at_xbp_details');
    $worked_xbp = getPost('worked_at_xbp') ?? 'No';
    $worked_details = getPost('worked_at_xbp_details');
    $father_name = getPost('father_name');
    $father_address = getPost('father_address');
    $mother_name = getPost('mother_name');
    $mother_address = getPost('mother_address');
    $spouse_name = getPost('spouse_name');
    $spouse_address = getPost('spouse_address');
    
    $facebook_account = getPost('facebook_account');
    $instagram_account = getPost('instagram_account');
    $twitter_account = getPost('twitter_account');
    $viber_account = getPost('viber_account');
    $education_level = getPost('education_level');
    $college_degree = getPost('college_degree');

    $experience_years = getPost('experience_years');
    $specific_skill = getPost('specific_skill');
    $screening_score = $_POST['screening_score'] ?? 0;
    $screening_status = $_POST['screening_status'] ?? 'Pending';

    // Birthday Logic: Ensure valid date or NULL
    $birthYear = $_POST['birthYear'] ?? 0;
    $birthMonth = $_POST['birthMonth'] ?? 0;
    $birthDay = $_POST['birthDay'] ?? 0;
    
    $birthday = null;
    if ($birthYear && $birthMonth && $birthDay) {
        $birthday = "$birthYear-" . str_pad($birthMonth, 2, '0', STR_PAD_LEFT) . "-" . str_pad($birthDay, 2, '0', STR_PAD_LEFT);
    }

    // JSON Arrays (Null Safety)
    $children_json = null;
    if (isset($_POST['child_name'])) {
        $children = [];
        foreach ($_POST['child_name'] as $i => $name) {
            if (!empty($name)) $children[] = ['name' => $name, 'address' => $_POST['child_address'][$i] ?? ''];
        }
        if(!empty($children)) $children_json = json_encode($children);
    }

    $employment_json = null;
    if (isset($_POST['emp_company'])) {
        $employment = [];
        foreach ($_POST['emp_company'] as $i => $comp) {
            if (!empty($comp)) {
                $employment[] = [
                    'company' => $comp,
                    'position' => $_POST['emp_position'][$i] ?? '',
                    'address' => $_POST['emp_address'][$i] ?? '',
                    'from' => $_POST['emp_from'][$i] ?? '',
                    'to' => $_POST['emp_to'][$i] ?? ''
                ];
            }
        }
        if(!empty($employment)) $employment_json = json_encode($employment);
    }

    $references_json = null;
    if (isset($_POST['ref_name'])) {
        $references = [];
        foreach ($_POST['ref_name'] as $i => $name) {
            if (!empty($name)) {
                $references[] = [
                    'name' => $name,
                    'contact' => $_POST['ref_contact'][$i] ?? '',
                    'company' => $_POST['ref_company'][$i] ?? '',
                    'address' => $_POST['ref_address'][$i] ?? ''
                ];
            }
        }
        if(!empty($references)) $references_json = json_encode($references);
    }

    // --- SQL INSERT ---
    $sql = "INSERT INTO applicants (
        surname, firstname, middlename, birthday, age, gender, mobile_number, email, 
        street_address, city, province, postcode, position_applied, application_source,
        facebook_account, instagram_account, twitter_account, viber_account,
        education_level, college_degree, 
        experience_years, specific_skill, screening_score, screening_status,
        entity, sss_no, tin_no, philhealth_no, hdmf_id, requisition_status,
        location, marital_status, relatives_at_xbp, relatives_at_xbp_details,
        worked_at_xbp, worked_at_xbp_details, father_name, father_address,
        mother_name, mother_address, spouse_name, spouse_address,
        children_info, employment_history, character_references
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', 
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Database Prepare Error: " . $conn->error);

    // BIND PARAMS: USE 's' FOR EVERYTHING
    // This prevents crashes when passing NULL to integer fields. MySQL handles the type conversion safely.
    $stmt->bind_param(
        str_repeat('s', 44), 
        $surname, $firstname, $middlename, $birthday, $age, $gender, $mobile_number, $email, 
        $street_address, $city, $province, $postcode, $position_applied, $application_source,
        $facebook_account, $instagram_account, $twitter_account, $viber_account,
        $education_level, $college_degree,
        $experience_years, $specific_skill, $screening_score, $screening_status,
        $entity, $sss_no, $tin_no, $philhealth_no, $hdmf_id,
        $location, $marital_status, $relatives_xbp, $relatives_details,
        $worked_xbp, $worked_details, $father_name, $father_address,
        $mother_name, $mother_address, $spouse_name, $spouse_address,
        $children_json, $employment_json, $references_json
    );

    if ($stmt->execute()) {
        ob_clean();
        echo json_encode(['status' => 'success', 'message' => 'Application submitted successfully!']);
    } else {
        throw new Exception("Execute Failed: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$conn->close();
?>