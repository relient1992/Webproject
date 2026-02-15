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
    
    // --- 0. PRE-LOAD SKILLS FOR SCORING ---
    let allSkillsData = [];
    async function loadSkills() {
        try {
            const response = await fetch(`${API_URL}?action=getSkills`);
            const data = await response.json();
            if (Array.isArray(data)) allSkillsData = data;
        } catch (e) { console.error("Skills load failed", e); }
    }
    loadSkills(); // Run immediately

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
        
        screening_score: "", screening_status: "", // Leave blank to auto-calc
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

        children_info: "Baby Doe, Makati | Junior Doe, Makati",
        employment_history: "Company A, Agent, 2020, 2021 | Company B, Lead, 2022, 2023",
        character_references: "Ref Name 1, 0917111, Manager | Ref Name 2, 0917222, Supervisor",

        facebook_account: "", instagram_account: "", twitter_account: "", viber_account: "",
        education_level: "College Graduate", college_degree: "Bachelor of Science in Information Technology",
        requisition_id: ""
    };
    
    // --- 3. SCORING ENGINE (Ported from Recruitment Form) ---
    function calculateBulkScore(row) {
        // If score is already provided in CSV, trust it and skip calculation
        if (row.screening_score && row.screening_score.trim() !== "") {
            return { score: row.screening_score, status: row.screening_status || "Manual Review" };
        }

        const edu = row.education_level || "";
        const exp = String(row.experience_years || "0");
        const pos = row.position_applied || "";
        const degree = row.college_degree || ""; 
        const skillsStr = row.specific_skill || "";
        
        let score = 0;

        // 1. EDUCATION SCORING
        const isEntryLevelRole = (pos === "Data Entry Operator" || pos === "Call Center Agent");
        if (edu === "Post Graduate") score += 30;
        else if (edu === "College Graduate") score += isEntryLevelRole ? 30 : 25; 
        else if (edu === "Vocational Graduate") score += isEntryLevelRole ? 28 : 20; 
        else if (edu === "Some College") score += isEntryLevelRole ? 25 : 15; 
        else if (edu === "High School Graduate") score += isEntryLevelRole ? 20 : 5; 

        // 2. EXPERIENCE SCORING
        // Handle "1 year" or "1" formats
        const expVal = parseInt(exp) || 0;
        if (expVal >= 5) score += 50;
        else if (expVal >= 3) score += 40;
        else if (expVal >= 2) score += 30;
        else if (expVal >= 1) score += 15;
        else score += 5;

        // 3. SKILLS BONUS
        let skillScore = 0;
        if (skillsStr && allSkillsData.length > 0) {
            const rowSkills = skillsStr.split(',').map(s => s.trim());
            rowSkills.forEach(skillName => {
                // Find skill in DB list (Case insensitive check)
                const skillObj = allSkillsData.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                if (skillObj && skillObj.category === pos) {
                    skillScore += 5; // Premium match
                } else {
                    skillScore += 1; // Generic match
                }
            });
        } else if (skillsStr) {
            // Fallback if DB not loaded yet
            skillScore = skillsStr.split(',').length * 2;
        }
        score += Math.min(skillScore, 25);

        // 4. HARD GATES & STATUS
        let status = "Low Match";
        let hardGateReason = null;

        // Logic mirrors recruitment_applicants.js
        if (pos === "Nurse") {
            if (edu !== "College Graduate" && edu !== "Post Graduate") hardGateReason = "Education";
            else if (!degree.includes("Nursing")) hardGateReason = "Degree";
        }
        else if (pos === "Accounting" && (!degree.includes("Accountancy") && !degree.includes("Accounting"))) hardGateReason = "Degree";
        else if (pos === "IT" && edu === "High School Graduate") hardGateReason = "Education";
        else if (pos === "Manager Level" && expVal < 2) hardGateReason = "Experience";

        if (hardGateReason) {
            status = `Underqualified - ${hardGateReason}`;
            score = 0; 
        } else {
            if (score >= 90) status = "Highly Recommended";
            else if (score >= 70) status = "Qualified";
            else if (score >= 40) status = "Review Required";
        }

        return { score: score, status: status };
    }

    // --- 4. SANITIZATION & PROCESSING ---
    function sanitizeAndScoreData(data) {
        return data.map(row => {
            // Trim Strings
            Object.keys(row).forEach(key => {
                if (row[key] && typeof row[key] === 'string') {
                    row[key] = row[key].trim();
                }
            });

            // Auto-Uppercase
            if (row['Project']) row['Project'] = String(row['Project']).toUpperCase();

            // Fix Dates
            const dateColumns = ['birthday', 'status_date', 'application_date', 'offer_date', 'joining_date', 'interview_dates'];
            dateColumns.forEach(col => {
                if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
                    const valStr = String(row[col]);
                    const dateParts = valStr.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
                    if (dateParts) {
                        row[col] = `${dateParts[3]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                    }
                } else {
                    row[col] = '';
                }
            });

            // --- NEW: AUTO-CALCULATE SCORE IF MISSING ---
            if (!row['screening_score'] || row['screening_score'] === "") {
                const result = calculateBulkScore(row);
                row['screening_score'] = result.score;
                row['screening_status'] = result.status;
            }

            return row;
        });
    }

    function transformComplexData(data) {
        return data.map(row => {
            // JSON Transformations (Same as before)
            if (row.employment_history && row.employment_history.includes(',')) {
                const entries = row.employment_history.split('|');
                const historyArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return { company: parts[0]||'', position: parts[1]||'', from: parts[2]||'', to: parts[3]||'' };
                });
                row.employment_history = JSON.stringify(historyArray);
            } else { row.employment_history = null; }

            if (row.character_references && row.character_references.includes(',')) {
                const entries = row.character_references.split('|');
                const refArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return { name: parts[0]||'', contact: parts[1]||'', company: parts[2]||'', address: parts[3]||'' };
                });
                row.character_references = JSON.stringify(refArray);
            } else { row.character_references = null; }

            if (row.children_info && row.children_info.includes(',')) {
                const entries = row.children_info.split('|');
                const childArray = entries.map(entry => {
                    const parts = entry.split(',').map(s => s.trim());
                    return { name: parts[0]||'', address: parts[1]||'' };
                });
                row.children_info = JSON.stringify(childArray);
            } else { row.children_info = null; }

            return row;
        });
    }

    // --- 5. VALIDATION ---
    function validateData(data) {
        const errors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        data.forEach((row, index) => {
            const rowNum = index + 1;
            const required = ['surname', 'firstname', 'position_applied', 'application_source'];
            required.forEach(field => {
                if (!row[field] || row[field].trim() === '') {
                    errors.push(`Row ${rowNum}: Missing required field '<strong>${field}</strong>'.`);
                }
            });
            if (row.email && row.email.trim() !== '' && !emailRegex.test(row.email)) {
                errors.push(`Row ${rowNum}: Invalid Email format '<strong>${row.email}</strong>'.`);
            }
        });
        return errors;
    }

    // --- 6. FILE PROCESSING ---
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            if(processUploadBtn) processUploadBtn.disabled = true;
            if(uploadFeedback) uploadFeedback.classList.add('hidden');
            return;
        }

        uploadFeedback.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
        uploadFeedback.className = 'mt-4 text-sm text-blue-600 text-center font-medium';
        uploadFeedback.textContent = 'Analyzing file & Calculating Scores...';
        if(processUploadBtn) processUploadBtn.disabled = true;

        const reader = new FileReader();
        
        reader.onload = function(e) {
            let content = e.target.result;
            if (content.startsWith("sep=,")) content = content.split("\n").slice(1).join("\n");

            Papa.parse(content, {
                header: true,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                    const uploadedHeaders = results.meta.fields || [];
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

                    // --- PIPELINE: Sanitize -> Score -> Transform -> Validate ---
                    let processedData = sanitizeAndScoreData(results.data);
                    processedData = transformComplexData(processedData); 
                    
                    const validationErrors = validateData(processedData);

                    if (validationErrors.length > 0) {
                        const displayErrors = validationErrors.slice(0, 5).join('<br>');
                        const more = validationErrors.length > 5 ? `<br>...and ${validationErrors.length - 5} more errors.` : '';
                        showError(`<strong>Found ${validationErrors.length} issues:</strong><br>${displayErrors}${more}`);
                    } else {
                        // Count how many were qualified
                        const qualifiedCount = processedData.filter(d => parseInt(d.screening_score) >= 70).length;
                        
                        uploadFeedback.innerHTML = `<i class="fas fa-check-circle"></i> Validated! ${processedData.length} records ready.<br><strong>${qualifiedCount} Auto-Qualified</strong> based on scoring rules.`;
                        uploadFeedback.className = 'mt-4 text-sm bg-green-100 text-green-700 p-3 rounded border border-green-200 text-center';
                        if(processUploadBtn) {
                            processUploadBtn.disabled = false;
                            processUploadBtn.dataset.payload = JSON.stringify(processedData);
                        }
                    }
                },
                error: (error) => { showError(`Error parsing CSV: ${error.message}`); }
            });
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

        Swal.fire({ title: 'Uploading...', text: 'Importing records into the database.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

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
            } else { throw new Error(result.message); }
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