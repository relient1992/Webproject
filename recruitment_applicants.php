<?php
// --- HEADERS & CORS ---
// These are the headers you provided, allowing cross-origin requests.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
header('Content-Type: application/json');


// --- DATABASE CONNECTION ---
// Using the credentials you provided.
$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";

// Create connection
$conn = new mysqli($servername, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- DATA PROCESSING ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit();
}

try {
    // 1. Retrieve all data from the form submission, including new fields.
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
    
    // NEW: Retrieve Social Media and Education fields. Use null for empty optional fields.
    $facebook_account = !empty($_POST['facebook_account']) ? $_POST['facebook_account'] : null;
    $instagram_account = !empty($_POST['instagram_account']) ? $_POST['instagram_account'] : null;
    $twitter_account = !empty($_POST['twitter_account']) ? $_POST['twitter_account'] : null;
    $viber_account = !empty($_POST['viber_account']) ? $_POST['viber_account'] : null;
    $education_level = $_POST['education_level'] ?? '';
    $college_degree = !empty($_POST['college_degree']) ? $_POST['college_degree'] : null;

    // 2. Combine the birthday fields into a single YYYY-MM-DD format.
    $birthYear = $_POST['birthYear'] ?? 0;
    $birthMonth = str_pad($_POST['birthMonth'] ?? 0, 2, '0', STR_PAD_LEFT);
    $birthDay = str_pad($_POST['birthDay'] ?? 0, 2, '0', STR_PAD_LEFT);
    $birthday = "{$birthYear}-{$birthMonth}-{$birthDay}";

    // 3. UPDATED: Prepare the SQL INSERT statement with all new columns.
    $stmt = $conn->prepare(
        "INSERT INTO applicants (
            surname, firstname, middlename, birthday, gender, mobile_number, email, 
            street_address, city, province, postcode, position_applied, application_source,
            facebook_account, instagram_account, twitter_account, viber_account,
            education_level, college_degree
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    // 4. UPDATED: Bind all 19 variables to the prepared statement.
    $stmt->bind_param(
        "sssssssssssssssssss", // 19 's' for 19 string variables
        $surname, $firstname, $middlename, $birthday, $gender, $mobile_number, $email, 
        $street_address, $city, $province, $postcode, $position_applied, $application_source,
        $facebook_account, $instagram_account, $twitter_account, $viber_account,
        $education_level, $college_degree
    );

    // 5. Execute the statement and check for success.
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Application submitted successfully!']);
    } else {
        throw new Exception($stmt->error);
    }

    $stmt->close();

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while submitting the application: ' . $e->getMessage()]);
}

$conn->close();

?>