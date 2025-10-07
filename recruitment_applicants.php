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
    // Send a detailed error response and stop the script.
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- DATA PROCESSING ---

// Check if the form was submitted using the POST method.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit();
}

try {
    // 1. Retrieve all the data from the form submission.
    $surname = $_POST['surname'] ?? '';
    $firstname = $_POST['firstname'] ?? '';
    $middlename = $_POST['middlename'] ?? null; // Allow null for optional field
    $gender = $_POST['gender'] ?? '';
    $mobile_number = $_POST['mobile'] ?? '';
    $email = $_POST['email'] ?? '';
    $street_address = $_POST['street'] ?? '';
    $city = $_POST['city'] ?? '';
    $province = $_POST['province'] ?? '';
    $postcode = $_POST['zipcode'] ?? '';
    $position_applied = $_POST['position_applied'] ?? '';
    $application_source = $_POST['application_source'] ?? '';
    
    // 2. Combine the birthday fields into a single YYYY-MM-DD format.
    $birthYear = $_POST['birthYear'] ?? 0;
    $birthMonth = str_pad($_POST['birthMonth'] ?? 0, 2, '0', STR_PAD_LEFT); // Pad with leading zero
    $birthDay = str_pad($_POST['birthDay'] ?? 0, 2, '0', STR_PAD_LEFT); // Pad with leading zero
    $birthday = "{$birthYear}-{$birthMonth}-{$birthDay}";

    // 3. Prepare the SQL INSERT statement to prevent SQL injection.
    // The columns listed here MUST match your 'applicants' table structure.
    $stmt = $conn->prepare(
        "INSERT INTO applicants (
            surname, firstname, middlename, birthday, gender, mobile_number, email, 
            street_address, city, province, postcode, position_applied, application_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    // 4. Bind the variables to the prepared statement.
    // The 's' characters represent the data type (s = string).
    $stmt->bind_param(
        "sssssssssssss",
        $surname,
        $firstname,
        $middlename,
        $birthday,
        $gender,
        $mobile_number,
        $email,
        $street_address,
        $city,
        $province,
        $postcode,
        $position_applied,
        $application_source
    );

    // 5. Execute the statement and check for success.
    if ($stmt->execute()) {
        // If successful, send a success response.
        echo json_encode(['status' => 'success', 'message' => 'Application submitted successfully!']);
    } else {
        // If it fails, throw an exception with the error.
        throw new Exception($stmt->error);
    }

    // Close the statement
    $stmt->close();

} catch (Exception $e) {
    // If any error occurs during the process, send a generic error response.
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while submitting the application: ' . $e->getMessage()]);
}

// Close the database connection
$conn->close();

?>
