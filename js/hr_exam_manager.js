document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const openExamBtn = document.getElementById('openExamManagerBtn');
    const examModal = document.getElementById('examManagerModal');
    const categorySelect = document.getElementById('exam_category_select');
    const questionForm = document.getElementById('addQuestionForm');
    const questionBankList = document.getElementById('questionBankList');
    const toggleCatManagerBtn = document.getElementById('toggleCategoryManagerBtn');
    const catManagerPanel = document.getElementById('categoryManagerPanel');
    const deleteCategorySelect = document.getElementById('delete_category_select');
    const saveCatBtn = document.getElementById('saveCategoryBtn');
    const deleteCatBtn = document.getElementById('deleteCategoryBtn');
    
    const API_URL = '../hr_dashboard_api.php';

    const qImageInput = document.getElementById('q_image');
    const imgPreviewContainer = document.getElementById('image_preview_container');
    const imgPreview = document.getElementById('image_preview');
    const removeImgBtn = document.getElementById('remove_image_btn');
    const removeImgFlag = document.getElementById('remove_image_flag');

    if (qImageInput) {
        qImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imgPreview.src = e.target.result;
                    imgPreviewContainer.classList.remove('hidden');
                    removeImgFlag.value = "0"; // Reset remove flag
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImgBtn) {
        removeImgBtn.addEventListener('click', function() {
            qImageInput.value = ''; // Clear file input
            imgPreview.src = '';
            imgPreviewContainer.classList.add('hidden');
            removeImgFlag.value = "1"; // Tell PHP to wipe the image from the DB
        });
    }

    // --- 1. Open Modal & Initialize ---
    if (openExamBtn) {
        openExamBtn.addEventListener('click', () => {
            examModal.classList.remove('hidden');
            loadCategories();
        });
    }

    // --- 2. Load Exam Categories ---
    async function loadCategories() {
        try {
            const response = await fetch(`${API_URL}?action=getExamCategories`);
            const categories = await response.json();
            
            categorySelect.innerHTML = '<option value="">- Select a Role/Category -</option>';
            deleteCategorySelect.innerHTML = '<option value="">- Select Role to Delete -</option>';
            
            categories.forEach(cat => {
                const opt1 = document.createElement('option');
                opt1.value = cat.id;
                opt1.textContent = cat.category_name;
                categorySelect.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = cat.id;
                opt2.textContent = cat.category_name;
                deleteCategorySelect.appendChild(opt2);
            });
        } catch (error) {
            Swal.fire('Error', 'Failed to load exam categories.', 'error');
        }
    }

    // --- 3. Listen for Category Change to Load Question Bank ---
    categorySelect.addEventListener('change', function() {
        const categoryId = this.value;
        if (categoryId) {
            loadQuestionBank(categoryId);
        } else {
            questionBankList.innerHTML = '<p class="text-xs text-gray-400 italic">Select a category on the left to view its questions.</p>';
        }
    });

    // --- 4. Load Question Bank ---
    async function loadQuestionBank(categoryId) {
        questionBankList.innerHTML = '<div class="text-center text-gray-400 py-4"><i class="fas fa-spinner fa-spin"></i> Loading questions...</div>';
        
        try {
            // Reusing the getApplicantExam endpoint for now, or you can create a specific getAdminExamQuestions endpoint in PHP
            const response = await fetch(`${API_URL}?action=getApplicantExam&category_id=${categoryId}`);
            const questions = await response.json();
            
            questionBankList.innerHTML = ''; // Clear loading
            
            if (questions.length === 0) {
                questionBankList.innerHTML = '<div class="text-center p-4 bg-gray-50 rounded-lg text-sm text-gray-500">No questions found for this category. Add one on the left!</div>';
                return;
            }

            window.activeExamQuestions = questions;

            questions.forEach((q, index) => {
                const qCard = document.createElement('div');
                qCard.className = 'p-3 bg-gray-50 border rounded-lg hover:shadow-sm transition relative group';
                qCard.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Q${index + 1}</span>
                        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onclick="editExamQuestion(${index})" class="text-[10px] bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded font-bold"><i class="fas fa-edit"></i> Edit</button>
                            <button type="button" onclick="deleteExamQuestion(${q.id})" class="text-[10px] bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded font-bold"><i class="fas fa-trash-alt"></i> Delete</button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-800 font-medium mb-2 pr-12">${q.question_text}</p>
                    <div class="text-xs text-gray-600 space-y-1 pl-2 border-l-2 border-gray-200">
                        <div class="${q.correct_option === 'A' ? 'font-bold text-green-600' : ''}">A) ${q.option_a} ${q.correct_option === 'A' ? '<i class="fas fa-check-circle"></i>' : ''}</div>
                        <div class="${q.correct_option === 'B' ? 'font-bold text-green-600' : ''}">B) ${q.option_b} ${q.correct_option === 'B' ? '<i class="fas fa-check-circle"></i>' : ''}</div>
                        <div class="${q.correct_option === 'C' ? 'font-bold text-green-600' : ''}">C) ${q.option_c} ${q.correct_option === 'C' ? '<i class="fas fa-check-circle"></i>' : ''}</div>
                        <div class="${q.correct_option === 'D' ? 'font-bold text-green-600' : ''}">D) ${q.option_d} ${q.correct_option === 'D' ? '<i class="fas fa-check-circle"></i>' : ''}</div>
                    </div>
                `;
                questionBankList.appendChild(qCard);
            });
            
        } catch (error) {
            console.error("Error loading questions:", error);
            questionBankList.innerHTML = '<div class="text-center text-red-500 text-sm py-4">Failed to load questions.</div>';
        }
    }

    // --- 5. Save New Question ---
    if (questionForm) {
        questionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const categoryId = categorySelect.value;
            if (!categoryId) {
                Swal.fire('Warning', 'Please select a Target Role (Category) first.', 'warning');
                return;
            }

            // Build payload
            const formData = new FormData();
            formData.append('question_id', document.getElementById('edit_q_id').value);
            formData.append('category_id', categoryId);
            formData.append('question_text', document.getElementById('q_text').value);
            formData.append('option_a', document.getElementById('opt_a').value);
            formData.append('option_b', document.getElementById('opt_b').value);
            formData.append('option_c', document.getElementById('opt_c').value);
            formData.append('option_d', document.getElementById('opt_d').value);
            formData.append('correct_option', document.getElementById('correct_opt').value);
            formData.append('remove_image', document.getElementById('remove_image_flag').value);
            
            // Attach the file if one was selected
            const fileInput = document.getElementById('q_image');
            if (fileInput.files.length > 0) {
                formData.append('q_image', fileInput.files[0]);
            }

            const submitBtn = questionForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
            submitBtn.disabled = true;

            try {
                // DO NOT set 'Content-Type': 'application/json' when sending FormData
                const response = await fetch(`${API_URL}?action=saveExamQuestion`, {
                    method: 'POST',
                    body: formData 
                });
                
                const result = await response.json();

                if (result.status === 'success') {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Question Saved!', showConfirmButton: false, timer: 1500 });
                    
                    // Reset form fields
                    document.getElementById('edit_q_id').value = ''; 
                    document.getElementById('q_text').value = '';
                    document.getElementById('q_image').value = ''; // Clear file input
                    document.getElementById('opt_a').value = '';
                    document.getElementById('opt_b').value = '';
                    document.getElementById('opt_c').value = '';
                    document.getElementById('opt_d').value = '';
                    document.getElementById('correct_opt').value = 'A';
                    
                    // Reset button text
                    submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Question';
                    submitBtn.classList.replace('bg-orange-500', 'bg-indigo-600');
                    submitBtn.classList.replace('hover:bg-orange-600', 'hover:bg-indigo-700');
                    
                    loadQuestionBank(categoryId);
                } else {
                    throw new Error(result.message || "Server error.");
                }

            } catch (error) {
                console.error("Error saving question:", error);
                Swal.fire('Error', 'Failed to save the question.', 'error');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    if (toggleCatManagerBtn) {
        toggleCatManagerBtn.addEventListener('click', () => {
            catManagerPanel.classList.toggle('hidden');
        });
    }

    // Add New Category
    if (saveCatBtn) {
        saveCatBtn.addEventListener('click', async () => {
            const name = document.getElementById('new_cat_name').value;
            const score = document.getElementById('new_cat_score').value || 70;
            const time = document.getElementById('new_cat_time').value || 10;

            if (!name) return Swal.fire({toast: true, position: 'top-end', icon: 'warning', title: 'Role name required', showConfirmButton: false, timer: 1500});

            saveCatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            saveCatBtn.disabled = true;

            try {
                const res = await fetch(`${API_URL}?action=addExamCategory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_name: name, passing_score: score, time_limit_minutes: time })
                });
                const result = await res.json();
                
                if (result.status === 'success') {
                    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Role Added!', showConfirmButton: false, timer: 1500});
                    document.getElementById('new_cat_name').value = '';
                    document.getElementById('new_cat_score').value = '';
                    document.getElementById('new_cat_time').value = '';
                    loadCategories(); // Refresh dropdowns
                } else {
                    Swal.fire('Error', result.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Connection failed.', 'error');
            } finally {
                saveCatBtn.innerHTML = 'Add';
                saveCatBtn.disabled = false;
            }
        });
    }

    // Delete Category
    if (deleteCatBtn) {
        deleteCatBtn.addEventListener('click', async () => {
            const catId = deleteCategorySelect.value;
            if (!catId) return Swal.fire({toast: true, position: 'top-end', icon: 'warning', title: 'Select a role to delete', showConfirmButton: false, timer: 1500});

            Swal.fire({
                title: 'Are you sure?',
                text: "Deleting this role will permanently delete ALL questions associated with it!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, delete it!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`${API_URL}?action=deleteExamCategory`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: catId })
                        });
                        const data = await res.json();
                        
                        if (data.status === 'success') {
                            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Role Deleted', showConfirmButton: false, timer: 1500});
                            loadCategories(); // Refresh dropdowns
                            questionBankList.innerHTML = '<p class="text-xs text-gray-400 italic">Select a category on the left to view its questions.</p>';
                        }
                    } catch (e) {
                        Swal.fire('Error', 'Failed to delete.', 'error');
                    }
                }
            });
        });
    }
});

