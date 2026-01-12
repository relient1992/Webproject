document.addEventListener('DOMContentLoaded', function () {
    const API_URL = '../hr_dashboard_api.php';

    // DOM Elements
    const getEl = (id) => document.getElementById(id);
    const downloadTemplateBtn = getEl('downloadTemplateBtn');
    const bulkUploadBtn = getEl('bulkUploadBtn');
    const bulkUploadModal = getEl('bulkUploadModal');
    
    // --- FIX: UPDATED ID TO MATCH YOUR HTML ---
    const cancelUploadBtn = getEl('cancelBulkBtn'); 
    
    const processUploadBtn = getEl('processUploadBtn');
    // Ensure we grab the correct input ID (check your HTML ID, usually 'csvFile' or 'bulkFileInput')
    const csvFileInput = getEl('bulkFileInput') || getEl('csvFile'); 
    
    // Feedback Element Logic
    let uploadFeedback = getEl('uploadFeedback');
    if (!uploadFeedback && bulkUploadModal) {
        uploadFeedback = document.createElement('div');
        uploadFeedback.id = 'uploadFeedback';
        uploadFeedback.className = 'mt-4 text-sm text-center hidden';
        const btnContainer = bulkUploadModal.querySelector('.flex.justify-end');
        if(btnContainer) btnContainer.before(uploadFeedback);
    }

    // --- HEADERS CONFIGURATION ---
    const templateHeaders = [
        "surname", "firstname", "middlename", "birthday", "gender", "mobile_number", "email",
        "street_address", "city", "province", "postcode", 
        "position_applied", "experience_years", "specific_skill",
        "recruiter_name", "recruitment_status", "status_date", "application_source", 
        "screening_score", "screening_status",
        "interview_dates", "interviewers", "feedback_comments", 
        "offer_status", "offer_date", "joining_date", "employee_id", "Project",
        "facebook_account", "instagram_account", "twitter_account", "viber_account",
        "education_level", "college_degree"
    ];

    const sampleRow = {
        surname: "Doe", firstname: "John", middlename: "M", birthday: "1995-01-15", gender: "Male",
        mobile_number: "09171234567", email: "john.doe@example.com", 
        street_address: "123 Maple St", city: "Makati", province: "Metro Manila", postcode: "1227", 
        position_applied: "Call Center Agent", experience_years: "2", specific_skill: "Technical Support",
        recruiter_name: "Smith, Jane", recruitment_status: "1", status_date: new Date().toISOString().slice(0, 10), 
        application_source: "Job Portal", screening_score: "85", screening_status: "Qualified",
        interview_dates: "", interviewers: "", feedback_comments: "",
        offer_status: "", offer_date: "", joining_date: "", employee_id: "", Project: "",
        facebook_account: "", instagram_account: "", twitter_account: "", viber_account: "",
        education_level: "College Graduate", college_degree: "Bachelor of Science in Information Technology"
    };

    // --- HELPER: Fix Date Format (MM/DD/YYYY -> YYYY-MM-DD) ---
    function sanitizeData(data) {
        return data.map(row => {
            // List of columns that might contain dates
            const dateColumns = ['birthday', 'status_date', 'offer_date', 'joining_date'];
            
            dateColumns.forEach(col => {
                if (row[col]) {
                    // Check if date is like 1/15/1995 or 01/15/1995
                    const dateParts = row[col].match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
                    if (dateParts) {
                        // Convert to YYYY-MM-DD
                        row[col] = `${dateParts[3]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                    }
                }
            });
            return row;
        });
    }

    function downloadTemplate() {
        const sampleValues = templateHeaders.map(header => sampleRow[header]);
        const csvRows = [
            templateHeaders.join(','),
            sampleValues.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "applicant_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            processUploadBtn.disabled = true;
            uploadFeedback.classList.add('hidden');
            return;
        }

        uploadFeedback.classList.remove('hidden');
        uploadFeedback.textContent = 'Verifying file structure...';
        uploadFeedback.className = 'mt-4 text-sm text-blue-600 text-center font-medium';

        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy', // Removes completely empty lines
            complete: (results) => {
                const uploadedHeaders = results.meta.fields || [];
                const missingHeaders = templateHeaders.filter(h => !uploadedHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    uploadFeedback.innerHTML = `<strong>Error:</strong> Missing columns:<br>${missingHeaders.join(', ')}`;
                    uploadFeedback.className = 'mt-4 text-sm text-red-600 text-center font-semibold';
                    processUploadBtn.disabled = true;
                } else if (results.data.length === 0) {
                    uploadFeedback.textContent = "Error: File appears to be empty.";
                    uploadFeedback.className = 'mt-4 text-sm text-red-600 text-center font-semibold';
                    processUploadBtn.disabled = true;
                } else {
                    // Sanitize Data (Fix Dates)
                    const cleanedData = sanitizeData(results.data);
                    
                    uploadFeedback.textContent = `Success! Ready to upload ${cleanedData.length} records.`;
                    uploadFeedback.className = 'mt-4 text-sm text-green-600 text-center font-semibold';
                    processUploadBtn.disabled = false;
                    processUploadBtn.dataset.payload = JSON.stringify(cleanedData);
                }
            },
            error: (error) => {
                uploadFeedback.textContent = `Error parsing CSV: ${error.message}`;
                uploadFeedback.className = 'mt-4 text-sm text-red-600 text-center';
                processUploadBtn.disabled = true;
            }
        });
    }

    async function processUpload() {
        const payload = processUploadBtn.dataset.payload;
        if (!payload) { 
            Swal.fire({ icon: 'warning', title: 'No Data', text: 'Please select a valid CSV file first.' });
            return; 
        }

        Swal.fire({
            title: 'Uploading...',
            text: 'Importing records into the database.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await fetch(`${API_URL}?action=bulkInsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            
            // Check if response is actually JSON before parsing
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error("Server returned non-JSON response: " + text.substring(0, 100));
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Import Successful',
                    text: result.message,
                    timer: 2000,
                    showConfirmButton: false
                });

                bulkUploadModal.classList.add('hidden');
                csvFileInput.value = '';
                uploadFeedback.classList.add('hidden');
                
                if(window.dashboardGlobals && typeof window.dashboardGlobals.refreshAllData === 'function') {
                    window.dashboardGlobals.refreshAllData();
                } else {
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: error.message
            });
        } finally {
            processUploadBtn.disabled = false;
        }
    }

    // --- EVENT LISTENERS ---
    if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', downloadTemplate);
    
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', () => {
            if (csvFileInput) csvFileInput.value = ''; 
            if (uploadFeedback) uploadFeedback.classList.add('hidden');
            if (processUploadBtn) processUploadBtn.disabled = true;
            if (bulkUploadModal) bulkUploadModal.classList.remove('hidden');
        });
    }
    
    // --- FIXED CANCEL BUTTON ---
    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents accidental form submission
            if (bulkUploadModal) bulkUploadModal.classList.add('hidden');
        });
    }

    if (csvFileInput) csvFileInput.addEventListener('change', handleFileUpload);
    if (processUploadBtn) {
        processUploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents form submission refresh
            processUpload();
        });
    }
});