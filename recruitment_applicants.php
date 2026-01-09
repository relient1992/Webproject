<?php
// --- HEADERS & CORS ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
header('Content-Type: application/json');

// --- DATABASE CONNECTION ---
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

$conn = new mysqli($servername, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- FIX FOR Ñ (Set encoding to UTF-8) ---
$conn->set_charset("utf8mb4");

// --- DATA PROCESSING ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit();
}

try {
    // 1. Retrieve standard fields
    $surname = $_POST['surname'] ?? '';
    $firstname = $_POST['firstname'] ?? '';
    $middlename = $_POST['middlename'] ?? null;
    $gender = $_POST['gender'] ?? '';
    $mobile_number = $_POST['mobile'] ?? '';
    $email = $_POST['email'] ?? '';
    $street_address = $_POST['street'] ?? '';
    $city = $_POST['city'] ?? '';
    $province = $_POST['province'] ?? '';
    $postcode = $_POST['zipcode'] ?? '';
    $position_applied = $_POST['position_applied'] ?? '';
    $application_source = $_POST['application_source'] ?? '';
    
    // Social Media and Education
    $facebook_account = !empty($_POST['facebook_account']) ? $_POST['facebook_account'] : null;
    $instagram_account = !empty($_POST['instagram_account']) ? $_POST['instagram_account'] : null;
    $twitter_account = !empty($_POST['twitter_account']) ? $_POST['twitter_account'] : null;
    $viber_account = !empty($_POST['viber_account']) ? $_POST['viber_account'] : null;
    $education_level = $_POST['education_level'] ?? '';
    $college_degree = !empty($_POST['college_degree']) ? $_POST['college_degree'] : null;

    // --- NEW: Retrieve Pre-screening Data ---
    $experience_years = $_POST['experience_years'] ?? '';
    $specific_skill = $_POST['specific_skill'] ?? null;
    $screening_score = $_POST['screening_score'] ?? 0;
    $screening_status = $_POST['screening_status'] ?? 'Pending';

    // 2. Birthday formatting
    $birthYear = $_POST['birthYear'] ?? 0;
    $birthMonth = str_pad($_POST['birthMonth'] ?? 0, 2, '0', STR_PAD_LEFT);
    $birthDay = str_pad($_POST['birthDay'] ?? 0, 2, '0', STR_PAD_LEFT);
    $birthday = "{$birthYear}-{$birthMonth}-{$birthDay}";

    // 3. UPDATED: SQL INSERT with 23 columns total
    $stmt = $conn->prepare(
        "INSERT INTO applicants (
            surname, firstname, middlename, birthday, gender, mobile_number, email, 
            street_address, city, province, postcode, position_applied, application_source,
            facebook_account, instagram_account, twitter_account, viber_account,
            education_level, college_degree, 
            experience_years, specific_skill, screening_score, screening_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    // 4. UPDATED: Bind 23 variables. 
    // Added 's' (string) for exp, skill, status and 'i' (integer) for score.
    $stmt->bind_param(
        "sssssssssssssssssssisis", 
        $surname, $firstname, $middlename, $birthday, $gender, $mobile_number, $email, 
        $street_address, $city, $province, $postcode, $position_applied, $application_source,
        $facebook_account, $instagram_account, $twitter_account, $viber_account,
        $education_level, $college_degree,
        $experience_years, $specific_skill, $screening_score, $screening_status
    );

    // 5. Execute
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Application submitted successfully!']);
    } else {
        throw new Exception($stmt->error);
    }

    $stmt->close();

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>