window.editExamQuestion = function(index) {
    const q = window.activeExamQuestions[index];
    
    // Fill the form with existing data
    document.getElementById('edit_q_id').value = q.id;
    document.getElementById('q_text').value = q.question_text;
    document.getElementById('opt_a').value = q.option_a;
    document.getElementById('opt_b').value = q.option_b;
    document.getElementById('opt_c').value = q.option_c;
    document.getElementById('opt_d').value = q.option_d;
    document.getElementById('correct_opt').value = q.correct_option;

    // Change button appearance to indicate updating
    const submitBtn = document.querySelector('#addQuestionForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i> Update Question';
    submitBtn.classList.replace('bg-indigo-600', 'bg-orange-500');
    submitBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-orange-600');
    
    // Highlight the form to draw attention
    document.getElementById('addQuestionForm').scrollIntoView({ behavior: 'smooth' });

    const previewContainer = document.getElementById('image_preview_container');
    const previewImg = document.getElementById('image_preview');
    document.getElementById('remove_image_flag').value = "0";
    document.getElementById('q_image').value = ""; // Clear any pending uploads

    if (q.image_path) {
        previewImg.src = '../' + q.image_path; // Adjust relative path if needed
        previewContainer.classList.remove('hidden');
    } else {
        previewImg.src = '';
        previewContainer.classList.add('hidden');
    }
};

window.deleteExamQuestion = function(id) {
    Swal.fire({
        title: 'Delete Question?',
        text: "This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('../hr_dashboard_api.php?action=deleteExamQuestion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
                const data = await res.json();
                
                if (data.status === 'success') {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Deleted successfully!', showConfirmButton: false, timer: 1500 });
                    // Refresh bank
                    const categoryId = document.getElementById('exam_category_select').value;
                    document.getElementById('questionBankList').innerHTML = '<div class="text-center text-gray-400 py-4"><i class="fas fa-spinner fa-spin"></i> Reloading...</div>';
                    setTimeout(() => {
                        document.querySelector('#exam_category_select').dispatchEvent(new Event('change'));
                    }, 500); // Trigger the change event to reload
                } else {
                    Swal.fire('Error', data.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Connection failed.', 'error');
            }
        }
    });
};