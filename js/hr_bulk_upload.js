document.addEventListener('DOMContentLoaded', function () {
    const API_URL = '../hr_dashboard_api.php';

    const getEl = (id) => document.getElementById(id);
    const downloadTemplateBtn = getEl('downloadTemplateBtn');
    const bulkUploadBtn = getEl('bulkUploadBtn');
    const bulkUploadModal = getEl('bulkUploadModal');
    const cancelUploadBtn = getEl('cancelUploadBtn');
    const processUploadBtn = getEl('processUploadBtn');
    const csvFileInput = getEl('csvFile');
    const uploadFeedback = getEl('uploadFeedback');

    const templateHeaders = [
        "surname", "firstname", "middlename", "birthday", "gender", "mobile_number", "email",
        "street_address", "city", "province", "postcode", "position_applied", "recruiter_name",
        "recruitment_status", "status_date", "application_source", "interview_dates", "interviewers",
        "feedback_comments", "offer_status", "offer_date", "joining_date", "employee_id", "Project",
        "facebook_account", "instagram_account", "twitter_account", "viber_account",
        "education_level", "college_degree"
    ];

    const sampleRow = {
        surname: "Doe", firstname: "John", middlename: "Michael", birthday: "1995-01-15", gender: "Male",
        mobile_number: "09171234567", email: "john.doe@example.com", street_address: "123 Maple St, Brgy. Central",
        city: "Makati", province: "Metro Manila", postcode: "1227", 
        position_applied: "Data Entry Operator", recruiter_name: "SALAZAR, ANA KARISA A.", 
        recruitment_status: "1", status_date: new Date().toISOString().slice(0, 10), application_source: "Job Portal",
        interview_dates: "2025-10-20", interviewers: "HR Team", feedback_comments: "Good initial screening.",
        offer_status: "", offer_date: "", joining_date: "", employee_id: "", Project: "Project Alpha",
        facebook_account: "https://facebook.com/johndoe", instagram_account: "@johndoe",
        twitter_account: "@johndoe", viber_account: "09171234567",
        education_level: "College Graduate", college_degree: "Bachelor of Science in Information Technology"
    };

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
        link.setAttribute("download", "full_applicant_template.csv");
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
        uploadFeedback.textContent = 'Verifying file...';
        uploadFeedback.className = 'text-sm text-blue-600';

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const uploadedHeaders = results.meta.fields;
                const missingHeaders = templateHeaders.filter(h => !uploadedHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    uploadFeedback.textContent = `Error: Missing columns: ${missingHeaders.join(', ')}.`;
                    uploadFeedback.className = 'text-sm text-red-600 font-semibold';
                    processUploadBtn.disabled = true;
                } else {
                    uploadFeedback.textContent = `File verified. Found ${results.data.length} records ready to upload.`;
                    uploadFeedback.className = 'text-sm text-green-600 font-semibold';
                    processUploadBtn.disabled = false;
                    processUploadBtn.dataset.payload = JSON.stringify(results.data);
                }
            },
            error: (error) => {
                uploadFeedback.textContent = `Error parsing CSV: ${error.message}`;
                uploadFeedback.className = 'text-sm text-red-600 font-semibold';
                processUploadBtn.disabled = true;
            }
        });
    }

    async function processUpload() {
        const payload = processUploadBtn.dataset.payload;
        if (!payload) { alert('No data to upload.'); return; }

        processUploadBtn.disabled = true;
        processUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

        try {
            const response = await fetch(`${API_URL}?action=bulkInsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message);
            }
            alert(`Bulk upload successful! ${result.message}`);
            bulkUploadModal.classList.add('hidden');
            if(typeof initializeDashboard === 'function') {
                initializeDashboard();
            } else {
                window.location.reload();
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            processUploadBtn.disabled = false;
            processUploadBtn.innerHTML = 'Upload & Process';
        }
    }

    if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', downloadTemplate);
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', () => {
            // CORRECTED: Added a check to ensure csvFileInput exists before using it.
            if (csvFileInput) {
                csvFileInput.value = ''; // Reset file input
            }
            if (uploadFeedback) uploadFeedback.classList.add('hidden');
            if (processUploadBtn) processUploadBtn.disabled = true;
            if (bulkUploadModal) bulkUploadModal.classList.remove('hidden');
        });
    }
    if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', () => bulkUploadModal.classList.add('hidden'));
    if (csvFileInput) csvFileInput.addEventListener('change', handleFileUpload);
    if (processUploadBtn) processUploadBtn.addEventListener('click', processUpload);
});

