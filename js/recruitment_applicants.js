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
            // Adjust path if your PHP file is in a different folder
            const response = await fetch('../hr_dashboard_api.php?action=getSkills');
            const data = await response.json();
            
            if (Array.isArray(data)) {
                allSkillsData = data;
                console.log("Skills loaded from DB:", allSkillsData.length);
            }
        } catch (error) {
            console.error("Failed to load skills:", error);
            // Optional: Fallback data if DB fails
            allSkillsData = [
                { name: 'Payroll Processing', category: 'Accounting' },
                { name: 'Technical Support', category: 'Call Center Agent' }
            ];
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
        // 1. Re-fetch elements dynamically to ensure we get the active form's inputs
        const eduEl = document.getElementById('education_level') || document.getElementById('add_education_level');
        const expEl = document.getElementById('experience_years') || document.getElementById('add_experience_years');
        const posEl = document.getElementById('position_applied') || document.getElementById('add_position_applied'); // Need Position for logic

        // Safety: If elements are missing, return 0
        if (!eduEl || !expEl || !posEl) {
            console.error("Scoring Error: Could not find required dropdowns.");
            return { score: 0, status: 'Pending' };
        }

        const edu = eduEl.value;
        const exp = expEl.value;
        const pos = posEl.value;
        let score = 0;

        console.log(`Calculating for Position: "${pos}" | Edu: "${edu}" | Exp: "${exp}"`);

        // --- 1. EDUCATION SCORING (Max 30) ---
        // Logic: Data Entry & Call Center accept HS Grads, so we boost their base score.
        
        const isEntryLevelRole = (pos === "Data Entry Operator" || pos === "Call Center Agent");

        if (edu === "Post Graduate") {
            score += 30;
        } 
        else if (edu === "College Graduate") {
            // Full marks for College in entry roles
            score += isEntryLevelRole ? 30 : 25; 
        } 
        else if (edu === "Vocational Graduate") {
            // Vocational is very strong for practical roles like Data Entry
            score += isEntryLevelRole ? 28 : 20; 
        } 
        else if (edu === "Some College") {
            // Undergrads are often hired for Call Centers
            score += isEntryLevelRole ? 25 : 15; 
        } 
        else if (edu === "High School Graduate") {
            // CRITICAL CHANGE: 
            // For standard roles: 5 points (Likely underqualified)
            // For Entry Level roles: 20 points (Meets requirement)
            score += isEntryLevelRole ? 20 : 5; 
        }

        // --- 2. EXPERIENCE SCORING (Max 50) ---
        if (exp === "5") score += 50;       // 5+ Years
        else if (exp === "3") score += 40;  // 3-5 Years
        else if (exp === "2") score += 30;  // 1-2 Years
        else if (exp === "1") score += 15;  // Less than 1 Year
        else if (exp === "0") score += 5;   // Entry Level

        // --- 3. SKILLS BONUS (Max 20) ---
        if (selectedSkills && selectedSkills.length > 0) {
            score += Math.min(selectedSkills.length * 2, 20);
        }

        // --- 4. STATUS DETERMINATION ---
        let status = "Low Match";

        // Hard Gates (Auto-Fail Conditions)
        if (pos === "Nurse" && (edu !== "College Graduate" && edu !== "Post Graduate")) {
            status = "Underqualified (Education)";
        } 
        else if (pos === "Manager Level" && (exp === "0" || exp === "1")) {
            status = "Underqualified (Experience)";
        }
        else {
            // Standard Scoring Thresholds
            if (score >= 90) {
                status = "Highly Recommended";
            } else if (score >= 70) {
                status = "Qualified";
            } else if (score >= 40) {
                // With the boost, a HS Grad (20) + 1 Yr Exp (15) + Skills (6) = 41
                // This correctly places them in "Review Required" instead of "Low Match"
                status = "Review Required";
            }
        }

        console.log(`Final Result: Score = ${score}, Status = ${status}`);
        
        return { score, status };
    }

    // --- 7. PUBLIC FORM SUBMISSION (With Review Modal) ---
    function populateReview() {
        if (!reviewDataList) return;
        reviewDataList.innerHTML = ''; 
        const formData = new FormData(form);
        
        const labels = {
            'surname': 'Surname', 'firstname': 'First Name', 'middlename': 'Middle Name',
            'birthMonth': 'Birth Month', 'birthDay': 'Birth Day', 'birthYear': 'Birth Year',
            'gender': 'Gender', 'mobile': 'Mobile', 'email': 'Email',
            'education_level': 'Education', 'college_degree': 'Degree',
            'street': 'Address', 'city': 'City', 'province': 'Province',
            'position_applied': 'Position', 'experience_years': 'Experience',
            'specific_skill': 'Skills'
        };

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

                // 1. Calculate Score & Status (Calls your updated function)
                const screening = calculatePrescreening();
                formData.append('screening_score', screening.score);
                formData.append('screening_status', screening.status);
    
                // 2. SAFETY CHECK: Explicitly add the skills string
                // (This ensures the skills tags are sent even if the form behavior is quirky)
                const hiddenSkillInput = document.getElementById('hidden_specific_skill');
                if (hiddenSkillInput) {
                    formData.set('specific_skill', hiddenSkillInput.value);
                }
    
                // 3. Handle "Other" Degree
                if (collegeDegreeSelect && collegeDegreeSelect.value === 'Other' && otherDegreeInput && otherDegreeInput.value) {
                    formData.set('college_degree', otherDegreeInput.value);
                }
                formData.delete('college_degree_other');

                try {
                    const response = await fetch('../recruitment_applicants.php', { method: 'POST', body: formData });
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        if (responseModal) {
                            modalTitle.textContent = 'Success!';
                            modalTitle.className = 'text-2xl font-bold text-green-600 mb-4';
                            modalMessage.textContent = result.message;
                            responseModal.classList.remove('hidden');
                            
                            setTimeout(() => {
                                responseModal.classList.add('hidden');
                                form.reset();
                                selectedSkills = [];
                                renderTags();
                                if(collegeDegreeContainer) collegeDegreeContainer.classList.add('hidden');
                                if(skillsContainer) skillsContainer.classList.add('hidden');
                            }, 3000);
                        } else {
                            alert('Success: ' + result.message);
                            form.reset();
                        }
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    if (responseModal) {
                        modalTitle.textContent = 'Error';
                        modalTitle.className = 'text-2xl font-bold text-red-600 mb-4';
                        modalMessage.textContent = error.message;
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