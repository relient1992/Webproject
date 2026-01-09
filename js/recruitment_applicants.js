document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors ---
    const form = document.getElementById('recruitmentForm');
    const submitBtn = document.getElementById('submitBtn');
    const mobileInput = document.getElementById('mobile');
    const viberInput = document.getElementById('viber');
    
    // Birthday dropdowns
    const monthSelect = document.getElementById('birthMonth');
    const daySelect = document.getElementById('birthDay');
    const yearSelect = document.getElementById('birthYear');
    
    // Education dropdowns & containers
    const educationLevelSelect = document.getElementById('education_level');
    const collegeDegreeContainer = document.getElementById('collegeDegreeContainer');
    const collegeDegreeSelect = document.getElementById('college_degree');
    const otherDegreeContainer = document.getElementById('otherDegreeContainer');
    const otherDegreeInput = document.getElementById('other_degree');

    // --- NEW: Pre-screening Selectors ---
    const positionSelect = document.getElementById('position_applied');
    const experienceSelect = document.getElementById('experience_years');
    const factorContainer = document.getElementById('determiningFactorContainer');
    const factorLabel = document.getElementById('factorLabel');
    const specificSkillSelect = document.getElementById('specific_skill');

    // Modal Elements (Original)
    const responseModal = document.getElementById('responseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    // --- NEW: Review Modal Selectors ---
    const reviewModal = document.getElementById('reviewModal');
    const reviewDataList = document.getElementById('reviewDataList');
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    const closeReviewBtn = document.getElementById('closeReviewBtn');
    
    // --- Pre-screening Mapping Logic ---
    const positionLogic = {
        'Accounting': { label: 'Accounting Specialization', options: ['Payroll Processing', 'Taxation/Compliance', 'Accounts Payable/Receivable', 'General Audit'] },
        'Call Center Agent': { label: 'Account Type Experience', options: ['International Voice', 'Technical Support', 'Sales/Telemarketing', 'Customer Service (Chat/Email)'] },
        'Data Entry Operator': { label: 'Typing & Software Proficiency', options: ['Alpha-Numeric (High Speed)', 'Transcription', 'MS Excel Advanced', 'Database Management'] },
        'Facilities': { label: 'Facilities Expertise', options: ['Building Maintenance', 'Electrical/Plumbing', 'Vendor Management', 'Security Operations'] },
        'Human Resource': { label: 'HR Focus Area', options: ['Recruitment/Sourcing', 'Employee Relations', 'Compensation & Benefits', 'Training & Development'] },
        'IT': { label: 'IT Specialization', options: ['Network Administration', 'Technical Helpdesk', 'System Security', 'Software Troubleshooting'] },
        'Manager Level': { label: 'Management Experience', options: ['Operations Management', 'Team Lead (People Management)', 'Project Management', 'Strategic Planning'] },
        'Medcoder': { label: 'Coding Certification/Skill', options: ['ICD-10-CM Proficiency', 'CPC Certified', 'Medical Billing', 'Inpatient/Outpatient Coding'] },
        'Nurse': { label: 'Clinical Area', options: ['ER/ICU Experience', 'General Ward', 'Occupational Health', 'Pediatrics/OB-GYN'] },
        'Procurement': { label: 'Supply Chain Focus', options: ['Purchasing/Buying', 'Inventory Management', 'Logistics/Distribution', 'Vendor Negotiation'] },
        'Quality Analyst': { label: 'QA Expertise', options: ['Call Monitoring', 'Process Improvement (Six Sigma)', 'Data Analysis', 'Compliance Auditing'] },
        'Reports Analyst': { label: 'Reporting Tools', options: ['Real-time Monitoring', 'Advanced Excel/VBA', 'Power BI/Tableau', 'SQL/Data Mining'] }
    };

    // --- Date Population Logic ---
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthSelect.innerHTML = '<option value="" disabled selected>Month</option>';
    months.forEach((month, index) => {
        monthSelect.innerHTML += `<option value="${index + 1}">${month}</option>`;
    });
    daySelect.innerHTML = '<option value="" disabled selected>Day</option>';
    for (let i = 1; i <= 31; i++) {
        daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 65;
    const endYear = currentYear - 18;
    yearSelect.innerHTML = '<option value="" disabled selected>Year</option>';
    for (let i = endYear; i >= startYear; i--) {
        yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
    
    // --- Real-time Input Validation ---
    if (mobileInput) {
        mobileInput.addEventListener('input', function() { this.value = this.value.replace(/\D/g, ''); });
    }
    if(viberInput) {
        viberInput.addEventListener('input', function() { this.value = this.value.replace(/[^\d+]/g, ''); });
    }

    // --- Conditional Logic for Education Fields ---
    if (educationLevelSelect) {
        educationLevelSelect.addEventListener('change', function() {
            if (this.value === 'College Graduate' || this.value === 'Post Graduate') {
                collegeDegreeContainer.classList.remove('hidden');
                collegeDegreeSelect.required = true;
            } else {
                collegeDegreeContainer.classList.add('hidden');
                collegeDegreeSelect.required = false;
                otherDegreeContainer.classList.add('hidden');
                otherDegreeInput.required = false;
            }
        });
    }

    if (collegeDegreeSelect) {
        collegeDegreeSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                otherDegreeContainer.classList.remove('hidden');
                otherDegreeInput.required = true;
            } else {
                otherDegreeContainer.classList.add('hidden');
                otherDegreeInput.required = false;
            }
        });
    }

    // --- Dynamic Dropdown for Determining Factors ---
    if (positionSelect) {
        positionSelect.addEventListener('change', function() {
            const selectedPos = this.value;
            const logic = positionLogic[selectedPos];

            if (logic) {
                factorLabel.textContent = logic.label;
                specificSkillSelect.innerHTML = '<option value="" disabled selected>Select your primary expertise...</option>';
                logic.options.forEach(opt => {
                    specificSkillSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
                });
                factorContainer.classList.remove('hidden');
                specificSkillSelect.required = true;
            } else {
                factorContainer.classList.add('hidden');
                specificSkillSelect.required = false;
            }
        });
    }

    // --- Pre-screening Scoring Logic ---
    function calculatePrescreening() {
        const edu = educationLevelSelect.value;
        const exp = experienceSelect.value;
        const pos = positionSelect.value;
        
        let score = 0;

        // 1. Education Weight (Max 30)
        if (edu === "Post Graduate") score += 30;
        else if (edu === "College Graduate") score += 25;
        else if (edu === "Some College") score += 15;

        // 2. Experience Weight (Max 40)
        if (exp === "5") score += 40;
        else if (exp === "3") score += 30;
        else if (exp === "2") score += 20;
        else if (exp === "1") score += 10;

        // 3. Status Determination
        let status = "Pending Review";
        
        // Hard Gates
        if (pos === "Nurse" && (edu !== "College Graduate" && edu !== "Post Graduate")) {
            status = "Underqualified (Education)";
        } else if (pos === "Manager Level" && parseInt(exp) < 3) {
            status = "Underqualified (Experience)";
        } else if (score >= 60) {
            status = "Qualified";
        } else if (score >= 40) {
            status = "Review Required";
        } else {
            status = "Low Match";
        }

        return { score, status };
    }
    
    // --- NEW: Function to Populate Review List ---
    function populateReview() {
        reviewDataList.innerHTML = ''; 
        const formData = new FormData(form);
        
        const fieldLabels = {
            'surname': 'Surname',
            'firstname': 'First Name',
            'middlename': 'Middle Name',
            'birthMonth': 'Birth Month',
            'birthDay': 'Birth Day',
            'birthYear': 'Birth Year',
            'gender': 'Gender',
            'mobile': 'Mobile Number',
            'email': 'Email Address',
            'education_level': 'Education Level',
            'college_degree': 'Degree',
            'street': 'Street',
            'city': 'City',
            'province': 'Province',
            'zipcode': 'Zip Code',
            'position_applied': 'Position',
            'experience_years': 'Years of Experience',
            'specific_skill': 'Specialization',
            'application_source': 'Source'
        };

        formData.forEach((value, key) => {
            if (fieldLabels[key] && value) {
                let displayValue = value;
                if(key === 'birthMonth') displayValue = months[value - 1];
                if(key === 'experience_years') {
                    const expMap = {'0':'Entry Level', '1':'< 1 Year', '2':'1-2 Years', '3':'3-5 Years', '5':'> 5 Years'};
                    displayValue = expMap[value];
                }

                const div = document.createElement('div');
                div.className = 'border-b border-gray-100 pb-2';
                div.innerHTML = `<dt class="font-semibold text-gray-600">${fieldLabels[key]}</dt><dd class="text-gray-900">${displayValue}</dd>`;
                reviewDataList.appendChild(div);
            }
        });
    }

    // --- NEW: Close Review Listener ---
    if (closeReviewBtn) {
        closeReviewBtn.addEventListener('click', () => {
            reviewModal.classList.add('hidden');
        });
    }

    // --- Form Submission Logic ---
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            populateReview();
            reviewModal.classList.remove('hidden');
        });
    }

    // --- NEW: Actual Submission Logic ---
    if (confirmSubmitBtn) {
        confirmSubmitBtn.addEventListener('click', async function() {
            reviewModal.classList.add('hidden');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const formData = new FormData(form);

            // Pre-screening calculation
            const screening = calculatePrescreening();
            formData.append('screening_score', screening.score);
            formData.append('screening_status', screening.status);

            if (collegeDegreeSelect.value === 'Other' && otherDegreeInput.value) {
                formData.set('college_degree', otherDegreeInput.value);
            }
            formData.delete('college_degree_other');

            try {
                const response = await fetch('../recruitment_applicants.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.status === 'success') {
                    modalTitle.textContent = 'Thank You!';
                    modalTitle.className = 'text-2xl font-bold text-green-600 mb-4';
                    modalMessage.textContent = result.message;
                    responseModal.classList.remove('hidden');
                    
                    setTimeout(() => {
                        responseModal.classList.add('hidden');
                        form.reset();
                        collegeDegreeContainer.classList.add('hidden');
                        otherDegreeContainer.classList.add('hidden');
                        factorContainer.classList.add('hidden'); // Reset Pre-screening UI
                    }, 3000);
                } else {
                    throw new Error(result.message || 'An unknown error occurred.');
                }
            } catch (error) {
                modalTitle.textContent = 'Submission Failed';
                modalTitle.className = 'text-2xl font-bold text-red-600 mb-4';
                modalMessage.textContent = error.message;
                responseModal.classList.remove('hidden');
                setTimeout(() => responseModal.classList.add('hidden'), 5000);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Application';
                }
            }
        });
    }
});