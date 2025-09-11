<?php
session_start(); // Start the session at the very top

// Prevent browser caching
header("Cache-Control: no-cache, no-store, must-revalidate"); // HTTP 1.1
header("Pragma: no-cache"); // HTTP 1.0
header("Expires: 0"); // Proxies

// Check if user is logged in (session variable exists)
if (!isset($_SESSION['employee_id'])) {
    // Redirect to login page if not logged in.
    // IMPORTANT: Adjust the path to your login page if it's not 'index.html' in the main directory.
    header('Location: ../../index.html'); // Assuming login is two levels up from /views/
    exit();
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Training Material Builder (File Edition)</title>
    
    <link rel="stylesheet" href="../web_training.css">
    
    <!-- External Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</head>
<body>

    <!-- Main application interface, initially hidden -->
    <div id="app-container" class="hidden">
        <div class="main-container">
            <!-- Left Panel: Module Management -->
            <div class="panel" id="left-panel">
                <div class="header-bar">
                    <h1>Training Builder</h1>
                    <div id="project-status">No data loaded</div>
                </div>

                <div class="project-title-container">
                    <label for="project-title-input">Training Title</label>
                    <input type="text" id="project-title-input" placeholder="Enter Title for the Training">
                </div>
                
                <h2>Step 1: Add or Upload Modules</h2>
                <div class="button-group">
                    <button id="add-module-btn" class="button-primary">＋ Add New Module</button>
                    <label for="file-input" class="button-secondary">↑ Upload .docx</label>
                    <input type="file" id="file-input" class="hidden" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple>
                </div>

                <h2>Step 2: Arrange & Edit Modules</h2>
                <ol id="toc-list"></ol>
            </div>

            <!-- Right Panel: Content Editor -->
            <div class="panel" id="right-panel">
                <div id="editor-placeholder">
                    <p>Select a module on the left to edit its content, or add a new one.</p>
                </div>
                <div id="editor-container" class="hidden">
                    <h2>Edit Module Content</h2>
                    <label for="module-title-input">Module Title</label>
                    <input type="text" id="module-title-input" placeholder="Enter the title for this module">
                    
                    <label>Module Content</label>
                    <div class="editor-toolbar" id="wysiwyg-toolbar">
                        <button class="toolbar-btn" data-command="bold" title="Bold"><b>B</b></button>
                        <button class="toolbar-btn" data-command="italic" title="Italic"><i>I</i></button>
                        <button class="toolbar-btn" data-command="underline" title="Underline"><u>U</u></button>
                        <button class="toolbar-btn" data-command="insertUnorderedList" title="Bulleted List">●</button>
                        <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List">1.</button>
                        <button class="toolbar-btn" data-command="createLink" title="Create Link">🔗</button>
                        <button class="toolbar-btn" data-command="insertTable" title="Insert Table">▦</button>
                        <button class="toolbar-btn" data-command="insertImage" title="Insert Image">🖼️</button>
                        <input type="file" id="image-upload" accept="image/*" class="hidden">
                    </div>
                    <div id="module-content-editor" contenteditable="true"></div>

                    <div class="editor-actions">
                        <button id="save-module-btn" class="button-save">Apply Changes</button>
                        <button id="delete-module-btn" class="button-delete">Delete Module</button>
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            <button id="save-data-file-btn" class="button-save-main">Save Data to File</button>
            <button class="export-button" id="export-btn">Generate & Download Viewer Website</button>
        </footer>
    </div>

    <!-- Welcome screen, shown on startup -->
    <div id="welcome-screen">
        <div class="welcome-box">
            <h1>Training Material Builder</h1>
            <p>Load an existing project or start a new one.</p>
            <div class="button-group">
                <label for="load-data-input" class="button-primary">Load Data File (.json)</label>
                <input type="file" id="load-data-input" class="hidden" accept=".json">
                <button id="start-new-btn" class="button-secondary">Start New Project</button>
            </div>
        </div>
    </div>

    <!-- App Logic -->
    <script src="../js/web_training.js"></script>
</body>
</html>

