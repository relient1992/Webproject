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

    // Modal Elements (Original)
    const responseModal = document.getElementById('responseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    // --- NEW: Review Modal Selectors ---
    const reviewModal = document.getElementById('reviewModal');
    const reviewDataList = document.getElementById('reviewDataList');
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    const closeReviewBtn = document.getElementById('closeReviewBtn');
    
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
            if (this.value === 'College Graduate') {
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
    
    // --- NEW: Function to Populate Review List ---
    function populateReview() {
        reviewDataList.innerHTML = ''; // Clear existing
        const formData = new FormData(form);
        
        // Define labels for readable display
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
            'application_source': 'Source'
        };

        formData.forEach((value, key) => {
            if (fieldLabels[key] && value) {
                // If it's a month, convert index back to name
                let displayValue = value;
                if(key === 'birthMonth') displayValue = months[value - 1];

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
            event.preventDefault(); // Stop initial submission
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Show the review modal instead of submitting
            populateReview();
            reviewModal.classList.remove('hidden');
        });
    }

    // --- NEW: Actual Submission Logic (Triggered from Confirm button) ---
    if (confirmSubmitBtn) {
        confirmSubmitBtn.addEventListener('click', async function() {
            // Hide review modal
            reviewModal.classList.add('hidden');

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const formData = new FormData(form);

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