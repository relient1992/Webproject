<?php
//testing
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid request method.'
    ]);
    exit;
}

$servername = "10.200.168.89";
$username   = "supersu";
$password   = "H110mds2!";
$database   = "database_rda";
$charset = "utf8mb4";

// Database connection
// $servername = "localhost";
// $username = "root";
// $password = "";
// $database = "database_rda";
// $charset = "utf8mb4";

$dsn = "mysql:host=$servername;dbname=$database;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (\PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    exit;
}

// Determine what the user wants to do based on an 'action' parameter
$action = $_POST['action'] ?? '';

// --- ACTION: REGISTER ---
if ($action === 'register') {
    $emp_id = $_POST['employee_id'];
    $pass = $_POST['password'];
    $q1 = $_POST['question1'];
    $ans1 = password_hash(strtolower(trim($_POST['answer1'])), PASSWORD_DEFAULT);
    $q2 = $_POST['question2'];
    $ans2 = password_hash(strtolower(trim($_POST['answer2'])), PASSWORD_DEFAULT);

    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM user_accounts WHERE employee_id = ?");
    $stmt->execute([$emp_id]);
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Employee ID already used.']);
        exit;
    }

    try {
        $pdo->beginTransaction();
    
        // 1. Insert into main accounts table
        $insert = $pdo->prepare("INSERT INTO user_accounts (employee_id, password) VALUES (?, ?)");
        $insert->execute([$emp_id, password_hash($pass, PASSWORD_DEFAULT)]);
        
        // 2. GET THE INTERNAL ID (This is the 'user_id' for your security table)
        $internal_user_id = $pdo->lastInsertId();
    
        // 3. Insert into roles (using actual emp_id as per your existing logic)
        $insertRole = $pdo->prepare("INSERT INTO user_roles (employee_id, role_id) VALUES (?, ?)");
        $insertRole->execute([$emp_id, 4]);
    
        // 4. Insert into security questions (USING THE NEW user_id)
        $insQ = $pdo->prepare("INSERT INTO user_security_answers (user_id, question_text, answer_hash) VALUES (?, ?, ?)");
        $insQ->execute([$internal_user_id, $q1, $ans1]);
        $insQ->execute([$internal_user_id, $q2, $ans2]);
    
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Registration successful!']);
    
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// --- ACTION: FETCH QUESTIONS (FOR RESET) ---
elseif ($action === 'fetch_questions') {
    $emp_id = $_POST['employee_id'];

    $stmt = $pdo->prepare("SELECT q.question_text 
                           FROM user_security_answers q 
                           JOIN user_accounts u ON q.user_id = u.id 
                           WHERE u.employee_id = ?");
    $stmt->execute([$emp_id]);
    $questions = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($questions) === 2) {
        echo json_encode(['status' => 'success', 'q1' => $questions[0], 'q2' => $questions[1]]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'User not found or no questions set.']);
    }
}

// --- ACTION: RESET PASSWORD ---
elseif ($action === 'reset_password') {
    // 1. Validate inputs
    if (!isset($_POST['employee_id'], $_POST['ans1'], $_POST['ans2'], $_POST['new_password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing data.']);
        exit;
    }

    $emp_id = $_POST['employee_id'];
    $ans1 = strtolower(trim($_POST['ans1']));
    $ans2 = strtolower(trim($_POST['ans2']));
    $new_pass = password_hash($_POST['new_password'], PASSWORD_DEFAULT);

    try {
        // 2. Fetch the stored hashes using the JOIN we established
        $stmt = $pdo->prepare("SELECT q.answer_hash FROM user_security_answers q 
                               JOIN user_accounts u ON q.user_id = u.id 
                               WHERE u.employee_id = ? 
                               ORDER BY q.id ASC"); // Order ensures ans1 matches q1
        $stmt->execute([$emp_id]);
        $hashes = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // 3. Verify the answers
        if (count($hashes) === 2 && password_verify($ans1, $hashes[0]) && password_verify($ans2, $hashes[1])) {
            // Success! Update the password
            $update = $pdo->prepare("UPDATE user_accounts SET password = ? WHERE employee_id = ?");
            $update->execute([$new_pass, $emp_id]);
            echo json_encode(['status' => 'success', 'message' => 'Password updated!']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Incorrect security answers.']);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'DB Error: ' . $e->getMessage()]);
    }
    exit; // Ensure no other code runs after this
}
?>