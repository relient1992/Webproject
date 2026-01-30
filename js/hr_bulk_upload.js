document.addEventListener('DOMContentLoaded', function () {
    const API_URL = '../hr_dashboard_api.php';

    // DOM Elements
    const getEl = (id) => document.getElementById(id);
    const downloadTemplateBtn = getEl('downloadTemplateBtn');
    const bulkUploadBtn = getEl('bulkUploadBtn');
    const bulkUploadModal = getEl('bulkUploadModal');
    const cancelUploadBtn = getEl('cancelBulkBtn'); 
    const processUploadBtn = getEl('processUploadBtn');
    const csvFileInput = getEl('bulkFileInput') || getEl('csvFile'); 
    let uploadFeedback = getEl('uploadFeedback');
    
    // Feedback Element Logic
    if (!uploadFeedback && bulkUploadModal) {
        uploadFeedback = document.createElement('div');
        uploadFeedback.id = 'uploadFeedback';
        uploadFeedback.className = 'mt-4 text-sm text-center hidden p-2 rounded';
        const btnContainer = bulkUploadModal.querySelector('.flex.justify-end');
        if(btnContainer) btnContainer.before(uploadFeedback);
    }

    // --- 1. HEADERS CONFIGURATION ---
    const templateHeaders = [
        "surname", "firstname", "middlename", "birthday", "age", "gender", 
        "mobile_number", "email",
        "street_address", "city", "province", "postcode", 
        "position_applied", "experience_years", "specific_skill",
        "recruiter_name", "recruitment_status", "status_date", "application_date", "application_source", 
        "screening_score", "screening_status",
        "interview_dates", "interviewers", "feedback_comments", 
        "initial_interviewer_id", "final_interviewer_id",
        "offer_status", "offer_date", "joining_date", "employee_id", "Project", "entity", 
        "hdmf_id", "sss_no", "philhealth_no", "tin_no", 
        "facebook_account", "instagram_account", "twitter_account", "viber_account",
        "education_level", "college_degree", "requisition_id",
        "location", "marital_status", 
        "father_name", "father_address", 
        "mother_name", "mother_address", 
        "spouse_name", "spouse_address",
        "relatives_at_xbp", "relatives_at_xbp_details", 
        "worked_at_xbp", "worked_at_xbp_details",
        "children_info", "employment_history", "character_references",
    ];

    // --- 2. SAMPLE ROW ---
    const sampleRow = {
        surname: "Doe", firstname: "John", middlename: "M", birthday: "1995-01-15", age: "29", gender: "Male",
        mobile_number: "09171234567", email: "john.doe@example.com", 
        street_address: "123 Maple St", city: "Makati", province: "Metro Manila", postcode: "1227", 
        position_applied: "Call Center Agent", experience_years: "2", specific_skill: "Technical Support",
        recruiter_name: "Smith, Jane", 
        recruitment_status: "1", 
        status_date: new Date().toISOString().slice(0, 10), 
        application_date: new Date().toISOString().slice(0, 10), 
        application_source: "Job Portal", 
        
        screening_score: "85", screening_status: "Qualified", 
        numeric_score: "90", alphanumeric_score: "A+", written_exam_score: "88",

        interview_dates: "", interviewers: "", feedback_comments: "",
        initial_interviewer_id: "", final_interviewer_id: "",    
        offer_status: "", offer_date: "", joining_date: "", employee_id: "", 
        Project: "CSR WAVE 1", entity: "Lexicode", 
        
        hdmf_id: "1234-5678-9012", sss_no: "00-1234567-8", philhealth_no: "12-123456789-1", tin_no: "123-456-789-000",
        
        location: "Subic", marital_status: "Married", 
        father_name: "Robert Doe", father_address: "Manila",
        mother_name: "Mary Doe", mother_address: "Manila",
        spouse_name: "Jane Doe", spouse_address: "Makati",
        relatives_at_xbp: "Yes", relatives_at_xbp_details: "Cousin in IT", 
        worked_at_xbp: "No", worked_at_xbp_details: "",

        // MULTI-ENTRY EXAMPLES (Use | to separate items)
        children_info: "Baby Doe, Makati | Junior Doe, Makati",
        employment_history: "Company A, Agent, 2020, 2021 | Company B, Lead, 2022, 2023",
        character_references: "Ref Name 1, 0917111, Manager | Ref Name 2, 0917222, Supervisor",

        facebook_account: "", instagram_account: "", twitter_account: "", viber_account: "",
        education_level: "College Graduate", college_degree: "Bachelor of Science in Information Technology",
        requisition_id: ""
    };
    
    // --- 3. SANITIZATION (Clean Data) ---
    function sanitizeData(data) {
        return data.map(row => {
            // Trim Strings safely
            Object.keys(row).forEach(key => {
                if (row[key] && typeof row[key] === 'string') {
                    row[key] = row[key].trim();
                }
            });

            // Auto-Uppercase Project
            if (row['Project']) row['Project'] = String(row['Project']).toUpperCase();

            // Fix Dates (MM/DD/YYYY -> YYYY-MM-DD)
            // Only process if the date actually exists and is not empty
            const dateColumns = ['birthday', 'status_date', 'application_date', 'offer_date', 'joining_date', 'interview_dates'];
            
            dateColumns.forEach(col => {
                if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
                    const valStr = String(row[col]);
                    // Check matches 1/15/1995 or 01/15/1995
                    const dateParts = valStr.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
                    if (dateParts) {
                        row[col] = `${dateParts[3]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                    }
                } else {
                    // Ensure empty dates are treated as null/empty string, not "undefined"
                    row[col] = '';
                }
            });

            return row;
        });
    }

    function transformComplexData(data) {
        return data.map(row => {
            
            // A. EMPLOYMENT HISTORY
            // Format: "Company, Position, From, To | Next Company..."
            if (row.employment_history && row.employment_history.includes(',')) {
                const entries = row.employment_history.split('|');
                const historyArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return {
                        company: parts[0] || '',
                        position: parts[1] || '',
                        from: parts[2] || '',
                        to: parts[3] || ''
                    };
                });
                row.employment_history = JSON.stringify(historyArray);
            } else {
                row.employment_history = null;
            }

            // B. REFERENCES
            // Format: "Name, Contact, Company, Address | Next..."
            if (row.character_references && row.character_references.includes(',')) {
                const entries = row.character_references.split('|');
                const refArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return {
                        name: parts[0] || '',
                        contact: parts[1] || '',
                        company: parts[2] || '',
                        address: parts[3] || ''
                    };
                });
                row.character_references = JSON.stringify(refArray);
            } else {
                row.character_references = null;
            }

            // C. CHILDREN
            // Format: "Name, Address | Next..."
            if (row.children_info && row.children_info.includes(',')) {
                const entries = row.children_info.split('|');
                const childArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return {
                        name: parts[0] || '',
                        address: parts[1] || ''
                    };
                });
                row.children_info = JSON.stringify(childArray);
            } else {
                row.children_info = null;
            }

            return row;
        });
    }

    // --- 4. VALIDATION (Security & Data Integrity) ---
    function validateData(data) {
        const errors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        data.forEach((row, index) => {
            const rowNum = index + 1;
            
            // A. Mandatory Fields
            const required = ['surname', 'firstname', 'position_applied', 'application_source'];
            required.forEach(field => {
                if (!row[field] || row[field].trim() === '') {
                    errors.push(`Row ${rowNum}: Missing required field '<strong>${field}</strong>'.`);
                }
            });

            // B. Email Format (Skip if empty)
            if (row.email && row.email.trim() !== '' && !emailRegex.test(row.email)) {
                errors.push(`Row ${rowNum}: Invalid Email format '<strong>${row.email}</strong>'.`);
            }

            // C. Numeric Checks
            if (row.age && isNaN(row.age)) errors.push(`Row ${rowNum}: Age must be a number.`);
            if (row.screening_score && isNaN(row.screening_score)) errors.push(`Row ${rowNum}: Screening Score must be a number.`);

            // D. Date Checks (FIX: Only check if NOT empty)
            const dateFields = ['birthday', 'application_date'];
            dateFields.forEach(field => {
                // If field has data AND that data is NOT a valid date
                if (row[field] && row[field].trim() !== '' && isNaN(Date.parse(row[field]))) {
                    errors.push(`Row ${rowNum}: Invalid Date in '<strong>${field}</strong>' (${row[field]}). Use YYYY-MM-DD.`);
                }
            });
        });

        return errors;
    }

    // --- 5. FILE PROCESSING ---
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            if(processUploadBtn) processUploadBtn.disabled = true;
            if(uploadFeedback) uploadFeedback.classList.add('hidden');
            return;
        }

        // Reset UI
        uploadFeedback.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
        uploadFeedback.className = 'mt-4 text-sm text-blue-600 text-center font-medium';
        uploadFeedback.textContent = 'Analyzing file...';
        if(processUploadBtn) processUploadBtn.disabled = true;

        const reader = new FileReader();
        
        reader.onload = function(e) {
            let content = e.target.result;
            
            // FIX: If Excel added "sep=," at the top, remove it
            if (content.startsWith("sep=,")) {
                content = content.split("\n").slice(1).join("\n");
            }

            Papa.parse(content, {
                header: true,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                    const uploadedHeaders = results.meta.fields || [];
                    
                    // 1. Check Critical Columns
                    const criticalHeaders = ['surname', 'firstname'];
                    const missing = criticalHeaders.filter(h => !uploadedHeaders.includes(h));

                    if (missing.length > 0) {
                        showError(`<strong>Critical Error:</strong> Missing columns: ${missing.join(', ')}`);
                        return;
                    } 
                    
                    if (results.data.length === 0) {
                        showError("Error: File is empty.");
                        return;
                    }

                    // 2. Sanitize (Trim spaces, Fix Dates)
                    let processedData = sanitizeData(results.data);

                    // --- 2.1 CRITICAL FIX: TRANSFORM TEXT TO JSON ---
                    // This was missing! It converts "Name, Addr" -> [{"name":"Name"}]
                    processedData = transformComplexData(processedData); 
                    // -----------------------------------------------

                    // 3. Validate
                    const validationErrors = validateData(processedData);

                    if (validationErrors.length > 0) {
                        const displayErrors = validationErrors.slice(0, 5).join('<br>');
                        const more = validationErrors.length > 5 ? `<br>...and ${validationErrors.length - 5} more errors.` : '';
                        showError(`<strong>Found ${validationErrors.length} issues:</strong><br>${displayErrors}${more}`);
                    } else {
                        // Success State
                        uploadFeedback.innerHTML = `<i class="fas fa-check-circle"></i> Validated! Ready to upload ${processedData.length} records.`;
                        uploadFeedback.className = 'mt-4 text-sm bg-green-100 text-green-700 p-3 rounded border border-green-200 text-center';
                        if(processUploadBtn) {
                            processUploadBtn.disabled = false;
                            // Attach the TRANSFORMED data, not the raw data
                            processUploadBtn.dataset.payload = JSON.stringify(processedData);
                        }
                    }
                },
                error: (error) => {
                    showError(`Error parsing CSV: ${error.message}`);
                }
            });
        };

        reader.onerror = function() {
            showError("Error reading file.");
        };

        reader.readAsText(file);
    }

    function showError(msg) {
        uploadFeedback.innerHTML = msg;
        uploadFeedback.className = 'mt-4 text-sm bg-red-100 text-red-700 p-3 rounded border border-red-200 text-left overflow-y-auto max-h-32';
        if(processUploadBtn) processUploadBtn.disabled = true;
    }

    function downloadTemplate() {
        const sampleValues = templateHeaders.map(header => sampleRow[header]);
        const csvRows = [
            templateHeaders.join(','),
            sampleValues.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')
        ];
        
        // FIX: Add "sep=," to help Excel open it correctly automatically
        const csvContent = "\uFEFFsep=,\n" + csvRows.join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.setAttribute("href", url);
        link.setAttribute("download", "applicant_import_template_v5.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function processUpload() {
        const payload = processUploadBtn.dataset.payload;
        if (!payload) return;

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
            
            const result = await response.json();
            
            if (result.status === 'success') {
                Swal.fire({ icon: 'success', title: 'Import Successful', text: result.message, timer: 2000, showConfirmButton: false });
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
            Swal.fire({ icon: 'error', title: 'Upload Failed', text: error.message });
        } finally {
            if(processUploadBtn) processUploadBtn.disabled = false;
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
    
    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            if (bulkUploadModal) bulkUploadModal.classList.add('hidden');
        });
    }

    if (csvFileInput) csvFileInput.addEventListener('change', handleFileUpload);
    if (processUploadBtn) {
        processUploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            processUpload();
        });
    }
});