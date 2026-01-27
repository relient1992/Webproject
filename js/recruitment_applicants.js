document.addEventListener('DOMContentLoaded', function() {
    // --- 1. SMART ELEMENT SELECTORS (Works for Public Form & HR Dashboard) ---
    // Helper to find element by ID or 'add_' prefixed ID
    const getEl = (id) => document.getElementById(id) || document.getElementById('add_' + id);

    const form = document.getElementById('recruitmentForm') || document.getElementById('addApplicantForm');
    const submitBtn = document.getElementById('submitBtn') || document.querySelector('#addApplicantForm button[type="submit"]');
    
    // Personal Info
    const mobileInput = getEl('mobile');
    const viberInput = getEl('viber');
    
    // Birthday dropdowns
    const monthSelect = document.getElementById('birthMonth') || document.getElementById('add_birthMonth');
    const daySelect = document.getElementById('birthDay') || document.getElementById('add_birthDay');
    const yearSelect = document.getElementById('birthYear') || document.getElementById('add_birthYear');
    
    // Education
    const educationLevelSelect = getEl('education_level');
    const collegeDegreeContainer = getEl('collegeDegreeContainer');
    const collegeDegreeSelect = getEl('college_degree');
    const otherDegreeContainer = getEl('otherDegreeContainer');
    const otherDegreeInput = getEl('other_degree');

    // Job & Skills
    const positionSelect = getEl('position_applied');
    const experienceSelect = getEl('experience_years');
    const skillsContainer = getEl('skillsContainer'); 
    const skillDropdown = getEl('skill_dropdown');   
    const addSkillBtn = getEl('addSkillBtn');       
    const skillsDisplay = getEl('selectedSkillsContainer'); 
    const hiddenSkillInput = getEl('hidden_specific_skill'); 

    // Modal Elements (Public Form Only)
    const responseModal = document.getElementById('responseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const reviewModal = document.getElementById('reviewModal');
    const reviewDataList = document.getElementById('reviewDataList');
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    const closeReviewBtn = document.getElementById('closeReviewBtn');
    
    // --- SKILLS DATA MASTER LIST ---
    let selectedSkills = []; // Keep this! It tracks user choices.
    let allSkillsData = [];  // Start empty (we will fill this from DB)

    // Function to fetch skills from Database
    async function fetchSkillsFromDB() {
        try {
            const response = await fetch('../hr_dashboard_api.php?action=getSkills');
            const data = await response.json();
            
            if (Array.isArray(data)) {
                allSkillsData = data;
                window.allSkillsData = data; // <--- ADD THIS LINE (Makes it available for scoring)
                console.log("Skills loaded from DB:", allSkillsData.length);
            }
        } catch (error) {
            console.error("Failed to load skills:", error);
        }
    }

    // Call this immediately to load data when page opens
    fetchSkillsFromDB();

    // --- 2. DATE POPULATION ---
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if(monthSelect) {
        // Only populate if empty
        if (monthSelect.options.length <= 1) {
            monthSelect.innerHTML = '<option value="" disabled selected>Month</option>';
            months.forEach((month, index) => monthSelect.add(new Option(month, index + 1)));
            
            if(daySelect) {
                daySelect.innerHTML = '<option value="" disabled selected>Day</option>';
                for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i));
            }
            if(yearSelect) {
                const currentYear = new Date().getFullYear();
                yearSelect.innerHTML = '<option value="" disabled selected>Year</option>';
                for (let i = currentYear; i >= 1960; i--) yearSelect.add(new Option(i, i));
            }
        }
    }

    // --- 3. INPUT VALIDATION ---
    if (mobileInput) mobileInput.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
    if (viberInput) viberInput.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });

    // --- 4. EDUCATION LOGIC ---
    if (educationLevelSelect) {
        educationLevelSelect.addEventListener('change', function() {
            const showDegree = this.value === 'College Graduate' || this.value === 'Post Graduate';
            if (collegeDegreeContainer) collegeDegreeContainer.classList.toggle('hidden', !showDegree);
            if (collegeDegreeSelect) {
                collegeDegreeSelect.required = showDegree;
                if (!showDegree) {
                    collegeDegreeSelect.value = "";
                    if (otherDegreeContainer) otherDegreeContainer.classList.add('hidden');
                    if (otherDegreeInput) otherDegreeInput.required = false;
                }
            }
        });
    }

    if (collegeDegreeSelect) {
        collegeDegreeSelect.addEventListener('change', function() {
            const isOther = this.value === 'Other';
            if (otherDegreeContainer) otherDegreeContainer.classList.toggle('hidden', !isOther);
            if (otherDegreeInput) otherDegreeInput.required = isOther;
        });
    }

    // --- 5. SKILLS TAGGING LOGIC ---
    if (positionSelect && skillDropdown) {
        // A. Populate Dropdown on Position Change
        positionSelect.addEventListener('change', function() {
            const selectedPos = this.value;
            skillDropdown.innerHTML = '<option value="">Select a skill to add...</option>';
            
            // Reset selections
            selectedSkills = []; 
            renderTags();

            if (selectedPos) {
                if (skillsContainer) skillsContainer.classList.remove('hidden');
                
                // Group skills by category
                const groupedSkills = allSkillsData.reduce((acc, skill) => {
                    if (!acc[skill.category]) acc[skill.category] = [];
                    acc[skill.category].push(skill.name);
                    return acc;
                }, {});

                // Create OptGroups
                Object.keys(groupedSkills).sort().forEach(category => {
                    const group = document.createElement('optgroup');
                    group.label = category;
                    groupedSkills[category].forEach(skillName => {
                        const opt = document.createElement('option');
                        opt.value = skillName;
                        opt.textContent = skillName;
                        group.appendChild(opt);
                    });
                    skillDropdown.appendChild(group);
                });
            } else {
                if (skillsContainer) skillsContainer.classList.add('hidden');
            }
        });

        // B. Add Skill Button Logic
        if(addSkillBtn) {
            addSkillBtn.addEventListener('click', function() {
                const val = skillDropdown.value;
                if (val && !selectedSkills.includes(val)) {
                    selectedSkills.push(val);
                    renderTags();
                    skillDropdown.value = ""; 
                }
            });
        }

        // C. Render Tags Function
        function renderTags() {
            if(!skillsDisplay) return;
            skillsDisplay.innerHTML = '';
            selectedSkills.forEach(skill => {
                const tag = document.createElement('span');
                tag.className = 'skill-tag'; // Ensure CSS exists for this class
                tag.innerHTML = `${skill} <span class="remove-skill" data-skill="${skill}">&times;</span>`;
                skillsDisplay.appendChild(tag);
            });
            
            if(hiddenSkillInput) hiddenSkillInput.value = selectedSkills.join(', ');
            
            document.querySelectorAll('.remove-skill').forEach(btn => {
                btn.addEventListener('click', function() {
                    const skillToRemove = this.getAttribute('data-skill');
                    selectedSkills = selectedSkills.filter(s => s !== skillToRemove);
                    renderTags();
                });
            });
        }
    }

    function calculateAge() {
        // Smart selector for dashboard vs public form
        const m = document.getElementById('birthMonth') || document.getElementById('add_birthMonth');
        const d = document.getElementById('birthDay') || document.getElementById('add_birthDay');
        const y = document.getElementById('birthYear') || document.getElementById('add_birthYear');
        const ageInput = document.getElementById('age') || document.getElementById('add_age'); // Ensure ID exists in modal too

        if (m && d && y && ageInput) {
            const month = parseInt(m.value);
            const day = parseInt(d.value);
            const year = parseInt(y.value);

            if (month && day && year) {
                const today = new Date();
                let age = today.getFullYear() - year;
                const mDiff = today.getMonth() + 1 - month; // JS months are 0-11
                
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) {
                    age--;
                }
                ageInput.value = age;
            } else {
                ageInput.value = "";
            }
        }
    }

    // Attach listeners to all birth dropdowns
    [monthSelect, daySelect, yearSelect].forEach(el => {
        if(el) el.addEventListener('change', calculateAge);
    });

    // --- 6. PRE-SCREENING CALCULATION (FIXED) ---
    function calculatePrescreening() {
        // 1. Re-fetch elements dynamically
        const eduEl = document.getElementById('education_level') || document.getElementById('add_education_level');
        const expEl = document.getElementById('experience_years') || document.getElementById('add_experience_years');
        const posEl = document.getElementById('position_applied') || document.getElementById('add_position_applied');
        const degreeEl = document.getElementById('college_degree') || document.getElementById('add_college_degree');

        // Safety: If elements are missing, return 0 to prevent crash
        if (!eduEl || !expEl || !posEl) {
            console.error("Scoring Error: Could not find required dropdowns.");
            return { score: 0, status: 'Pending' };
        }

        const edu = eduEl.value;
        const exp = expEl.value;
        const pos = posEl.value;
        const degree = degreeEl ? degreeEl.value : ""; 
        let score = 0;

        // --- 1. EDUCATION SCORING (Max 30) ---
        const isEntryLevelRole = (pos === "Data Entry Operator" || pos === "Call Center Agent");

        if (edu === "Post Graduate") {
            score += 30;
        } else if (edu === "College Graduate") {
            score += isEntryLevelRole ? 30 : 25; 
        } else if (edu === "Vocational Graduate") {
            score += isEntryLevelRole ? 28 : 20; 
        } else if (edu === "Some College") {
            score += isEntryLevelRole ? 25 : 15; 
        } else if (edu === "High School Graduate") {
            score += isEntryLevelRole ? 20 : 5; 
        }

        // --- 2. EXPERIENCE SCORING (Max 50) ---
        if (exp === "5") score += 50;
        else if (exp === "3") score += 40;
        else if (exp === "2") score += 30;
        else if (exp === "1") score += 15;
        else if (exp === "0") score += 5;

        // --- 3. SKILLS BONUS (Max 25) ---
        let skillScore = 0;
        // Check for global skills data to apply intelligent scoring
        if (selectedSkills && selectedSkills.length > 0 && window.allSkillsData && Array.isArray(window.allSkillsData)) {
            selectedSkills.forEach(skillName => {
                const skillObj = window.allSkillsData.find(s => s.name === skillName);
                if (skillObj && skillObj.category === pos) {
                    skillScore += 5; // Premium points
                } else {
                    skillScore += 1; // Standard points
                }
            });
        } else if (selectedSkills && selectedSkills.length > 0) {
            skillScore = selectedSkills.length * 2; // Fallback logic
        }
        score += Math.min(skillScore, 25);

        // --- 4. STATUS DETERMINATION & HARD GATES ---
        let status = "Low Match";
        let hardGateReason = null;

        // NURSE
        if (pos === "Nurse") {
            if (edu !== "College Graduate" && edu !== "Post Graduate") hardGateReason = "Education (Degree Required)";
            else if (!degree.includes("Nursing")) hardGateReason = "Degree Mismatch (BS Nursing Required)";
        }
        // ACCOUNTING
        else if (pos === "Accounting") {
            if (edu !== "College Graduate" && edu !== "Post Graduate") hardGateReason = "Education (Degree Required)";
            else if (!degree.includes("Accountancy")) hardGateReason = "Degree Mismatch (BS Accountancy Required)";
        }
        // HUMAN RESOURCE
        else if (pos === "Human Resource") {
            if (edu !== "College Graduate" && edu !== "Post Graduate") hardGateReason = "Education (Degree Required)";
            else if (!degree.includes("Psychology") && !degree.includes("Human Resource") && degree !== "Other") hardGateReason = "Degree Mismatch (Psychology/HR Preferred)";
        }
        // IT
        else if (pos === "IT") {
            if (edu === "High School Graduate") hardGateReason = "Education (Minimum Vocational/College)";
            else if (!degree.includes("Technology") && !degree.includes("Computer") && !degree.includes("Engineering") && degree !== "Other") hardGateReason = "Degree Mismatch (IT/CS/Eng Required)";
        }
        // MEDCODER
        else if (pos === "Medcoder") {
            const hasCodingSkill = selectedSkills.some(s => s.includes("Medical Coding") || s.includes("ICD-10"));
            const hasMedicalDegree = degree.includes("Nursing") || degree.includes("Biology");
            if (!hasCodingSkill && !hasMedicalDegree) hardGateReason = "Qualification (Needs Medical Degree or Coding Skill)";
        }
        // MANAGER
        else if (pos === "Manager Level" && (exp === "0" || exp === "1")) {
            hardGateReason = "Experience (Management requires tenure)";
        }
        // QUALITY ANALYST
        else if (pos === "Quality Analyst" && exp === "0") {
            hardGateReason = "Experience (QA requires prior experience)";
        }
        // PROCUREMENT
        else if (pos === "Procurement" && (edu !== "College Graduate" && edu !== "Post Graduate")) {
            hardGateReason = "Education (Degree Required)";
        }
        // REPORTS ANALYST
        else if (pos === "Reports Analyst" && exp === "0") {
            hardGateReason = "Experience (Analyst requires tenure)";
        }

        // --- APPLY FINAL STATUS ---
        if (hardGateReason) {
            status = `Underqualified - ${hardGateReason}`;
            score = 0; 
        } else {
            if (score >= 90) status = "Highly Recommended";
            else if (score >= 70) status = "Qualified";
            else if (score >= 40) status = "Review Required";
        }

        console.log(`Final Result: Score = ${score}, Status = ${status}`);
        
        // --- IMPORTANT: THIS LINE WAS MISSING ---
        return { score: score, status: status }; 
    }

    // --- 7. PUBLIC FORM SUBMISSION (With Review Modal) ---
    function populateReview() {
        if (!reviewDataList) return;
        reviewDataList.innerHTML = ''; 
        const formData = new FormData(form);
        
        // UPDATED LABELS LIST
        const labels = {
            'surname': 'Surname', 'firstname': 'First Name', 'middlename': 'Middle Name',
            'birthMonth': 'Birth Month', 'birthDay': 'Birth Day', 'birthYear': 'Birth Year',
            'gender': 'Gender', 'mobile': 'Mobile', 'email': 'Email',
            'education_level': 'Education', 'college_degree': 'Degree',
            'street': 'Address', 'city': 'City', 'province': 'Province',
            'position_applied': 'Position', 'experience_years': 'Experience',
            'specific_skill': 'Skills',
            'entity': 'Entity',
            'sss_no': 'SSS Number', 'tin_no': 'TIN', 'philhealth_no': 'PhilHealth', 'hdmf_id': 'HDMF / Pag-IBIG',
            
            // NEW FIELDS
            'location': 'Preferred Location',
            'marital_status': 'Marital Status',
            'father_name': "Father's Name",
            'mother_name': "Mother's Name",
            'spouse_name': "Spouse Name",
            'relatives_at_xbp': 'Relatives at XBP?',
            'relatives_at_xbp_details': 'Relative Details',
            'worked_at_xbp': 'Worked at XBP before?',
            'worked_at_xbp_details': 'Previous Work Details'
        };

        // Static Fields Loop
        formData.forEach((value, key) => {
            if (labels[key] && value) {
                let displayVal = value;
                if(key === 'birthMonth' && months[value-1]) displayVal = months[value-1];
                const div = document.createElement('div');
                div.className = 'border-b border-gray-100 pb-2';
                div.innerHTML = `<dt class="font-semibold text-gray-600 text-xs uppercase">${labels[key]}</dt><dd class="text-gray-900">${displayVal}</dd>`;
                reviewDataList.appendChild(div);
            }
        });

        // Dynamic Fields (Children, Employment, References) - Simple Counter Display
        const childCount = formData.getAll('child_name[]').filter(x => x).length;
        if(childCount > 0) {
            reviewDataList.innerHTML += `<div class="border-b border-gray-100 pb-2 col-span-2 bg-blue-50 p-2 rounded"><dt class="font-bold text-blue-700 text-xs uppercase">Children Added</dt><dd class="text-gray-900">${childCount} entries</dd></div>`;
        }

        const empCount = formData.getAll('emp_company[]').filter(x => x).length;
        if(empCount > 0) {
            reviewDataList.innerHTML += `<div class="border-b border-gray-100 pb-2 col-span-2 bg-blue-50 p-2 rounded"><dt class="font-bold text-blue-700 text-xs uppercase">Employment History</dt><dd class="text-gray-900">${empCount} companies listed</dd></div>`;
        }
        
        const refCount = formData.getAll('ref_name[]').filter(x => x).length;
        if(refCount > 0) {
             reviewDataList.innerHTML += `<div class="border-b border-gray-100 pb-2 col-span-2 bg-blue-50 p-2 rounded"><dt class="font-bold text-blue-700 text-xs uppercase">References</dt><dd class="text-gray-900">${refCount} references provided</dd></div>`;
        }
    }

    // --- 8. Additional information ---

    // A. Relatives & Work History Toggle
    const relativesRadios = document.querySelectorAll('input[name="relatives_at_xbp"]');
    const workedRadios = document.querySelectorAll('input[name="worked_at_xbp"]');
    const relativesDetails = document.getElementById('relativesDetails');
    const workedDetails = document.getElementById('workedDetails');

    relativesRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            relativesDetails.classList.toggle('hidden', e.target.value === 'No');
            relativesDetails.required = (e.target.value === 'Yes');
        });
    });

    workedRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            workedDetails.classList.toggle('hidden', e.target.value === 'No');
            workedDetails.required = (e.target.value === 'Yes');
        });
    });

    // B. Dynamic Children
    const childrenContainer = document.getElementById('childrenContainer');
    const addChildBtn = document.getElementById('addChildBtn');
    
    if (addChildBtn && childrenContainer) {
        addChildBtn.addEventListener('click', () => {
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center';
            div.innerHTML = `
                <input type="text" name="child_name[]" placeholder="Child's Name" class="form-input flex-1 px-3 py-2 border border-gray-300 rounded">
                <input type="text" name="child_address[]" placeholder="Child's Address" class="form-input flex-1 px-3 py-2 border border-gray-300 rounded">
                <button type="button" class="text-red-500 hover:text-red-700 px-2 remove-row"><i class="fas fa-trash"></i></button>
            `;
            childrenContainer.appendChild(div);
        });
        
        childrenContainer.addEventListener('click', e => {
            if (e.target.closest('.remove-row')) e.target.closest('.flex').remove();
        });
    }

    // C. Dynamic Employment History
    const empContainer = document.getElementById('employmentContainer');
    const addEmpBtn = document.getElementById('addEmploymentBtn');

    if (addEmpBtn && empContainer) {
        // Add one empty row by default
        addEmploymentRow(); 

        addEmpBtn.addEventListener('click', addEmploymentRow);

        function addEmploymentRow() {
            const div = document.createElement('div');
            div.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 relative emp-row mb-4';
            div.innerHTML = `
                <button type="button" class="absolute top-2 right-2 text-red-400 hover:text-red-600 remove-emp"><i class="fas fa-times"></i></button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="emp_company[]" placeholder="Company Name" class="form-input w-full px-3 py-2 rounded border border-gray-300">
                    <input type="text" name="emp_position[]" placeholder="Position" class="form-input w-full px-3 py-2 rounded border border-gray-300">
                    <input type="text" name="emp_address[]" placeholder="Company Address" class="form-input w-full px-3 py-2 rounded border border-gray-300 md:col-span-2">
                    <div class="flex gap-2 items-center">
                        <label class="text-xs text-gray-500 w-12">From:</label>
                        <input type="date" name="emp_from[]" class="form-input w-full px-3 py-2 rounded border border-gray-300">
                    </div>
                    <div class="flex gap-2 items-center">
                        <label class="text-xs text-gray-500 w-12">To:</label>
                        <input type="date" name="emp_to[]" class="form-input w-full px-3 py-2 rounded border border-gray-300">
                    </div>
                </div>
            `;
            empContainer.appendChild(div);
        }

        empContainer.addEventListener('click', e => {
            if (e.target.closest('.remove-emp')) e.target.closest('.emp-row').remove();
        });
    }

    // Only attach Review Modal listeners if elements exist (Public Form)
    if (form && reviewModal) {
        form.addEventListener('submit', function(event) {
            // Only intercept if we are on the public page (reviewModal exists)
            // If in dashboard, let the dashboard script handle submission
            if (reviewModal) {
                event.preventDefault(); 
                if (!form.checkValidity()) { form.reportValidity(); return; }
                populateReview();
                reviewModal.classList.remove('hidden');
            }
        });

        if (closeReviewBtn) closeReviewBtn.addEventListener('click', () => reviewModal.classList.add('hidden'));

        if (confirmSubmitBtn) {
            confirmSubmitBtn.addEventListener('click', async function() {
                reviewModal.classList.add('hidden');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

                const formData = new FormData(form);

                try {
                    // --- SAFETY WRAPPER START ---
                    const screening = calculatePrescreening();
                    formData.append('screening_score', screening.score);
                    formData.append('screening_status', screening.status);
                    // --- SAFETY WRAPPER END ---
        
                    const hiddenSkillInput = document.getElementById('hidden_specific_skill');
                    if (hiddenSkillInput) formData.set('specific_skill', hiddenSkillInput.value);
        
                    if (collegeDegreeSelect && collegeDegreeSelect.value === 'Other' && otherDegreeInput) {
                        formData.set('college_degree', otherDegreeInput.value);
                    }
                    formData.delete('college_degree_other');

                    // --- DEBUGGING CHANGE START ---
                    const response = await fetch('../recruitment_applicants.php', { method: 'POST', body: formData });
                    
                    // 1. Read raw text first (Do not use response.json() immediately)
                    const rawText = await response.text();
                    console.log("RAW SERVER RESPONSE:", rawText); // CHECK YOUR CONSOLE FOR THIS!

                    // 2. Try to parse it manually
                    let result;
                    try {
                        result = JSON.parse(rawText);
                    } catch (e) {
                        throw new Error(`Server Error: ${rawText.substring(0, 100)}...`); 
                    }
                    // --- DEBUGGING CHANGE END ---
                    
                    if (result.status === 'success') {
                        if(responseModal) {
                             modalTitle.textContent = 'Success!';
                             modalTitle.className = 'text-2xl font-bold text-green-600 mb-4';
                             modalMessage.textContent = result.message;
                             responseModal.classList.remove('hidden');
                             setTimeout(() => { location.reload(); }, 3000); 
                        } else {
                             alert('Success: ' + result.message);
                             location.reload();
                        }
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error("Submission Error:", error); // Log exact error to console
                    if (responseModal) {
                        modalTitle.textContent = 'Error';
                        modalTitle.className = 'text-2xl font-bold text-red-600 mb-4';
                        modalMessage.textContent = "Submission Failed: " + error.message;
                        responseModal.classList.remove('hidden');
                    } else {
                        alert('Error: ' + error.message);
                    }
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application'; }
                }
            });
        }
    }
});