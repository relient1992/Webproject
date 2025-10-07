document.addEventListener('DOMContentLoaded', function() {
    // --- Element Selectors ---
    const monthSelect = document.getElementById('birthMonth');
    const daySelect = document.getElementById('birthDay');
    const yearSelect = document.getElementById('birthYear');
    const form = document.getElementById('recruitmentForm');
    const mobileInput = document.getElementById('mobile');
    const submitBtn = document.getElementById('submitBtn');
    
    // Modal Elements
    const responseModal = document.getElementById('responseModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    // --- Date Population Logic (Unchanged) ---
    if (monthSelect && daySelect && yearSelect) {
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
    }
    
    // --- Real-time Validation for Mobile Number (with safety check) ---
    if (mobileInput) {
        mobileInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // --- Form Submission with Fetch API (with safety checks) ---
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // 1. PREVENT MULTIPLE CLICKS: Disable button immediately.
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const formData = new FormData(form);
            
            try {
                const response = await fetch('../recruitment_applicants.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    // 2. SHOW SUCCESS POP-UP
                    if(responseModal) {
                        modalTitle.textContent = 'Thank You!';
                        modalTitle.className = 'text-2xl font-bold text-green-600 mb-4';
                        modalMessage.textContent = result.message;
                        responseModal.classList.remove('hidden');
                        
                        setTimeout(() => {
                            responseModal.classList.add('hidden');
                            // 3. CLEAR ALL FIELDS after pop-up disappears.
                            form.reset(); 
                        }, 3000);
                    }
                } else {
                    throw new Error(result.message || 'An unknown error occurred.');
                }

            } catch (error) {
                if(responseModal) {
                    modalTitle.textContent = 'Submission Failed';
                    modalTitle.className = 'text-2xl font-bold text-red-600 mb-4';
                    modalMessage.textContent = error.message;
                    responseModal.classList.remove('hidden');

                    setTimeout(() => {
                        responseModal.classList.add('hidden');
                    }, 5000);
                }
            } finally {
                // Re-enable the button after the process is complete (success or fail).
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Application';
                }
            }
        });
    }
});